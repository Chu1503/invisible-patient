# The Invisible Patient

The Invisible Patient is an AI-powered mental health companion for dementia and brain injury caregivers. It is built for people who spend so much time caring for someone else that their own emotional health gets pushed aside.

The app makes it easier for caregivers to check in with themselves through supportive AI conversations, track burnout over time, spot emotional patterns early, and connect anonymously with others going through similar experiences.

## Why this project matters

Caregivers are often the invisible part of the care system. The patient gets the attention, while the caregiver quietly absorbs the stress, burnout, exhaustion, and emotional weight.

This project was built to make that invisible burden visible.

Instead of asking users to fill out a cold clinical form, The Invisible Patient weaves caregiver burden assessment into a natural conversation. It lowers the barrier to getting support, creates a private space for reflection, and gives users a way to notice when things are getting worse before they hit a breaking point.

## What the app does

### 1. AI emotional check-ins
Users can talk to the app through text or voice. The AI responds in a supportive conversational style and gradually works in structured caregiver burden questions instead of presenting them like a survey.

### 2. Burnout tracking
The app estimates caregiver burnout using the clinically validated Zarit Burden Interview (ZBI), but does it inside the conversation flow so it feels more natural and less clinical.

### 3. Emotional trend insights
After each session, the app analyzes the conversation and shows trends over time, including emotional state changes, estimated burden level, and a custom resonance score.

### 4. Crisis detection
If a user expresses crisis language or suicidal thoughts, the app immediately surfaces emergency support resources and shifts the AI response style toward de-escalation and support.

### 5. Voice mode
Users can speak instead of typing. Speech recognition captures the user input, and the AI can respond with spoken output for a more accessible and natural experience.

### 6. Anonymous peer support forum
Circle is a shared anonymous caregiver feed backed by Supabase. Signed in users
can post, respond, and react using generated aliases.

### 7. Care tasks
Caregivers can create one-time or recurring care tasks and schedule reminders.

## Key features

- AI-powered caregiver check-ins
- Burnout estimation using ZBI-based conversational assessment
- Crisis signal detection and immediate support resources
- Emotional trend visualization
- Voice and text interaction modes
- Google account authentication
- Account-isolated cloud storage with database Row Level Security
- Shared anonymous caregiver posts, responses, and reactions
- One-time and recurring care tasks with scheduled reminders

## How it works

### Conversational assessment flow
When a user starts a check-in, the frontend sends the chat history and current context to an API route. That route builds a dynamic system prompt and asks Claude to respond in a supportive way while naturally introducing the next unanswered ZBI question.

This means the user experiences a real conversation, but the app is still collecting structured information underneath.

### Streaming responses
The AI response is streamed back in real time so the conversation feels live and responsive.

### Client-side analysis
When the session ends, the frontend analyzes the conversation to estimate:

- ZBI burnout score
- emotional themes
- mental state classification
- resonance score
- crisis indicators

The result is saved locally and used to update the dashboard and visualizations.

### Account-backed privacy architecture
Supabase Auth provides Google OAuth accounts and cookie-based sessions.
Caregiver profiles, care-recipient details, check-ins, chat messages, care
events, action plans, tasks, and follow-ups are stored in Postgres. Row Level
Security restricts every personal row to its owning account.

The browser keeps a temporary local cache for a responsive interface. Supabase
is the durable source of truth after sign-in. The Anthropic API remains behind a
server route and its API key is never sent to the browser.

## Tech stack

### Frontend
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Recharts
- Lucide React
- date-fns
- Web Speech API

### AI
- Anthropic Claude via `@anthropic-ai/sdk`

### Styling and utilities
- clsx
- tailwind-merge
- Self-hosted Geist font

### Storage
- Supabase Postgres for account-owned caregiver and care-workflow data
- `localStorage` as a responsive browser cache
- Local-only forum seed and draft state in the current MVP

## Account setup

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for the database migration,
authentication callback URLs, local environment variables, Vercel
configuration, testing checklist, and security boundaries.

See [YC_LAUNCH_CHECKLIST.md](./YC_LAUNCH_CHECKLIST.md) for the current
submission checklist, product-truthfulness review, security priorities, and
post-YC engineering work.

## Architecture overview

```text
User
  -> Text or voice check-in
  -> Frontend sends conversation + context
  -> /api/chat
  -> Claude API
  -> Streamed response returns to frontend
  -> Client-side analysis runs after session
  -> Results saved to localStorage
  -> Dashboard and trends update
```

## Environment and security

Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`. Environment
files are ignored by Git, and the API key is read only inside the server route.
Do not use a `NEXT_PUBLIC_` prefix for secrets.

Optional environment variables control the Claude model, output length,
timeouts, retries, request limits, and token budget. The default API window is
15 minutes. `LOGIN_RATE_LIMIT_MAX` is fixed at five by default and should be
used by the login route when authentication is added.

The current API limiter is process-local. Before running multiple production
instances, back the same limits with a shared store such as Redis or platform
KV so users cannot receive a fresh bucket on another instance.

## Local validation

Run `npm run check` before committing. It scans for hardcoded credentials, runs
the production dependency audit, lint, and a production build. The chat endpoint also exposes a
`Server-Timing` response header so validation and Claude setup latency can be
separated in browser network tools.

## Installable web app

The website includes a web app manifest, branded icons, a conservative service
worker, and an install guide. Android browsers can show the native install
prompt. On iPhone or iPad, open the site in Safari, tap Share, and choose
**Add to Home Screen**. The deployed website must use HTTPS.

The service worker never caches API responses or conversations. Profile,
check-in, and care context data continue to use device-local storage.

## Android app

The `android/` directory is a Capacitor 8 project. Its UI is bundled into the
APK instead of loading the entire production website in a remote WebView.
Claude requests are sent to the deployed website's protected `/api/chat`
endpoint.

Add the deployed HTTPS origin to `.env.local`:

```env
MOBILE_API_BASE_URL=https://your-production-domain.example
```

Then build a debug APK:

```powershell
npm run mobile:apk
```

The finished file is copied to:

```text
artifacts/invisible-patient-debug.apk
```

To work in Android Studio, run `npm run mobile:sync`, then open the `android/`
folder in Android Studio. Install Android SDK Platform 36 if Android Studio asks
for it. Use the Run button for a connected device or emulator.

For a Play Store or externally distributed release, use Android Studio's
**Build > Generate Signed App Bundle or APK** flow. Keep the signing keystore
and passwords outside this repository.

Native iOS builds require macOS and Xcode. The PWA installation works on iPhone
without Xcode or App Store submission.
