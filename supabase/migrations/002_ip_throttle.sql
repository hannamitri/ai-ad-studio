-- AI Ad Studio — rate limiting in Postgres (no Upstash for now).
-- Adds a per-IP-hash throttle table (10 req/min) plus atomic helper functions
-- used by /api/generate and /api/refine. See spec/02-ARCHITECTURE.md →
-- "Rate limiting and cost". The anon_usage / usage_daily tables already exist
-- (migration 001); this migration only adds the IP throttle + increment RPCs.

-- ---------------------------------------------------------------------------
-- Per-IP-hash throttle: a fixed-window counter (default 60s).
-- ---------------------------------------------------------------------------
create table if not exists public.ip_throttle (
  ip_hash text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (ip_hash, window_start)
);

alter table public.ip_throttle enable row level security; -- service-role only

create index if not exists ip_throttle_window_idx on public.ip_throttle (window_start);

-- Atomically record a hit in the current fixed window and report if allowed.
-- Returns true while count <= p_limit, false once the limit is exceeded.
create or replace function public.ip_throttle_hit(
  p_ip_hash text,
  p_limit int,
  p_window_seconds int default 60
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_count int;
begin
  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  insert into public.ip_throttle (ip_hash, window_start, count)
    values (p_ip_hash, v_window, 1)
  on conflict (ip_hash, window_start)
    do update set count = public.ip_throttle.count + 1
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

-- ---------------------------------------------------------------------------
-- Atomic usage increments (called only on a *successful* generation/refine).
-- ---------------------------------------------------------------------------
create or replace function public.increment_anon_usage(
  p_anon_id text,
  p_ip_hash text,
  p_gen int,
  p_refine int
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.anon_usage (anon_id, ip_hash, generations, refinements)
  values (p_anon_id, p_ip_hash, p_gen, p_refine)
  on conflict (anon_id) do update
    set generations = public.anon_usage.generations + p_gen,
        refinements = public.anon_usage.refinements + p_refine,
        ip_hash = excluded.ip_hash;
$$;

create or replace function public.increment_usage_daily(
  p_user_id uuid,
  p_day date,
  p_gen int,
  p_refine int
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.usage_daily (user_id, day, generations, refinements)
  values (p_user_id, p_day, p_gen, p_refine)
  on conflict (user_id, day) do update
    set generations = public.usage_daily.generations + p_gen,
        refinements = public.usage_daily.refinements + p_refine;
$$;

-- Sum anonymous usage across every row sharing an IP hash (the IP-wide cap).
create or replace function public.anon_usage_by_ip(p_ip_hash text)
returns table (generations bigint, refinements bigint)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(sum(generations), 0) as generations,
    coalesce(sum(refinements), 0) as refinements
  from public.anon_usage
  where ip_hash = p_ip_hash;
$$;
