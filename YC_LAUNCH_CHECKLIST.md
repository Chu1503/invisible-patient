# The Invisible Patient — YC Launch Readiness

Last reviewed: July 27, 2026

This document separates what is already implemented from what still needs to
happen before the YC submission and what can wait until an external pilot.

## Implemented in the current update

- [x] Replaced email/password registration with Google OAuth only.
- [x] Removed create-account, password, forgot-password, reset-email and
  update-password interfaces.
- [x] Preserved the existing Supabase cookie session and account-level database
  isolation.
- [x] Kept first-time users on the setup flow while returning users go Home.
- [x] Marked Circle as a local community preview instead of implying that its
  sample posts are live caregiver activity.
- [x] Changed task reminder language to say **in-app reminder** and clarified
  that reminders appear while the application is open.
- [x] Corrected README claims about accounts, cloud storage, Circle and
  reminders.
- [x] Added stricter AI and workflow request-size limits.
- [x] Added a clear server response when the Anthropic API key is missing.

## Required before recording or submitting to YC

### Google authentication

- [ ] Create the Google OAuth web client.
- [ ] Add the Supabase callback URL to Google Authorized Redirect URIs.
- [ ] Add the Vercel URL to Google Authorized JavaScript Origins.
- [ ] Enable Google under Supabase Authentication providers.
- [ ] Paste the Google Client ID and Client Secret into Supabase.
- [ ] Disable the Supabase Email provider so Google is the only sign-in method.
- [ ] Sign in with the same Google email as the existing demo account and
  verify Supabase linked it to the same user ID before deleting anything.
- [ ] Test first-time login, returning login, logout and account switching in an
  incognito browser.
- [ ] Follow the exact configuration steps in `SUPABASE_SETUP.md`.

Google credentials belong in Supabase, not Vercel. No new Vercel environment
variables are required for Google OAuth.

### Production URL

- [ ] Connect `invisible-patient.com` to the Vercel project.
- [ ] Make it the production domain.
- [ ] Change the Supabase Site URL to `https://invisible-patient.com`.
- [ ] Add `https://invisible-patient.com/auth/callback` to Supabase redirects.
- [ ] Add `https://invisible-patient.com` to the Google OAuth web client.
- [ ] Keep the current `vercel.app` callback during the transition.

The custom domain is strongly recommended, but the YC demo can still run on the
Vercel URL if Google OAuth is configured for that URL.

### Demo account and recording

- [ ] Use a dedicated Google account containing only synthetic demo data.
- [ ] Complete Maya Patel and Daniel R.'s profile/setup information.
- [ ] Add the five demo care tasks.
- [ ] Run the six-row historical Insights seed.
- [ ] Complete the four scenario conversations.
- [ ] Complete the full 12-question check-in last.
- [ ] Verify Insights, Profile/Revisit and Tasks after signing out and back in.
- [ ] Record a clean backup video before the final take.
- [ ] Do not register a new account during the three-minute recording; begin
  already signed in.

## Product truthfulness

- [x] Circle now identifies itself as a community preview.
- [x] The false hard-coded claim about 34 active caregivers has been removed.
- [x] Posts added in Circle are described as staying in the current browser.
- [x] Task reminders are described as in-app reminders.
- [x] The README no longer claims that the app requires no account.
- [x] The README no longer describes Circle as a live anonymous community.

Before showing Circle in a live pitch, decide whether to:

- [ ] Keep the preview label and describe moderation as the next milestone; or
- [ ] Hide Circle from the main navigation until a real moderated backend is
  ready.

Do not claim:

- That seeded Insights represent real customer history.
- That Circle contains real active caregivers.
- That task reminders work while the browser is closed.
- That the product is end-to-end encrypted.
- That the product is HIPAA compliant.
- That Resonance is a clinically validated medical score.

## Security and stability

### Required before inviting external users

- [ ] Add a durable per-user/IP rate limiter to `/api/chat` and
  `/api/workflow`.
- [ ] Add a monthly Anthropic spending limit and usage alerts.
- [ ] Add privacy-safe error monitoring that never captures conversations,
  names, ZIP codes or care-recipient details.
- [ ] Resolve the current high-severity dependency advisories when patched
  stable Next.js/PostCSS/Sharp releases are available.
- [ ] Never use `npm audit fix --force` without reviewing the proposed Next.js
  version change.
- [ ] Test database Row Level Security with two separate accounts.
- [ ] Add account deletion and data export.
- [ ] Add a written chat-retention and deletion policy.
- [ ] Add Terms, Privacy Policy, AI-processing consent and a clear healthcare
  disclaimer.

### Current strengths

- [x] Anthropic API key remains server-side.
- [x] No Supabase secret or service-role key is used in the application.
- [x] Authenticated identity is checked on both server API routes.
- [x] Database rows are protected with account-owner RLS policies.
- [x] Authentication uses secure Supabase cookie sessions.
- [x] Security headers and HTTPS transport are configured.
- [x] Conversation and workflow requests have explicit size limits.

## Data reliability — important after YC, before a pilot

These are real engineering tasks, but they are not necessary for the YC demo if
the demo account is tested beforehand.

- [ ] Replace silent cloud-write failure handling with a visible sync state.
- [ ] Add a pending mutation queue with retry after network failures.
- [ ] Prevent cloud hydration from overwriting newer unsynced browser changes.
- [ ] Replace `Math.random()` record IDs with `crypto.randomUUID()`.
- [ ] Add integration tests for database writes and cross-account isolation.
- [ ] Add recurring-task timezone and daylight-saving tests.
- [ ] Establish automated off-site database backups.

## Product work after YC

- [ ] Implement real Web Push, email or mobile reminders that work while the app
  is closed.
- [ ] Build the Circle backend, reporting, moderation, blocking and crisis
  escalation processes before allowing real community posts.
- [ ] Add previous-conversation viewing and deletion controls.
- [ ] Add genuinely ZIP-aware caregiver resources or describe them only as
  national resource locators.
- [ ] Validate the 12-question ZBI-based flow with a qualified clinical advisor.
- [ ] Explain or rename the experimental Resonance metric.
- [ ] Test crisis detection against false positives, negation, misspellings and
  threats toward the caregiver or care recipient.
- [ ] Make crisis resources location-aware.
- [ ] Add unit, end-to-end, accessibility and mobile regression tests.

## Infrastructure and compliance before real health data

- [ ] Move off Vercel Hobby before commercial use.
- [ ] Determine with counsel whether HIPAA and state consumer-health-data laws
  apply to the business.
- [ ] Obtain appropriate BAAs and compliance-capable plans from every processor
  before storing protected health information.
- [ ] Complete a threat model, privacy impact assessment, incident-response plan
  and breach-response process.

Until those items are complete, use synthetic, fictional or appropriately
de-identified information only.
