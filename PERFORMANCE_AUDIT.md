# Performance Audit

Audit date: July 28, 2026

This report records the repository and deployed production behavior before performance changes were made.

## Architecture

The application uses Next.js 16 App Router with React 19 and TypeScript. It is deployed on Vercel. Pages are primarily prerendered shells whose private, account specific data is hydrated in the browser. Supabase provides Google authentication, PostgreSQL, row level security, RPC functions, and browser data access. The two Next.js route handlers provide a deterministic care workflow and a streaming Anthropic conversation response. There is no ORM or separate application server.

Important flows are:

1. Google OAuth returns through `/auth/callback`, then `AccountDataGate` loads the account from Supabase.
2. Setup uses the transactional `complete_onboarding` Supabase RPC, then hydrates the new account.
3. Talk saves the current check in locally, requests a workflow, saves the workflow to Supabase, then starts the Anthropic stream.
4. Tasks and profile edits update local storage immediately and synchronize to Supabase in the background.
5. Circle reads shared posts from Supabase and writes through tables or ownership checking RPC functions.
6. Insights reads hydrated check ins from local storage.

Production request authentication is handled by `proxy.ts` and `lib/supabase/proxy.ts`. Server side Supabase access is in `lib/supabase/server.ts`. Browser reads and writes are concentrated in `lib/cloud-sync.ts`, `lib/forum.ts`, `lib/care.ts`, and `lib/store.ts`.

## Performance Audit

### 1. Response compression

Status: Not found

Severity: Low

Evidence:

* `next.config.ts:38-56` does not disable framework compression. Next.js enables gzip by default when it serves production output.
* Live requests to `https://invisible-patient.vercel.app/privacy` returned `Content-Encoding: br` when Brotli was accepted and `Content-Encoding: gzip` through curl's compressed mode.
* Live JavaScript and CSS requests returned `Content-Encoding: br` and immutable one year caching.
* The live HTML response included `x-nextjs-prerender: 1` and `x-vercel-cache: PRERENDER`.
* `app/api/chat/route.ts:95-100` intentionally streams a short text response. Streaming compression can depend on the platform and chunking threshold, but the maximum generated response is only 220 tokens, so this is not a significant uncompressed payload.
* The production build generated about 1.51 MB of JavaScript and CSS across all chunks before transfer compression. This is the total build output, not the amount loaded by one route.

Impact:

Significant static text responses are already compressed at the Vercel edge. No material bandwidth problem was confirmed.

Recommended fix:

No application change. Keep `compress` enabled and retain Vercel's asset handling. Payload overfetch discovered in account hydration is addressed under dependency bottlenecks rather than by adding another compression layer.

Risks or tradeoffs:

Adding custom compression middleware would duplicate platform behavior and can interfere with streaming.

Measurement:

For each deployment, run `curl -sS -H 'Accept-Encoding: br,gzip' -D - -o /dev/null URL` against representative HTML, JavaScript, CSS, and JSON responses. Confirm `Content-Encoding`, cache headers, and transferred bytes in the browser Network panel.

### 2. Database write batching

Status: Confirmed

Severity: High

Evidence:

* `lib/care.ts:395-415` saves a generated workflow by calling `saveCareEvent`, `saveActionPlan`, `saveCareTask` for every task, and `saveFollowUp`. Each helper starts its own cloud write at `lib/care.ts:254-264`, `280-285`, `296-313`, and `378-383`.
* The same function then calls `syncWorkflowResult` at `lib/care.ts:414`.
* `lib/cloud-sync.ts:297-371` writes the same event, plan, tasks, and follow up again. With the current one task workflow, a new workflow causes eight database writes instead of four.
* `lib/cloud-sync.ts:336-352` awaits one task upsert per loop iteration. The current generator produces one task at `lib/care-workflows.ts:280-291`, but the synchronization API accepts an array and scales linearly with future workflow tasks.
* `lib/cloud-sync.ts:45-55` performs a claims lookup for each separately launched writer, adding repeated authentication work.
* Setup is already correctly batched into the transactional `complete_onboarding` RPC at `app/setup/page.tsx:54-71` and `supabase/migrations/202607270001_initial_account_data.sql:291-360`.

Impact:

Talk produces duplicate cloud traffic, duplicate trigger and index work, additional radio use on mobile, and a larger chance of partially synchronized workflow data. The task loop adds one network round trip per generated task.

Recommended fix:

Write workflow data locally without starting the individual cloud writers, then invoke one workflow synchronization path. Bulk upsert task rows in one request. Preserve the event first ordering required by action plan and follow up foreign keys, then run independent child writes concurrently with bounded concurrency.

Risks or tradeoffs:

The browser side multi table operation is not a database transaction. The safest incremental change preserves the current event first semantics and existing partial failure behavior while removing duplicates. A later single Supabase RPC can make the complete workflow atomic.

Measurement:

Use the Supabase API request log or browser Network panel for one message that creates a workflow. The current one task and one follow up case produces eight database writes. The incremental target is four writes arranged in two latency phases, with all task rows sent in one upsert.

### 3. Dependency bottleneck

Status: Confirmed

Severity: High

Evidence:

* `components/AccountDataGate.tsx:38-78` makes hydration depend on `pathname`. Every protected client navigation creates a new callback, sets the entire application to not ready, and calls `hydrateAccountData` again.
* `lib/cloud-sync.ts:392-428` performs a session read, a claims read, then seven Supabase queries. The seven table reads are parallel, which is good, but the entire set is repeated on navigation.
* `lib/cloud-sync.ts:413-427` uses `select("*")` for every table and has no pagination or limits. Check ins include the complete `messages` JSON even though no screen reads previous conversation messages. `lib/cloud-sync.ts:493-509` stores that unused history in local storage.
* `app/talk/page.tsx:112-156` and `app/talk/voice/page.tsx:385-429` wait for `/api/workflow` to complete before requesting `/api/chat`. The workflow is deterministic local TypeScript in `lib/care-workflows.ts:223-322`, so this round trip delays Anthropic time to first token.
* `app/api/chat/route.ts:30-74` verifies authentication and then waits for Anthropic to establish a stream. Anthropic is the only external dependency in this critical response path and is expected to dominate time to first token after local overhead is removed.
* `lib/forum.ts:145-185` loads posts, then ownership, then likes in three serial Supabase phases.
* `app/forum/page.tsx:88-94` repeats the full Circle feed sequence every 15 seconds while visible. This is 12 Supabase requests per minute per open Circle page before user actions.
* Database indexes exist for primary account access patterns at `supabase/migrations/202607270001_initial_account_data.sql:119-125`, and Circle time and reply joins at `supabase/migrations/202607280002_shared_circle.sql:34-38`. No clear missing index or server side N plus one query was found.
* `lib/supabase/proxy.ts:49-53` and both API routes perform claims checks, so API requests have duplicate authentication layers. This was not selected for removal because the proxy also refreshes auth cookies and the route must independently enforce authorization.

Impact:

Protected navigation needlessly blocks on repeated account downloads. Long conversation history increases every hydration payload over time. Talk delays the dominant Anthropic request behind a smaller avoidable request. Circle creates steady background database traffic and adds serial round trips.

Recommended fix:

Hydrate once for the mounted authenticated application rather than once per route. Select only required account columns and do not download stored chat messages until a chat history feature needs them. Build the deterministic workflow locally before the chat request so Anthropic can start immediately without changing the prompt context. Parallelize independent Circle reads and reduce polling while refreshing on focus. Add development only timing for account hydration, workflow preparation, authentication, Anthropic stream setup, and first token.

Risks or tradeoffs:

Hydrating once means external changes from another device are not automatically pulled on every navigation. Explicit refresh, focus refresh, or Supabase Realtime can be added later. Omitting message bodies from hydration is safe while previous chats are intentionally inaccessible, but must be revisited before adding chat history. The Anthropic model should not be changed without a separate quality and safety evaluation.

Measurement:

Record a navigation trace from Home to Talk to Tasks. Count Supabase requests and confirm route navigation causes zero full account hydration sequences after the first load. Measure workflow preparation, chat authentication, Anthropic stream setup, and time to first token from development performance logs. Inspect the size of the check ins response before and after omitting `messages`.

### 4. Blocking UI updates

Status: Confirmed

Severity: Medium

Evidence:

* Task creation, edits, completion, deletion, profile changes, and follow up completion update local storage and visible state immediately at `app/tasks/page.tsx:213-262`, `app/profile/page.tsx:129-185`, and `app/profile/page.tsx:463-468`. Their cloud writes are background operations, so these flows are not fully blocking.
* Circle likes already update optimistically and reconcile on failure at `app/forum/page.tsx:140-165`.
* Circle post creation and reply creation wait for the write and then a complete three query feed reload before the new content appears at `app/forum/page.tsx:110-138`.
* Circle edits and deletes also wait for their RPC and then reload the complete feed at `app/forum/page.tsx:178-226`.
* Buttons show `Posting`, saving, or deleting states and prevent duplicate submissions, so feedback exists. The confirmed issue is the unnecessary authoritative feed reload before reconciliation, not an entirely unresponsive form.
* `components/AccountDataGate.tsx:44-45` hides the whole private application during every repeated hydration, making navigation appear blocking even though pages themselves are prerendered.

Impact:

Circle actions remain visibly pending for the mutation plus several extra reads. On higher latency mobile connections, users can perceive successful actions as slow. Repeated account gating replaces otherwise instant client navigation with a full screen loader.

Recommended fix:

Return inserted post and reply rows from Supabase and reconcile them directly into local state without refetching the entire feed. After successful edit and delete RPCs, update local state directly. Keep pending states and duplicate prevention. For the existing optimistic like, retain rollback through a fresh authoritative feed if the write fails. Remove repeated navigation hydration as described above.

Risks or tradeoffs:

Direct reconciliation must preserve reply ordering, ownership, like state, edited timestamps, and rollback behavior. Periodic or focus refresh remains the source of truth for changes from other users.

Measurement:

In the browser Network panel, a post, reply, edit, or delete should require one mutation request rather than one mutation plus a full feed reload. Verify pending controls, duplicate prevention, successful state reconciliation, and failure rollback with an intentionally blocked network request.

### 5. Rendering and caching

Status: Not found

Severity: Low

Evidence:

* The production `next build` classified `/`, `/care`, `/forum`, `/insights`, `/privacy`, `/profile`, `/read`, `/setup`, `/talk`, `/talk/voice`, `/tasks`, and `/terms` as static.
* `/read/[slug]` is statically generated for all guide paths.
* Only `/auth`, `/auth/callback`, `/api/chat`, and `/api/workflow` are dynamic. `/auth` reads request search parameters at `app/auth/page.tsx:7-15`; the callback exchanges a one time OAuth code; both API routes require private request data. These are appropriate dynamic routes.
* No `force-dynamic`, route wide `no-store`, or server database access was found in page layouts or static pages. Private data is loaded in the browser and is not placed in a shared server cache.
* The live Privacy page returned `x-nextjs-prerender: 1` and `x-vercel-cache: PRERENDER`.
* `proxy.ts:8-11` runs authentication middleware for HTML routes. This adds authentication work but does not rebuild the prerendered HTML and is required for private route protection.

Classification:

1. Must be dynamic: `/auth`, `/auth/callback`, `/api/chat`, `/api/workflow`.
2. Can be statically generated: all remaining page routes, and they already are.
3. Can use incremental regeneration: none currently need it because Read content is compiled into the application.
4. Can use cached data with targeted invalidation: Circle could later use a server aggregation endpoint or Realtime subscription, but private ownership and like state must not be publicly cached.
5. Accidentally dynamic: none found.

Impact:

The application is not rebuilding page HTML for every visitor. Static and private data boundaries are appropriate.

Recommended fix:

No rendering strategy change. Do not publicly cache account data, Circle ownership, or likes. Keep the current static shells and dynamic authentication and API routes.

Risks or tradeoffs:

Moving private Supabase reads into statically cached server components would risk cross user data exposure. Adding ISR to bundled guide content would add complexity without freshness benefit.

Measurement:

Run `npm run build` and inspect the route classification on every release. Check public page response headers for `x-nextjs-prerender` and Vercel cache status. Verify private account data never appears in static HTML or shared cache responses.

## Prioritized implementation plan

1. Stop full account hydration on every protected route transition. Expected improvement is very high, user impact is very high, implementation risk is low, and effort is low.
2. Remove duplicate workflow writes and batch generated task rows. Expected improvement is high for Talk cloud synchronization, user impact is medium, implementation risk is low to medium, and effort is low.
3. Remove unused fields from hydration, especially historical `messages` JSON. Expected improvement grows with account age, user impact is high for returning users, implementation risk is low while chat history remains unavailable, and effort is low.
4. Prepare the deterministic care workflow locally so the Anthropic stream is no longer delayed by `/api/workflow`. Expected improvement to time to first token is medium to high, user impact is high, implementation risk is medium, and effort is medium.
5. Reconcile Circle mutations locally and parallelize independent feed reads. Expected improvement is medium, user impact is medium, implementation risk is medium, and effort is medium.
6. Replace 15 second Circle polling with a less aggressive visible page interval plus focus refresh. Expected network reduction is high for an idle Circle page, user impact is low, implementation risk is low, and effort is low.
7. Add development only timing around hydration, workflow preparation, authentication, Anthropic stream setup, and first token. Direct performance improvement is none, diagnostic value is high, implementation risk is low, and effort is low.
8. Make no compression or rendering cache changes because those risks were not confirmed.

## Implementation results

The following confirmed issues were fixed:

* `AccountDataGate` now hydrates once for the mounted authenticated application. Route changes reuse the hydrated local account cache instead of hiding the application and downloading all seven tables again. An in flight guard prevents overlapping hydration attempts.
* Account queries now request explicit columns. Check in message bodies remain encrypted in transit and stored in Supabase, but they are no longer downloaded because the product does not currently expose previous chats.
* Workflow local state updates no longer trigger individual cloud writes before the workflow synchronizer runs.
* Generated tasks are sent in one bulk upsert. After the required event write succeeds, the plan, task batch, and optional follow up run concurrently with bounded concurrency.
* Text and voice Talk build the deterministic workflow locally and include the same result in the chat context. This removes the `/api/workflow` round trip from the time to first Anthropic token. The authenticated route remains available for other clients.
* Circle post, reply, edit, delete, and like actions update immediately, prevent duplicate submissions, reconcile with the authoritative mutation response, and perform targeted rollback on failure.
* Circle mutation state is protected from stale polling responses with a mutation version. Polling pauses while mutations are in flight.
* Circle post and ownership reads now start concurrently. Polling changed from 15 seconds to 30 seconds, refreshes on focus, and skips hidden or mutating pages.
* Development only timing uses the consistent `[perf] operation-name Nms` format for account hydration, Circle feed loading, local workflow preparation, chat authentication, Anthropic stream setup, response readiness, first token, and stream completion. It logs no content, account identifiers, or secrets.

## Before and after

These are deterministic code path counts and build measurements. No production latency numbers are inferred.

| Measurement | Before | After |
| --- | ---: | ---: |
| Database writes for one new workflow with one task and one follow up | 8 | 4 |
| Claims checks started by that workflow save path | 5 | 1 |
| Workflow synchronization latency phases after authentication | Event, plan, task, follow up sequentially, plus duplicate writers | Event first, then plan, task batch, and follow up concurrently |
| Account table reads on every protected client navigation | 7 | 0 after initial hydration |
| Browser application API requests before and including chat start | Workflow then chat | Chat only |
| Circle requests for create, reply, edit, or delete | 1 mutation plus 3 feed reads | 1 mutation |
| Circle feed database request phases | 3 sequential phases | 2 phases |
| Circle polling database requests per visible idle minute | 12 | 6 |
| Total generated JavaScript and CSS across all chunks, uncompressed | 1,505,498 bytes | 1,526,018 bytes |

The 20,520 byte, 1.36 percent build wide uncompressed asset increase is the tradeoff for moving deterministic workflow preparation into the browser. It removes a complete authenticated network round trip before every Anthropic request. Per route transferred size should be measured in a deployed browser because the build wide total is not the amount loaded by one page and Vercel applies Brotli.

The exact hydration byte reduction could not be measured without exporting private account responses. It scales with the number and length of stored chat messages because the `messages` JSON column is no longer selected.

## Validation

Completed checks:

* `npx tsc --noEmit`
* `npm run lint`
* `npm run build`
* `git diff --check`
* Production build route classification review
* Live Vercel HTML, JavaScript, and CSS compression header checks
* Local production HTML compression header check
* Static review of row ordering, foreign key dependencies, optimistic reconciliation, duplicate prevention, stale response guards, and targeted rollback

The final production build compiled successfully, completed TypeScript checking, and generated all 24 static outputs. Static and dynamic route classifications remained the same as the baseline.

The repository has no test command, test framework, or existing automated tests. No dependency was added solely to create a new test stack during this focused audit. Authenticated Supabase and Anthropic behavior still needs an end to end smoke test with a test account before release.

## Remaining risks and next steps

1. Measure authenticated production timings. In development, filter the browser and server consoles for `[perf]`. In Vercel, compare chat authentication, stream setup, and first token across at least 20 representative requests. Do not log message content.
2. Run an authenticated Network panel trace for Home to Talk to Tasks. Confirm the initial seven account reads happen once and do not recur during client navigation.
3. Test Circle with network throttling and an intentionally blocked mutation. Confirm pending rows appear immediately, duplicate clicks are ignored, failures restore only the affected row, and unrelated new posts are preserved.
4. Check Supabase API logs for one wandering workflow. Confirm one event upsert followed by one plan upsert, one task batch upsert, and one follow up upsert.
5. Consider a single `save_care_workflow` Supabase RPC later. That would reduce the four requests to one transaction and eliminate partial child writes. It requires a reviewed migration and was intentionally not introduced as a hidden production dependency in this pass.
6. Add pagination or bounded history windows before accounts accumulate large numbers of check ins, events, plans, tasks, or follow ups. The current queries still load every row, although they no longer load chat bodies.
7. Consider Supabase Realtime for Circle after measuring expected concurrent usage. It can replace polling, but requires channel lifecycle, authorization, reconnect, and duplicate event testing.
8. The proxy and API routes both validate claims. This duplicates a small amount of work but retains session refresh and independent route authorization. Optimize only after timing proves it material.
9. A check in is intentionally upserted before and after an AI response. The first write protects the caregiver's entry if the external request fails; the second adds the completed assistant response. Do not combine these unless failure durability is replaced.

## Production actions

No new environment variables, Vercel settings, dependencies, or Supabase migrations are required for these changes.

After deployment:

1. Verify Brotli or gzip remains present on representative production HTML, JavaScript, CSS, and JSON responses.
2. Perform the authenticated navigation, Talk, task, and Circle smoke tests above.
3. Use Vercel and Supabase request logs to establish real latency and request count baselines.
