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
4. Then copy and run
   `supabase/migrations/202607280001_care_task_reminders.sql`.
5. Then copy and run
   `supabase/migrations/202607280002_shared_circle.sql`.

The migration creates account-owned tables for profiles, care recipients,
check-ins and chat messages, care events, action plans, tasks, and follow-ups.
Every table has RLS policies that compare `auth.uid()` with the row owner.
The second migration adds recurring care-task schedules, reminder timing, and
completion timestamps. The third adds shared Circle posts, responses, reactions,
and secure account ownership policies. Each migration is safe to run once in
the listed order.

## 3. Configure Google-only authentication

In **Authentication → URL Configuration**:

- Site URL: `https://invisible-patient.vercel.app`
- Add redirect URL:
  `https://invisible-patient.vercel.app/auth/callback`
- For local development, also add:
  `http://localhost:3000/auth/callback`

When the custom domain is connected, change the Site URL to
`https://invisible-patient.com` and add:

- `https://invisible-patient.com/auth/callback`

In the Google Auth Platform console:

1. Create or select a Google Cloud project.
2. Configure the OAuth consent screen and choose the appropriate audience.
3. Create an OAuth client with application type **Web application**.
4. Add these authorized JavaScript origins:
   - `https://invisible-patient.vercel.app`
   - `http://localhost:3000`
   - `https://invisible-patient.com` after the domain is connected
5. Add the Supabase callback shown on the Google provider page as an authorized
   redirect URI. It has this format:
   `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
6. Copy the Google Client ID and Client Secret.

In **Supabase → Authentication → Sign In / Providers → Google**:

1. Enable Google.
2. Paste the Client ID and Client Secret.
3. Save.

In **Supabase → Authentication → Sign In / Providers → Email**, disable the
email provider so Google is the only account entry method.

The Google Client Secret belongs in Supabase. It is not a Vercel environment
variable and must never be added to browser code.

If a verified email/password account already exists, signing in with the same
Google email should automatically link the Google identity to that existing
Supabase user. Verify that the user ID and saved records remain unchanged before
removing any old identity. See the
[Supabase identity-linking guide](https://supabase.com/docs/guides/auth/auth-identity-linking).

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

1. Select **Continue with Google**.
2. Approve the Google consent screen and return through `/auth/callback`.
3. Confirm a first-time Google user is directed to the setup screens.
4. Confirm the Home and Profile pages show the saved name, ZIP code, and client.
5. Sign out and sign back in from another browser.
6. Confirm the returning Google user goes directly to Home.
7. Confirm Profile, Insights, and Revisit data return.
8. Start a Talk session, sign out, then sign back in and confirm its metrics are
   present in Insights. Chat messages are stored, but no previous-chat UI is
   exposed yet.
9. Add a one-time and a recurring care task, mark each complete, reload, and
   confirm the one-time task stays completed while the recurring task advances
   to its next due date.
10. Create a Circle post from one account, then sign in with another account
    and confirm the post, response, and reaction are shared.

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
