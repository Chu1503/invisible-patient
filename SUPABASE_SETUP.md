# Supabase account and database setup

The app uses Supabase Auth plus Postgres with Row Level Security. It does not use
a service-role key in the application.

## 1. Create the free Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Choose a strong database password and store it in a password manager.
3. In **Project Settings → API**, copy:
   - Project URL
   - Publishable key

Do not copy the secret or service-role key into this project or Vercel.

## 2. Install the database schema

1. Open **SQL Editor** in the Supabase dashboard.
2. Copy the complete contents of
   `supabase/migrations/202607270001_initial_account_data.sql`.
3. Run it once.

The migration creates account-owned tables for profiles, care recipients,
check-ins and chat messages, care events, action plans, tasks, and follow-ups.
Every table has RLS policies that compare `auth.uid()` with the row owner.

## 3. Configure authentication

In **Authentication → URL Configuration**:

- Site URL: `https://invisible-patient.vercel.app`
- Add redirect URL:
  `https://invisible-patient.vercel.app/auth/callback`
- For local development, also add:
  `http://localhost:3000/auth/callback`

In **Authentication → Providers → Email**:

- Keep email/password enabled.
- Keep email confirmation enabled for production.

Before a public launch, configure a branded SMTP provider. Supabase's shared
development email service is not intended for production delivery.

## 4. Add local environment variables

Copy `.env.example` to `.env.local` and add:

```bash
ANTHROPIC_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

The publishable key is designed to be present in browser code. RLS is the
authorization boundary. `ANTHROPIC_API_KEY` remains server-only.

## 5. Add Vercel environment variables

In the Vercel project, add the same three variables for **Production** and
**Preview**, then redeploy. Use the exact production callback URL above rather
than a broad wildcard when possible.

## 6. Test the flow

1. Create a new account.
2. Open the verification email and return through `/auth/callback`.
3. Complete all five setup screens.
4. Confirm the Home and Profile pages show the saved name, ZIP code, and client.
5. Sign out and sign back in from another browser.
6. Confirm Profile, Insights, and Revisit data return.
7. Start a Talk session, sign out, then sign back in and confirm its metrics are
   present in Insights. Chat messages are stored, but no previous-chat UI is
   exposed yet.

## Security boundary

This implementation provides encrypted HTTPS transport, Supabase-managed
encryption at rest, secure cookie sessions, server-side identity verification,
database RLS, no client-side service key, payload limits, and security headers.

It is not end-to-end encrypted in the cryptographic sense because the
application and Anthropic must process conversation text to provide the AI
response. Do not describe it as E2EE.

The free Supabase plan is suitable for development and early pilots, but it can
pause after inactivity and does not include production backup guarantees or
HIPAA eligibility. Before storing identifiable health information or launching
with agencies, move to an appropriate paid/compliance plan, obtain legal and
security review, establish retention/deletion policies, complete a threat model,
and confirm BAAs with every processor where required.
