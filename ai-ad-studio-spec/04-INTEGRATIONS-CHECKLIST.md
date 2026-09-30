# Integrations checklist

Do these in order. Each one ends with an env var landing in `.env.local` and in Vercel → Project → Settings → Environment Variables. Hand this file to Mitri if he's doing the integrations.

## 1. Vercel + GitHub (Phase 0)
- [ ] Create the GitHub repo, push the Next.js scaffold
- [ ] Import into Vercel, framework preset Next.js, deploy
- [ ] Add your domain (e.g. `studio.simplified.org` or `ads.simplified.org`) → `NEXT_PUBLIC_SITE_URL`
- [ ] Vercel → Functions: confirm the plan allows `maxDuration = 60` on API routes (Pro does; Hobby caps lower — generation needs ~45s headroom)

## 2. Supabase (Phase 2)
- [ ] New project, region Sydney
- [ ] Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`, `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (server only)
- [ ] SQL editor: run the schema from `02-ARCHITECTURE.md`, enable RLS with owner-only policies on every table
- [ ] Storage: create private bucket `ads`
- [ ] Auth → Providers: Email on, **"Confirm email" off**, magic link on
- [ ] Auth → URL configuration: Site URL = your domain; Redirect URLs include `https://<domain>/auth/callback` and `http://localhost:3000/auth/callback`
- [ ] Auth → Email templates: rewrite the magic-link email in your voice (subject: "Your link back into AI Ad Studio")
- [ ] Optional: Auth → SMTP → Resend so emails come from `@simplified.org` and land in inbox, not promotions
- [ ] Rate limits: Auth → Rate limits → raise "email sent per hour" above the default if you expect a webinar spike (hundreds of sign-ups in 10 minutes)

## 3. OpenAI (Phase 3)
- [ ] platform.openai.com → create a project "AI Ad Studio" → API key → `OPENAI_API_KEY`
- [ ] Settings → Limits: set a monthly budget cap and an email alert (start at US$300/month)
- [ ] Verify org if the image model requires it (some image models need organisation verification — check the model page)
- [ ] Set `IMAGE_MODEL=gpt-image-2.5-flare`, `TEXT_MODEL=<current small GPT model name from the models page>`
- [ ] Run the cost calculator in the image generation guide for 1024×1024 medium and note the per-image figure in `cost_estimate_usd` logic
- [ ] Test in the playground: paste the sample brief with the system prompt, confirm JSON comes back clean

## 4. Upstash Redis (Phase 3)
- [ ] console.upstash.com → create Redis DB, region ap-southeast (Sydney)
- [ ] REST URL and token → `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- [ ] (Alternative: skip Upstash and do IP limiting in a Supabase table — slightly slower, one less vendor)

## 5. PostHog (Phase 6)
- [ ] app.posthog.com → project → `NEXT_PUBLIC_POSTHOG_KEY` (+ host)
- [ ] Create the funnel insight: `flow_started → brief_copied → email_captured → generation_completed → instagram_preview_viewed → payoff_c → cta_clicked`
- [ ] Alert on `generation_failed` rate

## 6. Google (only if you flip to Gemini)
- [ ] aistudio.google.com → API key → `GOOGLE_API_KEY`, set `IMAGE_PROVIDER=gemini`
- [ ] Model `gemini-3.1-flash-image`; listed at ~US$0.067 per 1K image, multi-turn via `previous_interaction_id`

## 7. Your funnel side
- [ ] Build the entry link generator: `https://<domain>/start?e={{email}}&n={{first_name}}&src=webinar` (and `src=call` for the post-booking sequence). Your CRM/email tool's merge tags fill `e` and `n`. URL-encode the email.
- [ ] Add the link to: webinar end slide + follow-up email, booking confirmation page, pre-call video description, setter/closer scripts ("did you make your ad yet?")
- [ ] `BOOKING_URL` and `PRECALL_VIDEO_URL` for the Screen 9 buttons
- [ ] OG image + title for the link preview when it's shared in DMs ("Make your first AI ad in 3 minutes")

## Cost picture at launch (rough)

| Item | Assumption | Monthly |
|---|---|---|
| Image generation | 1,000 prospects × (1 gen + 1.5 refines) × ~US$0.05 | ~US$125 |
| Text model | 2,500 calls × ~US$0.002 | ~US$5 |
| Supabase | free tier covers this volume; Pro (US$25) if you want daily backups | US$0–25 |
| Vercel Pro | needed for 60s functions | US$20 |
| Upstash, PostHog | free tiers | US$0 |

Confirm the per-image figure with OpenAI's calculator before launch — it's the only number that moves the total.
