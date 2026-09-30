-- AI Ad Studio — initial schema.
-- See spec/02-ARCHITECTURE.md → "Data model (Supabase / Postgres)".
--
-- Every table has RLS enabled with owner-only policies. API routes use the
-- service role (which bypasses RLS) for privileged work such as creating auth
-- users, storing anonymous ads and re-parenting them on save.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  source text,                       -- 'webinar' | 'call' | null
  created_at timestamptz default now()
);

create table if not exists public.briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  raw_text text not null,
  is_sample boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,  -- null while anonymous
  anon_id text,                                              -- set while anonymous; used to re-parent on save
  brief_id uuid references public.briefs(id) on delete cascade,
  concept jsonb not null,            -- AdConcept (hook, headline, primaryText, cta, imagePrompt, payoff, brand)
  choices jsonb,                     -- { audience, angle, vibe } from the guided flow (null in the studio)
  format text default 'feed',        -- 'feed' | 'story' | 'landscape'
  tone text,
  created_at timestamptz default now()
);

create table if not exists public.ad_versions (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid references public.ads(id) on delete cascade,
  version int not null,              -- 1 = original, 2+ = refinements
  instruction text,                  -- null for v1
  image_path text not null,          -- Supabase Storage path
  provider text not null,            -- 'openai' | 'gemini'
  provider_ref text,                 -- OpenAI response id (for multi-turn refine)
  cost_estimate_usd numeric(8,4),
  created_at timestamptz default now()
);

create table if not exists public.anon_usage (
  anon_id text primary key,
  ip_hash text,
  generations int default 0,
  refinements int default 0,
  first_seen timestamptz default now()
);

create table if not exists public.usage_daily (
  user_id uuid references auth.users(id) on delete cascade,
  day date not null,
  generations int default 0,
  refinements int default 0,
  primary key (user_id, day)
);

-- Helpful indexes for the access paths the app uses.
create index if not exists ads_user_id_idx on public.ads (user_id);
create index if not exists ads_anon_id_idx on public.ads (anon_id);
create index if not exists ads_brief_id_idx on public.ads (brief_id);
create index if not exists ad_versions_ad_id_idx on public.ad_versions (ad_id);
create index if not exists briefs_user_id_idx on public.briefs (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — users read/write only their own rows.
-- The service role bypasses RLS, so anonymous writes (user_id null) happen
-- through API routes using the service-role client.
-- ---------------------------------------------------------------------------

alter table public.users_profile enable row level security;
alter table public.briefs enable row level security;
alter table public.ads enable row level security;
alter table public.ad_versions enable row level security;
alter table public.anon_usage enable row level security;
alter table public.usage_daily enable row level security;

-- users_profile: the row is the user.
drop policy if exists "users_profile_select_own" on public.users_profile;
create policy "users_profile_select_own" on public.users_profile
  for select using (auth.uid() = id);
drop policy if exists "users_profile_update_own" on public.users_profile;
create policy "users_profile_update_own" on public.users_profile
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- briefs: owned via user_id.
drop policy if exists "briefs_select_own" on public.briefs;
create policy "briefs_select_own" on public.briefs
  for select using (auth.uid() = user_id);
drop policy if exists "briefs_insert_own" on public.briefs;
create policy "briefs_insert_own" on public.briefs
  for insert with check (auth.uid() = user_id);
drop policy if exists "briefs_update_own" on public.briefs;
create policy "briefs_update_own" on public.briefs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "briefs_delete_own" on public.briefs;
create policy "briefs_delete_own" on public.briefs
  for delete using (auth.uid() = user_id);

-- ads: owned via user_id.
drop policy if exists "ads_select_own" on public.ads;
create policy "ads_select_own" on public.ads
  for select using (auth.uid() = user_id);
drop policy if exists "ads_insert_own" on public.ads;
create policy "ads_insert_own" on public.ads
  for insert with check (auth.uid() = user_id);
drop policy if exists "ads_update_own" on public.ads;
create policy "ads_update_own" on public.ads
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "ads_delete_own" on public.ads;
create policy "ads_delete_own" on public.ads
  for delete using (auth.uid() = user_id);

-- ad_versions: owned via the parent ad's user_id.
drop policy if exists "ad_versions_select_own" on public.ad_versions;
create policy "ad_versions_select_own" on public.ad_versions
  for select using (
    exists (
      select 1 from public.ads
      where public.ads.id = public.ad_versions.ad_id
        and public.ads.user_id = auth.uid()
    )
  );
drop policy if exists "ad_versions_insert_own" on public.ad_versions;
create policy "ad_versions_insert_own" on public.ad_versions
  for insert with check (
    exists (
      select 1 from public.ads
      where public.ads.id = public.ad_versions.ad_id
        and public.ads.user_id = auth.uid()
    )
  );

-- usage_daily: owned via user_id (read-only to the user; writes go through the
-- service role in API routes).
drop policy if exists "usage_daily_select_own" on public.usage_daily;
create policy "usage_daily_select_own" on public.usage_daily
  for select using (auth.uid() = user_id);

-- anon_usage has no user-facing policies: it is only ever touched by the
-- service role (rate limiting for anonymous visitors). RLS stays enabled so it
-- is locked down to everyone else by default.

-- ---------------------------------------------------------------------------
-- Storage — private `ads` bucket. Serve via short-lived signed URLs (generated
-- with the service role). Authenticated owners may also read their own objects
-- directly. See spec/02-ARCHITECTURE.md → Storage.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('ads', 'ads', false)
on conflict (id) do nothing;

-- Owner-only read of objects in the private `ads` bucket.
drop policy if exists "ads_bucket_owner_read" on storage.objects;
create policy "ads_bucket_owner_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'ads' and owner = auth.uid());

-- ---------------------------------------------------------------------------
-- Role grants. Supabase normally auto-grants these to anon / authenticated /
-- service_role via default privileges, but we make them explicit so the API
-- routes (service_role, which also bypasses RLS) and the client roles can
-- reach the tables. Row access for anon / authenticated is still governed by
-- the RLS policies above; service_role bypasses RLS by design.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

grant all privileges on all tables in schema public
  to anon, authenticated, service_role;
grant all privileges on all sequences in schema public
  to anon, authenticated, service_role;
grant all privileges on all functions in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
