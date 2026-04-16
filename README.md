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
The app includes a private anonymous community space where caregivers can post, reply, and connect with others at similar caregiving stages.

## Key features

- AI-powered caregiver check-ins
- Burnout estimation using ZBI-based conversational assessment
- Crisis signal detection and immediate support resources
- Emotional trend visualization
- Voice and text interaction modes
- Anonymous caregiver forum
- No account required
- Fully local data storage for privacy-focused usage

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

### Privacy-first architecture
There is no external database in this version. User data is stored locally in the browser using `localStorage`. The only server-side piece is the API route that securely proxies requests to the Anthropic API.

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
- Google Fonts

### Storage
- `localStorage` for check-ins, forum data, and anonymous profile state

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