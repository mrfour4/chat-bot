# AI Admissions Advisor — Project Plan

**Master tracker.** Status, decisions, and the phase index. Each small phase has
its own doc in `docs/phases/`; this file says where we are and why.

---

## 1. Status

**Last completed:** `5.10` — conventions ✅ · **PHASE 5 COMPLETE**
**Current phase:** `6.7` — search
**State:** Phase 6 planned in §11: ten small phases from your eight UI reports
and the reindexing follow-up. Two are bug fixes, not polish — uploading fails at
RLS, and the chat fetches older messages in a loop.
**Blocked on:** nothing. No Gemini quota is spent: `GEMINI_BASE_URL` points every
call at `npm run mock:gemini` on `127.0.0.1`.

**Settled:** **D7** = `gemini-3.6-flash`, overridable via `GEMINI_MODEL`.
**D6** = **no TanStack AI** — reversed in 2.3.0, because the grounding guarantee
rules out token streaming and streaming was most of what it offered.

**Try it as a real user** — upload, duplicate, bad file, failure, re-upload,
delete, re-upload the deleted file. The four delete checks are in
`docs/phases/2.1.7-delete.md`.

**Open decisions:** **D6** TanStack AI (§5.11) · **D7** default model (§5.13)
**Settled:** **D5** = synchronous indexing with a ~60s cap, on the 10.0–14.6s
measured in 2.1.0.

---

## 2. How we work

**The loop, one small phase at a time:**

```
Small phase plan (docs/phases/N.md)
  → your review → your approval
  → implement → verify → update this file → commit
  → next small phase
```

- **A small phase is one commit.** No large commits spanning a whole feature.
- **Plan first, every time.** I write the phase doc, you approve it, then I code. Never the other way round.
- **One phase doc is written at a time.** Writing `2.1.7`'s plan before `2.1.0` has run would be guessing — the spike may change what comes after it. Each doc is written at its own review gate.
- **Step by step, together.** No subagents. You read every diff.
- **You verify the UI.** No Playwright, no browser tests. I verify with `typecheck`, `lint`, `test`, `build`, and `curl`, and report exactly what they show.
- **Schema changes go through the Supabase CLI.** Never pasted SQL in the Dashboard.
- **Free tier — spend API calls carefully, but do spend them.** Verify integrations against the real API rather than assuming they work; just do it with the single-page files `doc-to-test/uit-page-1.pdf` and `iuh-page-1.pdf`, and reach for the full PDFs only when a phase genuinely needs them. Free tier is also flash-models-only, which constrains **D7**.
- **Library behaviour is verified, not remembered.** Read the installed source; published docs have already been wrong once (§5.2) and silent twice (§5.11, §5.12).

---

## 3. Local environment safety

This machine runs company infrastructure. **Off limits** — never stopped,
removed, pruned, or rebuilt:

`infra-taskford-db-1` (5434) · `infra-taskford-db-test-1` (5437) ·
`audit-log-db` (5433) · `redis` (6379) · `redis-test` (6380)

**Rules:**

1. Never `docker system prune`, `docker volume prune`, `docker stop $(docker ps -q)`, or anything acting on containers by wildcard.
2. Never `supabase stop --all`. Only `supabase stop` from this directory, scoped by `project_id`.
3. This project's containers are namespaced `supabase_*_admissions-advisor`.
4. Ports pinned in `config.toml`: **api 54421 · db 54422 · studio 54423 · smtp 54424 · analytics 54427 · pooler 54429**. Clear of the Supabase defaults (5432x) and the company range.
5. Re-check the ports are free before any `supabase start`, and show the result.

---

## 4. What this is

An admissions Q&A assistant that answers **only** from admissions PDFs uploaded
by teachers, in Vietnamese, with document and page citations, and says "not in
the current documents" rather than guessing.

**Guest** asks questions · **Student** asks + keeps history · **Teacher** manages PDFs

**Stack:** Next.js 16 (App Router) · TypeScript · Supabase · Gemini File Search ·
Tailwind v4 · shadcn/ui on Base UI

---

## 5. Architecture decisions

**5.1 One shared File Search store.** Gemini does chunking, embedding, and
retrieval — no vector DB, no RAG framework. A single store, because admissions
questions routinely span documents. Ownership lives in Postgres.

**5.2 Verified Gemini surface** (`@google/genai` v2.19.0, checked against the
installed type definitions — *not* the published docs):

```ts
ai.fileSearchStores.uploadToFileSearchStore({
  fileSearchStoreName, file, config: { mimeType, displayName, customMetadata },
})                                     // → Operation
ai.operations.get({ operation })       // poll until operation.done

ai.models.generateContent({
  model, contents,
  config: { tools: [{ fileSearch: { fileSearchStoreNames: [store] } }] },
})

response.candidates[0].groundingMetadata
  .groundingChunks[i].retrievedContext  // { title, text, pageNumber, customMetadata }
  .groundingSupports[j]                 // { segment, groundingChunkIndices }
```

> `mediaId` is documented on `retrievedContext` but came back `undefined` on
> every chunk in the 2.1.0 spike. Do not build on it.

> `ai.interactions.create`, shown in some Gemini docs, **does not exist** in
> this SDK version. Do not use it.

**5.3 Citations map back to rows.** **The metadata key must be lowercase.**
`metadataFilter` silently matches nothing when the stored key contains an
uppercase letter — `documentId` fails under both `documentId=` and
`documentid=`, while the identical value under `docid` matches. Hyphens in
values are fine. Undocumented; found in 2.1.5. The key lives in one place,
`DOCUMENT_ID_KEY` in `indexer.ts`.

 Upload stamps the Supabase document id into
`customMetadata`, so a citation resolves to a real row.
`documents.gemini_document_name` covers the reverse direction (deletion).

The shape is an **array**, not an object — corrected after 2.1.0, where the
round-trip was confirmed working end to end:

```ts
config: { customMetadata: [{ key: "documentId", stringValue: id }] }
// comes back as retrievedContext.customMetadata, same shape
// and is queryable via fileSearch.metadataFilter: `documentId=${id}`
```

**5.4 RLS is the authorization boundary.** Route guards are UX; RLS is
enforcement. Every table gets RLS in the migration that creates it.

- `profiles` — own row only, **no `UPDATE` policy**, so nobody self-promotes.
- `documents` — any teacher reads all; deletes only their own.
- `conversations` / `messages` — owner only.
- Guests never touch these tables; the public document list is read server-side with the secret key, narrowed to non-sensitive columns.

**5.5 Locking down `SECURITY DEFINER` functions.** Revoking from `PUBLIC` is not
enough on Supabase — its default privileges grant `EXECUTE` to `anon` and
`authenticated` *explicitly*, and those survive `revoke ... from public`. Name
all three. Verified via `pg_proc.proacl`. The trigger still fires, because
Postgres checks `EXECUTE` on a trigger function at creation time, not per
firing. `is_teacher()` stays callable on purpose: policy expressions evaluate as
the calling role, and it only reports on the caller.

**5.6 Roles granted out-of-band.** Everyone signs up as `student`;
`promote:teacher` uses the secret key. No invite code, no domain rule.

**5.7 Grounding discipline — three layers:**

1. **Tooling** — `fileSearch` only. Google Search never enabled.
2. **System instruction** — Vietnamese; answer only from retrieved context.
3. **Post-check** — no `groundingMetadata` means discard the model's text and return the refusal.

Layer 3 is what makes the guarantee testable, and is the most important
behaviour in the product. **It also constrains our library choices: anything
that sits between us and the raw Gemini response must preserve
`groundingMetadata`.** See §5.11.

**5.8 Generated types stay generated.** `db:types` overwrites
`src/lib/database.types.ts` wholesale, so nothing hand-written may live there.
`src/lib/db.ts` is the stable surface the app imports.

**5.9 Light-only UI, Vietnamese-first.** Bricolage Grotesque (display) / Be
Vietnam Pro (body) / JetBrains Mono (labels, document references), all chosen
for Vietnamese diacritic coverage.

**5.10 Out of scope.** Original PDFs in Supabase Storage, multi-university
tenancy, automated answer-quality eval beyond Phase 3.

**5.15 The grounding guarantee rules out token streaming.** `enforceGrounding`
needs `groundingMetadata` to decide whether the answer may be shown at all, and
that metadata necessarily arrives last: `groundingSupports[].segment` carries
offsets **into the completed answer**, so it is a statement about text that
already exists.

Streaming would therefore mean showing a possibly-ungrounded answer and then
retracting it. A student who has read "học phí 55 triệu đồng một năm" has read
it; replacing it afterwards with "không có thông tin" is worse than never
showing it, because we published the fabrication first.

So the answer is buffered to completion, guarded, then sent whole. The pending
state shows the work instead of the words. See `docs/phases/2.3.0-no-streaming-no-tanstack.md`.

**5.11 TanStack AI: evaluated, then declined** (superseded by §5.15 — the
finding below still stands and still constrains anything we adopt later). Evaluated at your suggestion. The
finding that decides it — read from the package source, not the docs:

```
$ npm pack @tanstack/ai-gemini    # v0.26.4
$ grep -rn "grounding" package/src/adapters/text.ts   → no matches
$ grep -ril "citation" package/                       → no matches
```

`@tanstack/ai-gemini` **does** ship `fileSearchTool({ fileSearchStoreNames })`,
so retrieval would work. But its text adapter reads only
`candidates[0].content.parts` and `finishReason`. It never reads
`groundingMetadata`, and the word "citation" does not appear anywhere in the
package. Routing our Gemini call through it would silently discard the exact
field §5.7 layer 3 depends on — and the failure would look like a working
chatbot with no citations, not like an error. Middleware cannot recover it:
the data is dropped inside the adapter, before any `StreamChunk` exists.

**So: never let a TanStack adapter own the Gemini call.** We keep `@google/genai`
on the server and use TanStack AI as a client-side chat layer only, against our
own SSE route — a documented, first-class pattern
(`skills/ai-core/custom-backend-integration/SKILL.md`, shipped inside the
package). Citations travel as an AG-UI `CUSTOM` event
(`{ type: 'CUSTOM', name: string, value?: any }`), which is the protocol's
intended escape hatch. Full reasoning and the alternative in §7.3.

**5.12 Scanned PDFs work — measured, not assumed.** Settled by the 2.1.0
spike. Gemini File Search OCRs image-only PDFs: `iuh.pdf` (12 pages, **zero
font resources**, one full-page image per page) indexed in 11.8–14.6s and
returned real Vietnamese with diacritics intact and page numbers populated. No
OCR pre-pass is needed.

The spike nearly concluded the opposite. Its first run queried the shared store
without scoping, and every chunk came back from `uit.pdf` — indistinguishable
from the silent-empty-index failure. Scoping with
`metadataFilter: "docid=iuhpdf"` showed the document had been fully indexed all
along.

**The lesson outlives the question:** in a shared store, "no chunks from
document X" says something about *ranking*, not about *indexing*. Only a scoped
query can tell those apart. That is why 2.1.5's post-index check is a scoped
retrieval query and not a metadata lookup — and there is no cheaper option:
`sizeBytes` reports the raw uploaded byte count, not extracted text, and
`state` reads `STATE_ACTIVE` regardless.

**5.14 The free tier is 20 requests per day, per model.** Discovered by hitting
it in 2.1.5:

```
limit: 20, model: gemini-3.6-flash
quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier
```

Twenty `generateContent` calls, per model, per **day**. What it changes:

- **The post-index check costs one call per upload.** Still worth it — it is
  paid once at upload rather than per question, and it is the only thing
  standing between a silently empty index and a lie. But uploading five
  documents now costs a quarter of the day's budget.
- **Verification is rationed.** Integration tests live in `*.itest.ts`, run only
  via `npm run test:api`, never in `npm test`, and use the single-page files.
- **Quota is per model**, so development can move to another flash model when
  one window is exhausted — but `gemini-2.5-flash` now 404s for new users, so
  the choices are narrower than `models.list` suggests.
- **D7 gains urgency.** A student meeting the day's 21st question gets nothing.

**5.13 The newest model is not the most available.** `gemini-3.7-flash` (our
default) returned `503 UNAVAILABLE` on six consecutive attempts over ~75s
during 2.1.0, twice. The model exists — confirmed via `models.list` — it is
capacity-constrained. `gemini-3.6-flash` answered first try every time.

A student asking about an admissions deadline should not meet a dead chatbot
because we picked the newest model. **Decision D7**, landing in 2.2.3: pin
`gemini-3.6-flash` · keep 3.7 with fallback on 503/429 · or use
`gemini-flash-latest`.

2.1.5 added evidence: `gemini-2.5-flash` now 404s with *"no longer available to
new users. Please update your code to use models/gemini-3.6-flash"*. Google is
pointing at 3.6 as the current default, which is also where the indexing probe
already sits.

**Resolved decisions:** app runs against the **hosted** project (local Docker is
the migration proving ground) · single `.env.local` · `zod` (4.5.4, installed)
for validation · **Vitest** added at the start of Phase 2 · TanStack AI adopted
client-side only, pending your approval of §7.3.

**Open decisions — I need your call:**

- **D6 — TanStack AI, in or out.** See §5.11 and 2.3.0.
- **D7 — default model.** See §5.13. Not urgent; lands in 2.2.3.

---

## 6. Phase 1 — Setup ✅

Merged to `main`: `9840e69`, `45968d9`, `dedffae`, `0b59146`.

**Built:** Next.js 16 + TypeScript + Tailwind v4 · shadcn/ui on Base UI with
brand tokens · Supabase browser/server/secret clients + session refresh in
`src/proxy.ts` · server-only Gemini client · auth (sign-up, sign-in, sign-out,
email confirmation) + role helpers · app shell (chat page, `/login`,
role-guarded `/teacher/documents`) · `/api/health` reporting each dependency
separately · schema under CLI control with a local Docker stack and seed.

**Verified, local and hosted:** 4 tables with RLS · `profiles` `SELECT`-only ·
`handle_new_user` ACL reduced to `postgres`/`service_role` · signup trigger
firing · `db reset` reproducible from scratch · typecheck/lint/build clean ·
`/api/health` `ok: true` with `gemini-3.7-flash` · `tu.le@devsamurai.com`
promoted to `teacher` on the hosted project, so `/teacher/documents` is
reachable.

**Two bugs caught by verifying rather than assuming:** a `revoke` that left
`anon` able to execute a `SECURITY DEFINER` function, and fonts silently falling
back to Times because shadcn moved `font-sans` to `<html>` while the `next/font`
variables sat on `<body>`.

---

## 7. Phase 2 — the small phases

Each row is one plan → review → approve → implement → verify → commit cycle.
Docs are written just before their review gate, not all upfront.

**Legend:** ✅ done · 🟡 awaiting your review · ⚪ not written yet

### 2.1 Teacher document management

| # | Small phase | Deliverable | Doc | State |
| --- | --- | --- | --- | --- |
| 2.1.0 | Ingestion spike | **Yes — File Search OCRs scans.** 7 findings, D5 answered, D7 raised. | [2.1.0](phases/2.1.0-ingestion-spike.md) | ✅ |
| 2.1.1 | Vitest harness | `vitest.config.mts`, `npm test`, 2 passing tests | [2.1.1](phases/2.1.1-vitest-harness.md) | ✅ |
| 2.1.2 | Upload validation | `validateUpload()` pure fn, 8 tests, test-first | [2.1.2](phases/2.1.2-upload-validation.md) | ✅ |
| 2.1.3 | Documents repository | typed CRUD with injected client, + `sha256Hex` / `describeError` | [2.1.3](phases/2.1.3-documents-repository.md) | ✅ |
| 2.1.4 | Upload route | `POST`/`GET /api/documents`, teacher-only, dedupe on checksum | [2.1.4](phases/2.1.4-upload-route.md) | ✅ |
| 2.1.5 | Indexing + post-index check | Synchronous, 60s cap, scoped post-index check; both PDF kinds verified indexing | [2.1.5](phases/2.1.5-indexing.md) | ✅ |
| 2.1.6 | Documents list UI | upload form, live status, inline failure reasons | [2.1.6](phases/2.1.6-documents-ui.md) | ✅ |
| 2.1.7 | Delete | Gemini document before row, `force: true`, 404 = success, inline confirm | [2.1.7](phases/2.1.7-delete.md) | ✅ |
| 2.1.8 | Quota-aware errors + re-upload | readable Vietnamese failures, frugal transient retry — *brought forward ahead of 2.1.7* | [2.1.8](phases/2.1.8-retry-and-failures.md) | ✅ |

### 2.2 Gemini RAG

| # | Small phase | Deliverable | Doc | State |
| --- | --- | --- | --- | --- |
| 2.2.1 | The ungrounded guard | `enforceGrounding`, 8 tests, fails closed | [2.2.1](phases/2.2.1-grounding-guard.md) | ✅ |
| 2.2.2 | Citation mapping | `extractCitations`, dedupes by page, 8 tests | [2.2.2](phases/2.2.2-citations.md) | ✅ |
| 2.2.3 | `askDocuments()` | three grounding layers wired together; **D7 settled** | [2.2.3](phases/2.2.3-ask-documents.md) | ✅ |

### 2.3 Chatbot

| # | Small phase | Deliverable | Doc | State |
| --- | --- | --- | --- | --- |
| 2.3.0 | Streaming decision | **D6 = no TanStack AI**; grounding rules out streaming (§5.15) | [2.3.0](phases/2.3.0-no-streaming-no-tanstack.md) | ✅ |
| 2.3.1 | Chat route | complete guarded answer + citations; rate limited | [2.3.1](phases/2.3.1-chat-route.md) | ✅ |
| 2.3.2 | Chat UI | hand-rolled `useState` + `fetch`; refusals visually distinct | [2.3.2](phases/2.3.2-chat-ui.md) | ✅ |
| 2.3.3 | Citation rendering | typographic document references, page only when known | [2.3.2](phases/2.3.2-chat-ui.md) | ✅ |
| 2.3.4 | Conversation persistence | `/history` for signed-in users; guests never stored | [2.3.4](phases/2.3.4-history.md) | ✅ |
| 2.3.5 | TanStack Query | server-state for documents; `useMutation` only for chat send | [2.3.5](phases/2.3.5-tanstack-query.md) | ✅ |

### 2.4 Access control

| # | Small phase | Deliverable | Doc | State |
| --- | --- | --- | --- | --- |
| 2.4.1 | RLS verification | 11 database-level checks, `npm run test:rls` | [2.4.1](phases/2.4.1-rls-verification.md) | ✅ |
| 2.4.2 | Guards + guest path | forbidden redirect now explains itself; surface measured | [2.4.2](phases/2.4.2-guards-and-guests.md) | ✅ |

### 2.5 UX polish

| # | Small phase | Deliverable | Doc | State |
| --- | --- | --- | --- | --- |
| 2.5 | States, motion, accessibility | reduced-motion scrolling, live-region answers, empty-library notice | [2.5](phases/2.5-polish.md) | ✅ |

---

## 8. Phase 3 — the feedback round

Six small phases from your review of the working app, same rules as Phase 2:
one doc, one commit, one review gate each. Ordered so that **point 4
(background indexing) comes last**, at your request — and because it depends on
3.3.

| # | Small phase | Deliverable | Doc | State |
| --- | --- | --- | --- | --- |
| 3.1 | Markdown in chat | model output rendered, not printed as syntax | [3.1](phases/3.1-markdown.md) | ✅ |
| 3.2 | Header | active page, identity, wrapping, sticky | [3.2](phases/3.2-header.md) | ✅ |
| 3.3 | Keep the PDF | private Storage bucket, RLS policies, upload writes it | [3.3](phases/3.3-file-storage.md) | ✅ |
| 3.4 | Preview + download | in-app viewer, signed URL, mobile fallback | [3.4](phases/3.4-preview.md) | ✅ |
| 3.5 | Conversations | `/chat/[id]`, history as a list, resume a conversation | [3.5](phases/3.5-conversations.md) | ✅ |
| 3.6 | Background indexing | upload returns at once, work survives the tab | [3.6](phases/3.6-background-indexing.md) | ✅ |

**Why 3.3 precedes 3.6.** §5.10 threw the PDF bytes away on purpose, and that
is the whole reason indexing has to happen inside the upload request: the bytes
exist nowhere else. Storing the file for preview is therefore not a neighbour of
background indexing, it is its precondition — a worker can only re-read what we
kept.

**Cost.** 3.1–3.5 touch no Gemini API at all. Only 3.6 needs live calls, and
only to prove the background path completes.

### Deploying 3.6

Nothing is required for it to work — the teacher's documents page sweeps stuck
documents itself while anything is in flight. To cover the case where nobody is
looking, set `REINDEX_SECRET` in the environment and add one cron entry:

```json
{ "crons": [{ "path": "/api/documents/reindex", "schedule": "*/10 * * * *" }] }
```

A Vercel cron cannot set a custom header, so on Vercel prefer its own
`CRON_SECRET` convention or leave the sweep to the page. This is the seam where
a real queue (Inngest, Trigger.dev) would go — both need an account and keys,
which is why neither is here yet.

---

## 9. Phase 4 — quality and conventions

Your second review: the app works, the code does not yet hold the shape you
want. Nine small phases, same rules. **No Gemini calls in any of them.**

| # | Small phase | Deliverable | Doc | State |
| --- | --- | --- | --- | --- |
| 4.1 | Prettier, 4 spaces | one formatter, whole repo reformatted | [4.1](phases/4.1-formatting.md) | ✅ |
| 4.2 | shadcn inventory | the missing components, installed once | [4.2](phases/4.2-shadcn-inventory.md) | ✅ |
| 4.3 | Chat UX | fixed composer, no document list, collapsed citations | [4.3](phases/4.3-chat-ux.md) | ✅ |
| 4.4 | Primitives → shadcn | Dialog, Alert, Empty, Spinner; state components split out | [4.4](phases/4.4-components.md) | ✅ |
| 4.5 | Forms | TanStack Form + Zod + `Field` | [4.5](phases/4.5-forms.md) | ✅ |
| 4.6 | Toasts | every mutation reports success or failure | [4.6](phases/4.6-toasts.md) | ✅ |
| 4.7 | Architecture | types/constants/lib split, component folders + `index.ts` | [4.7](phases/4.7-architecture.md) | ✅ |
| 4.8 | i18n | next-intl, Vietnamese and English | [4.8](phases/4.8-i18n.md) | ✅ |
| 4.9 | Conventions | comments stripped, `CONVENTION.md` written | [4.9](phases/4.9-conventions.md) | ✅ |

**Why this order.** 4.1 first, so every later diff is already in the target
format — otherwise the reformat would swallow real changes in its noise. 4.3
early, because those three are things to feel in the browser and should not
wait behind a refactor. 4.9 last, so `CONVENTION.md` describes what was built
rather than what was intended.

**Where the reasoning goes.** 4.9 strips explanatory comments from source. The
ones that record a *constraint discovered the hard way* — the Gemini metadata
key must be lowercase, Gemini is deleted before the row, a 403 means a rotated
key — move into `CONVENTION.md` and the phase docs rather than disappearing.
The code gets clean; the knowledge stays findable.

---

## 10. Phase 5 — the third feedback round

Your review after using the app. Ten small phases, same rules: one doc, one
commit each. **No live Gemini calls** — 5.2 builds a mock Gemini server first,
because your quota is exhausted and every phase after it needs indexing to run.

| # | Small phase | Deliverable | Doc | State |
| --- | --- | --- | --- | --- |
| 5.1 | Theme + switchers | light/dark/system, both switchers as menus, disclaimer removed | [5.1](phases/5.1-theme.md) | ✅ |
| 5.2 | Mock Gemini server | independent server, random delay and outcome, no quota | [5.2](phases/5.2-mock-gemini.md) | ✅ |
| 5.3 | Document lifecycle | rename, archive, delete, `updated_by`; six display statuses | [5.3](phases/5.3-document-lifecycle.md) | ✅ |
| 5.4 | Documents table | TanStack Table v9 + shadcn Table, search, status filter, paging | [5.4](phases/5.4-documents-table.md) | ✅ |
| 5.5 | Status without polling | Realtime broadcast pushes the change; polling demoted to fallback | [5.5](phases/5.5-realtime.md) | ✅ |
| 5.6 | Multi-file upload | many files at once, indexed one at a time | [5.6](phases/5.6-multi-upload.md) | ✅ |
| 5.7 | Message paging | cursor, 25/page, MessageScroller, fetch on approaching the top | [5.7](phases/5.7-message-paging.md) | ✅ |
| 5.8 | History | cursor paging, virtualized, search, rename, delete | [5.8](phases/5.8-history.md) | ✅ |
| 5.9 | Seed data | enough rows to make paging, virtualization and filters real | [5.9](phases/5.9-seed.md) | ✅ |
| 5.10 | Conventions | `CONVENTION.md` and this file brought up to date | [5.10](phases/5.10-conventions.md) | ✅ |

### What the libraries already decided

Eight things checked before planning, each of which changed the plan:

**5.10.1 MessageScroller already virtualizes, and already handles paging
upward.** Every `MessageScrollerItem` carries `content-visibility: auto` with
`contain-intrinsic-size`, so the browser skips rendering off-screen rows without
unmounting them — virtualization with none of the usual costs (Ctrl-F still
works, no measurement cache, no absolute positioning). `MessageScrollerViewport`
takes **`preserveScrollOnPrepend`**, and `useMessageScrollerScrollable()` reports
`{ start, end }`. That is exactly "virtualize, keep my place when older messages
arrive, tell me when I'm near the top". **So chat does not need TanStack
Virtual.** Read from `@shadcn/react@0.3.0`'s type definitions and the registry
source, not the docs — the docs page for `message-scroller` does not exist.

**5.10.2 TanStack Table ships official skills; TanStack Virtual does not.**
`npm pack` then `tar tzf`: `@tanstack/react-table@9.2.4` contains six
`skills/*/SKILL.md` — `getting-started`, `table-state`, `create-table-hook`,
`with-tanstack-query`, `with-tanstack-virtual`, `migrate-v8-to-v9`.
`@tanstack/react-virtual@3.14.10` contains none. So 5.4 loads a real skill; 5.8
reads the installed source instead, the same way we handled Query and Form.

**Table v9, not v8.** `latest` is 9.2.4 and the skills describe v9's API
(`useTable`, `tableFeatures`, `table.FlexRender`) — v8's `useReactTable`
examples produce the wrong setup. shadcn's own data-table examples are still v8,
so those are reference for *markup* only.

**5.10.3 Gemini cannot rename a document.** `ai.fileSearchStores.documents`
exposes exactly `list`, `get` and `delete` — there is no `update` or `patch`, and
`displayName` is set once at upload. So of your two options, only the mapping one
exists: the citation name must come from **our** row. We already stamp `docid`
into `customMetadata` and read it back in `extractCitations`, so the join is
already there; 5.3 makes the renderer prefer the row's title over Gemini's
`retrievedContext.title`, which is the stale one.

**5.10.4 An independent mock Gemini server is feasible, and it is small.** Five
endpoints, because `uploadToFileSearchStore` is a resumable upload: a `start`
POST answering with an `x-goog-upload-url` header, a bytes POST answering
`x-goog-upload-status: final`, `operations.get`, `generateContent`, and document
`delete`. The decisive detail is in `uploadBlobInternal`: when `httpOptions.baseUrl`
is set, the SDK **rewrites the returned upload URL's protocol, host and port** to
that base. So the mock can hand back any URL and the SDK will still come home to
it. `GEMINI_BASE_URL` therefore redirects the whole surface, and the real
`@google/genai` client stays in the path — error classification, retry and the
grounding guard all still get exercised.

**5.10.5 Teachers cannot read each other's profiles.** `profiles_select_own` is
the only `SELECT` policy (§5.4), so an "Uploaded by" column would come back blank
for every document the viewing teacher did not upload — the §5.12 failure mode
again, a working join that looks like missing data. 5.4 widens it deliberately:
teachers may read the profile directory, with an RLS check to prove students
still cannot.

**5.10.6 Archive has to delete from the Gemini store.** File Search has no
"disable" — the only way out of retrieval scope is `documents.delete`. That
matches your definition exactly ("removed from Gemini's retrieval/reference
scope … still kept in our own storage"), and it means **un-archiving costs a
re-index**. Acceptable: 3.3 keeps the PDF, so un-archive is just the indexing job
again. The alternative — leaving it in the store and excluding it with
`metadataFilter` — needs a filter expression that grows with the archive and
fails silently when it gets it wrong.

**5.10.7 The brand palette cannot switch themes as written.** `--color-paper`
and friends live in Tailwind's `@theme` block, which compiles to static utility
classes; 29 files use them. 5.1 routes each through a CSS variable defined in
`:root` and `.dark`, so dark mode costs **zero component edits**.

**5.10.8 Realtime is already in the stack.** No account, no keys, no third
party. 5.5 uses **Broadcast from Database** rather than Postgres Changes — a
trigger sends the row and one RLS policy on `realtime.messages` authorizes the
channel at join time, instead of the table's policy being evaluated against
every event for every subscriber.

### The two places I did not do what you asked

**Six statuses, not four.** Uploading · Indexing · **Ready** · **Failed** ·
Archived · Deleted. The four you listed have no state for "this document is
working" or "this document never indexed", and those are the two a teacher most
needs to tell apart — a library where a failed upload is indistinguishable from a
live one is how §5.12 bites. They are not stored as an enum: `status` stays the
indexing state machine and `archived_at` / `deleted_at` are timestamps, so an
archived document still remembers it was ready and un-archiving is one column.

**"Archived" is the right word** — it is what every product means by it, and
Vietnamese "Lưu trữ" reads correctly. The alternative worth considering was
"Tạm ẩn / Hidden", which describes the *effect* on the chatbot rather than the
state of the file; I kept Archived because the file genuinely is retained, and
Hidden implies it could still be found.

**Delete is a tombstone.** The file leaves Storage and Gemini as you specified,
but the row stays, badged Deleted and hidden behind the status filter — otherwise
"Deleted" could never be a status you see. It also makes the unique checksum
index partial (`where deleted_at is null`), so a deleted file can be uploaded
again.

---

## 11. Phase 6 — the fourth feedback round

Everything here comes from using the app: eight numbered UI reports plus a
follow-up about reindexing. Two of them are not polish — uploading was broken
outright, and the chat scroller fetched in a loop.

| # | Small phase | Deliverable | Doc | State |
| --- | --- | --- | --- | --- |
| 6.1 | App shell height | composer stays on screen; History and Documents widen | [6.1](phases/6.1-app-shell.md) | ✅ |
| 6.2 | Older messages | the prepend loop, and where the viewport lands after | [6.2](phases/6.2-older-messages.md) | ✅ |
| 6.3 | Reindexing | what may call Gemini, and what may not | [6.3](phases/6.3-reindexing.md) | ✅ |
| 6.4 | Upload RLS | `updated_by` stamped by the database; upload works again | [6.4](phases/6.4-upload-rls.md) | ✅ |
| 6.5 | Upload form | why the button is disabled, clearing a choice, reset after success | [6.5](phases/6.5-upload-form.md) | ✅ |
| 6.6 | One refresh per change | the duplicated `GET /api/documents` | [6.6](phases/6.6-one-refresh.md) | ✅ |
| 6.7 | Search | clear button, pending indicator, calm empty states | [6.7](phases/6.7-search.md) | ⏳ |
| 6.8 | Documents table | long file names, new tab, size only, download | [6.8](phases/6.8-documents-table.md) | ⏳ |
| 6.9 | Status filter | the English label on a Vietnamese menu | [6.9](phases/6.9-status-filter.md) | ⏳ |
| 6.10 | Conventions | comment strip, `CONVENTION.md`, this file | [6.10](phases/6.10-conventions.md) | ⏳ |

### The two real bugs, and what caused them

**Uploading has been broken since 5.3, and no test caught it.** `documents_update_teacher`
requires `updated_by = auth.uid()` in its `WITH CHECK`. The upload route's
`setStoragePath` runs on the *user's* client and never set that column, so every
upload failed at 42501 the moment it tried to record where the file was stored.
Verified against the local database rather than reasoned about — insert `ok`,
update without `updated_by` `42501`, update with it `ok`. The RLS suite passed
because it tested the policy, and the policy was right; nothing tested the route
that had to satisfy it. 6.4 stamps the column in a `BEFORE UPDATE` trigger, so
the rule cannot be forgotten by the next route that writes to the table.

**The chat fetched older messages forever.** Not a threshold to tune. In
`handleContentChange` the scroller compares the element that *used to be first*
against the new children and restores scroll only `if (preserveScrollOnPrepend && index > 0)`.
Our "older messages above" trigger was itself the first child and stayed first
after every prepend, so the index was always `0`, the restore never ran, the
viewport stayed pinned at the top, and the trigger fired again. 6.2 moves the
trigger out of the message flow entirely.

### Reindexing — the answer to the follow-up

**What triggered it:** a `useEffect` in `use-documents.ts` keyed on the query
result object. Every refetch produced a new object, so after *every* search,
rename, archive and delete the effect re-ran, and if any row on the page looked
stale it posted `/api/documents/reindex`, which requeued and called Gemini.
Seeded rows sit in `pending`/`indexing` with old timestamps, so they are
permanently stale — the sweep fired on essentially every action.

**Whether it was necessary:** no. Renaming, archiving, deleting and searching do
not change what Gemini has indexed. The sweeper exists for one case only: a
serverless indexing job killed mid-flight, leaving a row stuck in `indexing`
forever. That is a recovery mechanism, and a recovery mechanism must not be
driven by a client rendering a table.

**What may call Gemini now:** uploading a new file · restoring an archived one ·
Retry on a failed row, pressed deliberately · the cron sweep behind
`REINDEX_SECRET`. Nothing else. Removing the effect removes the only path that
called Gemini without anyone asking it to.

**And locally, nothing reaches Google at all.** `GEMINI_BASE_URL` rewrites the
host, so with the mock running every call ends at `127.0.0.1`. 6.3 also lets the
key and store fall back to placeholders when that variable is set, so a commented-out
`GEMINI_API_KEY` no longer throws — the quota is not merely unspent, it is
unreachable.

---

## 12. Phase 7 — Test

- **Documents:** valid PDF (`uit.pdf`) · **scanned PDF (`iuh.pdf`) — must not report `ready` unless text was genuinely retrieved** · invalid file · oversized · duplicate · deletion · indexing failure · multiple documents
- **RAG:** answerable · multi-part · cross-document (UIT + IUH in one question) · off-topic · **no answer in the documents** · ambiguous · Vietnamese · prompt-injection against the document-only rule
- **Authorization:** guest cannot upload · student cannot upload · student cannot delete teacher documents · unauthorized users cannot reach teacher APIs · users cannot read another's history

**The test that matters most:** if the information isn't in the uploaded
documents, the chatbot must not fabricate an answer.

**Its near-twin, from §5.12:** a correct refusal and a silently empty index look
identical from the outside. Every "not in the documents" result in Phase 5 gets
checked against whether that document actually indexed.

---

## 13. Changelog

- **2026-08-30** — Phase 1 complete, merged to `main`. Scaffold, auth, design system, shadcn/ui on Base UI; schema under Supabase CLI control (local stack on 544xx, applied and verified on both local and hosted); types generated; `/api/health` green. Node scripts renamed to `.mts`; teacher promotion verified on hosted.
- **2026-08-30** — TanStack AI evaluated from package source: adopted client-side only, because its Gemini adapter drops `groundingMetadata` (§5.11). Test PDFs parsed: `iuh.pdf` is a pure scan with no font resources, making OCR support an open risk with a silent failure mode (§5.12).
- **2026-08-30** — Phase 2 re-cut into 21 small phases, one commit each, each with its own doc in `docs/phases/`. This file became the master tracker rather than the only doc.
- **2026-08-30** — `2.1.0` ingestion spike done. Scanned PDFs **do** index (OCR works, diacritics intact), so the planned OCR pre-pass is cancelled. Indexing measured at 10.0–14.6s, which answers **D5** in favour of synchronous. Seven corrections to the plan, including `customMetadata` being an array, `documents.delete` needing `force: true`, and `sizeBytes` being useless as an emptiness signal. New decision **D7** after `gemini-3.7-flash` returned 503 for ~75s straight.
- **2026-08-30** — `2.1.1` Vitest harness. One pinned dev dependency (`vitest` 4.1.11); `@vitejs/plugin-react` and `vite-tsconfig-paths` dropped as unearned. Config is `.mts` for the same CJS/ESM reason the scripts are. **D5 settled: synchronous indexing, ~60s cap.**
- **2026-08-30** — `2.1.2` upload validation. Pure `validateUpload()`, 8 tests written before the implementation and observed failing. MIME is treated as a hint and the `%PDF-` signature as the gate, because browsers derive `File.type` from the extension and a renamed executable arrives claiming `application/pdf`.
- **2026-08-30** — `2.1.3` documents repository. Client is injected rather than imported, so RLS still applies to user reads while indexing write-backs can use the secret key — and so the module stays free of `server-only` and testable. Tests cover `sha256Hex` (published vectors) and `describeError`; the PostgREST wrappers are covered by typecheck against generated schema types instead of mocks.
- **2026-08-30** — `2.1.4` upload route. `getTeacher()` added as the non-redirecting sibling of `requireTeacher()`, because a route that redirects answers a JSON fetch with an HTML login page and a 200. Confirmed by real request: 401 with a JSON body. Dedupe is on checksum, not filename. Row stops at `pending` so 2.1.5's indexing can fail on its own terms.
- **2026-08-30** — `2.1.5` indexing. Both a text PDF and a pure scan verified indexing through the real API. Three findings, each from a failure: **`metadataFilter` only matches lowercase metadata keys** (`documentId` silently matches nothing, `docid` works — hyphens were innocent); two orphan paths leaving documents in the store after a failed index, confirmed by finding real orphans; and **the free tier is 20 requests/day/model** (§5.14). Three answer-quality checks remain, blocked on quota, not on code.
- **2026-08-30** — `2.1.6` documents UI. Upload form, status polling that runs only while something is in flight, and failure reasons rendered on the row rather than in a toast. Synchronous indexing means the request blocks 10–15s, so the in-progress copy names the expected duration instead of leaving the page looking frozen. `formatFileSize` added — the list was rendering a 4.1 MB scan as "4066 KB".
- **2026-08-30** — `2.1.6` verified end-to-end through the browser: the upload exercised auth, validation, checksum, row creation, Gemini upload, failure handling and orphan cleanup. It failed only on the daily quota — and the store was left **empty**, confirming the 2.1.5 orphan fix in production.
- **2026-08-30** — `2.1.8` brought forward. The 429 above reached the teacher as raw English JSON, and a transient failure was treated as permanent. `classifyGeminiError` now yields a Vietnamese message naming the real 20/day limit, with the raw text kept for logs; transient failures retry on the API's own suggested delay, frugally (503 ×3, quota ×1). The planned retry endpoint proved unnecessary: since we never keep the PDF bytes, retry *is* re-upload, so a `failed` row is reused instead of rejected as a duplicate — three lines instead of an endpoint.
- **2026-08-30** — `2.1.7` delete, completing 2.1. The Gemini document is removed before the row, deliberately: the reverse order leaves an unreachable orphan on a half-failure, while this order leaves a row the teacher can simply delete again. That self-heal depends on treating a Gemini 404 as success. Inline confirmation rather than `window.confirm`, which browsers let users suppress permanently — silently turning a destructive action into a one-click one.
- **2026-08-30** — `2.2.1` the ungrounded guard. Checks for *evidence that retrieval happened* rather than inspecting the text for signs of invention, and discards the model's words when that evidence is missing. Fails closed on every unexpected shape. The decisive tests assert the hallucination's text is absent from the output, not merely that a flag is false. **D6 and D7 settled** — see §1.
- **2026-08-30** — `2.2.2` citation mapping. Reads `documentId` through the same `DOCUMENT_ID_KEY` constant the upload writes, so the two cannot drift apart — a drift that would fail silently, with citations quietly ceasing to resolve while everything still looked fine. One citation per document-and-page; a missing page is `null` rather than a confident guess.
- **2026-08-30** — `2.2.3` `askDocuments()`. The three grounding layers meet here, with a test asserting `googleSearch` is *absent* from the tools — web grounding would still produce citations, so that mistake would look correct rather than broken. History is passed to the model but never acts as a source: retrieval runs every turn, so a follow-up resolves its pronouns against the conversation while its facts still come only from documents. **D7 settled: `gemini-3.6-flash`.**
- **2026-08-30** — `2.3.0` **D6 reversed: no TanStack AI.** Not because of TanStack, but because the grounding guarantee rules out token streaming (§5.15): `groundingSupports[].segment` carries offsets into the *completed* answer, so the metadata deciding whether an answer may be shown necessarily arrives last. Streaming would mean publishing a possible fabrication and retracting it — worse than never showing it. With streaming gone, TanStack was 3 packages and a canary dependency in exchange for a `useState` array.
- **2026-08-30** — `2.3.1` chat route. Rate limited at 8/minute per caller, because the endpoint is reachable without an account and one script could drain the free tier's whole day in a second. In-memory and documented as such: it stops casual abuse and accidental loops, and marks the seam where Redis goes. History capped at 6 turns so a long conversation cannot quietly grow every request.
- **2026-08-30** — `2.3.2`/`2.3.3` chat UI with citations, built together because an answer without its sources is not testable as this product. A refusal is rendered on a different ground from an answer, so it cannot be mistaken for a quiet confident reply when skimmed. Citations read as footnotes rather than chips, and a page number appears only when we actually have one.
- **2026-08-30** — `2.3.4` conversation history, completing 2.3. Guests are never persisted: storing their questions with no account to attach them to would be collecting data we said we would not. Persisting never fails the request — a lost history entry is a far smaller harm than a lost answer, so `persist()` swallows storage errors to the log and returns null. **The chatbot is complete and ready to test.**
- **2026-08-30** — `2.3.5` TanStack Query adopted for the documents panel, where it replaced a hand-rolled `setInterval`, a manual refresh callback, three `setDocuments` calls and three state flags with `refetchInterval` and `invalidateQueries`. Not adopted for the chat message list, which is append-only client state with nothing to invalidate. **There is no official TanStack Query agent skill** — `intent list` finds the package is not intent-enabled and the docs page 404s — so the official SSR guide was followed instead.
- **2026-08-30** — `2.4.1` authorization verified at the database, not the routes: the publishable key ships in the browser by design, so anyone can call PostgREST directly and the policy is the only thing standing there. 11 checks via `npm run test:rls`. Eleven first-run passes being exactly when to be suspicious, a deliberately leaky policy was added to confirm the suite fails when it should — it did, and was removed.
- **2026-08-30** — `2.4.2` guards and the guest path. Found a real gap: `requireTeacher()` redirects to `/?error=forbidden` and nothing rendered it, so a student following a teacher link landed home with no explanation — indistinguishable from a broken link. Now explained, and pointed at what they can do instead. Guest surface measured end to end: chat and login open, everything else 401 or redirected.
- **2026-08-30** — `2.5` polish, **completing Phase 2**. Three real gaps, found by auditing rather than guessing: `scrollIntoView` was ignoring `prefers-reduced-motion` because CSS cannot fix a preference JavaScript overrides; answers were never announced to screen readers, leaving no way to tell "still thinking" from "finished"; and an empty document library made a correctly-refusing assistant look broken. All three are the same principle as 2.1.5 and 2.4.2 — **correct behaviour and broken behaviour must not look the same**.
- **2026-08-30** — `3.1` Markdown in chat. `react-markdown` + `remark-gfm` chosen over `marked` + DOMPurify because it builds React elements directly and ignores raw HTML unless `rehype-raw` is added: model output is *structurally* unable to inject markup rather than filtered on the way in. 8 tests via `renderToStaticMarkup`, no jsdom and no Testing Library — the rendered HTML is a string. One assertion was wrong on first run, expecting `onerror` to be absent when react-markdown escapes the tag into visible text instead; escaping is the better behaviour, so the test moved to assert `&lt;img`.
- **2026-08-30** — `3.2` the header. Five named faults rather than a restyle: no active page, no identity or role, sign-out styled as navigation, a non-wrapping row that overflows at 360px, and no stickiness on the app's longest page. Active state is selected *from* `aria-current="page"` so the announcement and the visible state cannot drift; the generated CSS was checked in the build output rather than assumed. The teacher page's own "signed in as" line was removed rather than duplicated — right information, wrong place, true on one page in four. No hamburger: three links do not earn a drawer, a toggle, focus trapping and an escape key.
- **2026-08-30** — `3.3` keep the uploaded PDF. **§5.10 reversed:** discarding the bytes was the reason indexing had to sit inside the upload request, so storing them is 3.6's precondition, not its neighbour. Private bucket and four object policies in a migration, mirroring the table policies exactly. Ownership rides in the path (`<uploader_id>/<document_id>.pdf`) rather than storage's `owner` column, so the rule is legible in the policy. RLS suite 11 → 17 checks, and the falsification pass found two flaws **in the tests**: a leak reported as "0 tests run" because a duplicate key aborted the block, and read checks that passed on an empty table — §5.12's failure mode, in our own test suite. Both fixed; leaks now produce FAIL lines naming what leaked.
- **2026-08-30** — `3.4` preview and download. The viewer is the browser's own, in an iframe: `react-pdf` would have been ~1 MB and Turbopack worker config to rebuild what the platform ships. iOS Safari refuses PDFs in iframes and cannot be detected beforehand, so "Mở trong tab mới" is always visible rather than an error path. The route 302s to a 60-second signed URL instead of streaming 20 MB through this process; `?download=1` switches the disposition, so one route serves both. Verified with ten checks against the **hosted** project, including that an expired URL stops working and an anonymous fetch is refused — no Gemini calls. Migration pushed to hosted, since a local-only bucket would have made every preview 404.
- **2026-08-30** — `3.5` conversations. **No migration:** the model asked for already existed, so this was navigation. The history page had been rendering a transcript rather than a list — every message of every conversation, one query each, to display a title and a date; now one query with an embedded count. `/chat/[id]` reads through the user's client so RLS decides, and answers 404 rather than 403 because 403 confirms existence. Asking on `/` now rewrites the URL to `/chat/<id>` via `window.history.replaceState`, so a refresh keeps the thread: it was always saved, but the app looked like it had forgotten. Eight checks against hosted; the one failure was the fixture's, not the app's — a bulk insert with differing keys makes PostgREST send NULL for the missing ones.
- **2026-08-30** — `3.6` background indexing, **completing Phase 3**. **D5 reversed:** synchronous indexing was right in 2.1.0 for two reasons that have both since changed — §5.10 kept no PDF, so the request was the only place the bytes existed, and background work needed a queue. 3.3 keeps the bytes and Next ships `after()`. Durability rests on two things beyond `after()`: an **atomic claim** (`.eq("status", "pending")` on the transition, so two racing workers cannot both index one document and overwrite each other) and a **sweeper** that re-drives anything stale. A failing fixture revealed that `documents_touch_updated_at` makes `updated_at` unforgeable — which is what makes it a trustworthy liveness signal. Retry finally became a button, reversing 2.1.8's "retry *is* re-upload", which was only true while we kept no bytes. Verified with 6 database checks, 6 unit tests and 3 against the real Gemini API; the store was left with 0 documents.
- **2026-08-30** — post-3.6 data check found a real bug. The one surviving document row reads `ready` while pointing at a File Search store the rotated API key can no longer see: it retrieves nothing, and `deleteFromStore` let the resulting 403 throw, so the row could never be deleted through the UI either. 403 is now treated like 404 — this key can never reach that document, so retrying cannot succeed, and a permanently undeletable row is the worse of the two outcomes. **The row is still there and should be deleted and re-uploaded before Phase 4 testing.**
- **2026-08-30** — `4.1` Prettier at four spaces, landed alone so no later diff hides inside reformatting noise. Generated files, applied migrations and Markdown are excluded — Prettier rewraps prose, which would rewrite every doc for nothing. The lockfile's reformat came from npm, not Prettier: npm mirrors `package.json`'s indentation into it, so four-space there made four-space there too. Full suite green afterwards, which is how we know a formatter did only formatting.
- **2026-08-30** — `4.2` component inventory: dialog, field, collapsible, alert, empty, spinner, separator, skeleton, toggle-group, all Base UI. The CLI's offer to overwrite `button.tsx` was declined — the shadcn guidance is that `--overwrite` needs the owner's approval, and updating a button is not a side effect of installing a dialog. Found that `toast.tsx` had been installed at some point and **never mounted or called**, which is why no mutation has ever reported anything.
- **2026-08-30** — `4.3` chat UX. Fixing the composer to the viewport exposed two things that had to be handled rather than hoped for: the input would have sat out of line with the messages, because it centres on the viewport while the page was a left-aligned column inside a wider container (both chat pages are now one `max-w-2xl` measure); and the footer became unreachable under the bar, with no scroll position that could reveal it. The disclaimer moved into the composer instead, which is better placement anyway — it is a statement about the answers, now sitting where the question is asked. Citations collapse by default but keep their **count** visible, because hiding whether there were three sources or none would undo the product's whole claim.
- **2026-08-30** — `4.4` primitives replaced and states split out. Six hand-styled buttons and inputs, three copies of a spinning `span`, four notice paragraphs and three hand-built empty states became `Button`, `Input`, `Spinner`, `Alert`, `Empty`, `Separator`, `Dialog`. Base UI composes with `render`, not `asChild`. The 240-line documents panel became eight components; the ask box became an orchestrator of seven. Splitting the upload form introduced a regression and it was caught here: the form no longer knew an upload had succeeded, so the chosen file stayed in the field looking unsent — clearing on submit would have been worse, throwing the file away before we knew it worked, so the panel remounts the form by key on success only.
- **2026-08-30** — `4.5` forms on TanStack Form. **No official TanStack Form skill exists** either — checked the same way as Query, and the only `skills/` under `@tanstack/` belongs to devtools. Zod needs no adapter: v1 validates against Standard Schema, which Zod 4 implements. Schemas moved to `src/lib/validation/` and are imported by both sides — the composer and `/api/chat` now share one `MAX_QUESTION_LENGTH`, which the route had been declaring separately. The sign-in and sign-up forms split into two components because the type checker made the real objection: one form cannot have two shapes, and sharing it would have meant weakening a schema. 15 new tests, 88 total.
- **2026-08-30** — `4.6` mutations report their outcome. The `Toaster` had never been mounted, which is why nothing in the app had ever confirmed itself. One wrapper (`notifySuccess`/`notifyError`) so a success cannot arrive styled as an error. The rule settled on: **a toast reports an outcome the screen does not already show** — so a question gets no success toast, because the answer appearing is the feedback, while a failed question keeps its inline message as well, because a toast expires and an unanswered question would then look ignored. The upload form's inline error was removed as the same sentence twice.
- **2026-08-30** — `4.7` architecture. Five hand-written `fetch` calls came out of two components into `lib/api/`, over one `expectOk` that reads the route's own Vietnamese message — restating those in the client would only produce a vaguer sentence from further away. `useDocuments` and `useChat` took the state: the documents panel went 150 lines → 35, the ask box 160 → 45, both now just layout. Constants, types and providers moved to directories named for what they are. Feature barrels are for consumers only — a folder's own files still import each other directly, because a barrel its members import from is a cycle waiting to happen.
- **2026-08-30** — `4.8` Vietnamese and English via next-intl, **without locale routing**: a `[locale]` segment would have meant rewriting every route, `Link`, redirect and guard bounce for an audience that is almost entirely Vietnamese. Three tests guard the catalogues, because a missing key renders as the key itself — a half-translated page looks like a working one with a stray identifier in it. The placeholder test caught a real subtlety: English pluralises where Vietnamese does not, and only ICU *argument names* are comparable. Two lines drawn deliberately: a message produced **while someone is waiting** is translated, one a background job *persists* is not (there is no reader to have a language); and **the assistant keeps answering in Vietnamese**, because an English answer would be an unverified translation of a Vietnamese regulation, which is the exact transformation this product exists to avoid.
- **2026-08-30** — `4.9` comments removed and `CONVENTION.md` written, **completing Phase 4**. The stripper parses with the TypeScript compiler rather than matching text, because a regex that removes `//` also removes it from strings, URLs and JSX, silently. It was wrong twice before it was right: `createScanner` returns no trivia in this version, so the first run quietly removed only JSX comment blocks while appearing to work; and a comment alone in an empty `catch` belongs to no node. `CONVENTION.md` carries the conventions and, more importantly, the facts that cost something to learn — lowercase metadata keys, deletion order, the un-backdatable `updated_at`, why streaming is impossible — each of which looks like something a later reader could simplify away.
- **2026-08-30** — `5.1` light/dark/system. The palette had to move before it could switch: the brand colours lived in Tailwind's `@theme`, which compiles to static values, so `bg-paper` was `#fafaf8` in 29 files forever. Routing them through `@theme inline` and CSS variables made dark mode a **zero-component-edit** change — the compiled utility is now `background-color:var(--paper)`, checked in the build output rather than assumed. Lacquer is the one colour that could not simply be reused: `#a32a1c` on the dark ground measures **2.56:1**, so the seal, every citation and the focus ring would have failed; the brightened `#e8705c` measures 6.07:1. The trigger icon does not show the current theme, which is deliberate — showing it needs a mounted flag, and a `useState` in an effect to dodge a hydration mismatch is a cascading render the linter is right to reject. The choice is shown where choices are made, inside the menu. The chat disclaimer is gone: the citations under each answer already say where that answer came from, which is the same claim made about a specific thing instead of in general.
- **2026-08-30** — `5.2` a mock Gemini server, so the rest of Phase 5 costs nothing. A stub in place of `getGemini()` would have been cheaper and would have deleted exactly the code most likely to break: `classifyGeminiError` reads an HTTP status and a JSON error body, and the upload is three requests, not one. So it is a real server and the real SDK stays in the path. Five endpoints, read out of `node/index.mjs` — the one that makes it possible is `uploadBlobInternal` **rewriting the resumable upload URL's host to `httpOptions.baseUrl`**, which is why a single env var can redirect the whole surface. It simulates the five failures this app has actually met, including §5.12's silent one: indexed, `ready`, zero retrievable chunks. All five verified through the real client. It also found a latent bug: the sweeper resets a row to `pending` before re-running it, so had indexing ever outlasted the stale window it would have **hijacked a job that was still working** — safe today only because 60s < 3min. The rule is now written down and asserted (`STALE_AFTER_MS > INDEXING_TIMEOUT_MS`), and both numbers raised, since 60s was chosen in 2.1.0 when indexing blocked the request and 3.6 made it background work.
- **2026-08-30** — `5.3` rename, archive and soft delete. Archived and deleted are **timestamps, not statuses**: `status` is the indexing state machine, and an archived document has to remember it once indexed cleanly or un-archiving becomes a guess. Renaming on Gemini turned out to be impossible — `fileSearchStores.documents` has `list`, `get` and `delete` and nothing else — so the citation name comes from our row, resolved **at render rather than at persist**, because a rename has to reach messages written last week. The soft delete quietly broke the authorization model: the old "deletes only their own" rule lived in a `DELETE` policy, and a soft delete is an `UPDATE`, so the policy stopped covering the action it existed for without failing. Rewritten, and the rewrite exposed a second hole — `WITH CHECK` sees only the new row, so it **cannot** say "the uploader is immutable", and without a trigger a teacher could take ownership of a colleague's document and then delete it, passing every policy on the way. 17 → 25 RLS checks, then falsified: dropping the trigger and weakening the policy made exactly three fail, naming what leaked. Teachers can now read the profile directory, without which both attribution columns would have rendered blank — a working join that looks like missing data.
- **2026-08-31** — `5.4` the documents table, on TanStack Table v9 — **the first TanStack package here that ships agent skills**, six of them, loaded before writing any of it. They earn their place immediately: v9 replaces `useReactTable` with `useTable`, row models with `tableFeatures`, and `flexRender` with `table.FlexRender`, and shadcn's own data-table examples are still v8. Reading them led to registering **no features at all**: `rowPaginationFeature` plus `manualPagination` would have added a state slice and a second owner for paging the query already owns, and the server has already sliced the page. Search escapes `%` and `_` — verified against hosted, where searching `%` returns the one title containing a literal percent instead of everything — and searches `title` alone, because PostgREST's `or` is a comma-separated string that a comma in the search term would rewrite. The status filter translates the six display statuses back into the columns that hold them, since 5.3 made them derived. Archive and delete both confirm in an `AlertDialog`, which unlike `Dialog` will not close on a click outside; restore does not, because it is the undo.
- **2026-08-31** — `5.5` document status is pushed, not polled. Broadcast from Database rather than Postgres Changes: a trigger sends the row and a single policy on `realtime.messages` authorizes the channel when it is joined. The topic check in that policy is load-bearing — `realtime.messages` is shared by every channel in the project, so `is_teacher()` alone would have opened all of them. Verified on hosted: a teacher receives INSERT, UPDATE, UPDATE, DELETE in order and a guest is refused the topic by name. **The phase's real finding is a mistake I made.** Postgres Changes was built first and measured as delivering INSERT and DELETE while silently dropping every UPDATE — three consistent runs, a schema audit, and a migration written to work around it. All of it was wrong: the probe called `signInWithPassword` on the *service-role* client, which replaces that client's token, so every subsequent write ran as the teacher and was refused by `documents_update_teacher`'s `WITH CHECK`. The updates never happened. It survived because the probe discarded the returned `error`; printing it ended the investigation in one run. **A consistent result is not a correct one** — three runs agreed because they repeated one broken setup three times. Polling was demoted rather than deleted: a WebSocket fails in ways a fetch does not, and without the fallback every one of those failures renders as a document stuck on "Uploading" forever.
- **2026-08-31** — `5.6` several files at once, indexed one at a time. The route answers with **one result per file** rather than one status for the batch, because the interesting case is the mixed one: a 400 would throw away three good uploads and a 201 would hide two problems. Sequence is enforced twice for two different failures — an in-process promise so a five-file upload does not make five concurrent Gemini calls, and 3.6's atomic claim so two server instances cannot index the same document. The lock is a politeness that saves quota; the claim is the correctness. A document that loses the claim race is remembered and skipped, or the worker asks for the same oldest row forever. Verified with a new `queue.itest.ts` against the **mock** server: four documents, two concurrent callers, `indexing` never above one — then falsified by removing the lock, which made it 2. The i18n placeholder test needed a real ICU parser to survive this: `{count, plural, =0 {Upload} other {Upload # files}}` contains `{Upload}`, which a regex reads as an argument. The parser now walks branch lists as selector-and-body pairs and has five tests of its own, including that it still catches the mismatch the whole check exists for.
- **2026-08-31** — `5.7` messages paged 25 at a time, newest first, through shadcn's `MessageScroller` — which turned out to answer all three of your asks by itself, so **chat needs no TanStack Virtual**: every item carries `content-visibility: auto`, the viewport takes `preserveScrollOnPrepend`, and `useMessageScrollerScrollable()` reports when the top is reached. The cursor is `(created_at, id)`, not `created_at`: a turn writes its question and answer in one round trip, so an identical millisecond is normal, not an edge case. Proved by a database-backed test that pages through 60 messages where half share a timestamp — and falsified by switching to a timestamp-only cursor, which lost exactly 2 of the 60. Older pages prepend into the array `useChat` already owns, rather than arriving from a second source that would have to agree with it about order and about the message the server has just persisted; the cursor is tracked separately because a live answer carries a client-side id the server has never seen. Fitting the scroller also fixed 4.3's compromise: the composer is no longer `fixed` over the page but the last row of a full-height column, which looks identical, gives the scroller a real height, and ends the nested-scrolling problem before it starts.
- **2026-08-31** — `5.8` history gains search, rename, delete, cursor paging and virtualization. **This is where TanStack Virtual belongs and chat was not** — a plain list of uniform rows with no scroller written for it, versus a component that already virtualizes. Rows are measured rather than assumed, because a title wraps to two lines at narrow widths and an estimate-only list drifts further out of position the further you scroll, which looks like the scrollbar lying. The next page is requested five rows before the end rather than at it, derived from the last rendered virtual item — the virtualizer already knows what is on screen, and a scroll listener would be a second source of truth to keep in step. Cursor here and page numbers on the documents table is deliberate: a teacher navigates a library and wants to know how many pages there are, a student continues their own history and there is no page 4 of it — and a cursor cannot skip or repeat a row when a new conversation appears mid-scroll. Verified against the database with 60 conversations, half sharing a timestamp, plus the literal-percent search. `useVirtualizer` needs `"use no memo"`: it is a mutable instance whose methods read scroll state React cannot see.
- **2026-08-31** — `5.9` seed data: 80 documents across all six statuses, 60 conversations, and 200 messages in the newest one — 8 document pages, 3 conversation pages, 8 message pages. Everything it writes is prefixed `[SEED]` and `--clean` deletes exactly that, because it runs against the project you are actually using and "remove the test data" has to mean something narrower than emptying the tables. Seeding starts by cleaning, so running it twice gives 80 documents rather than 160. Archived and deleted rows are `ready` underneath, which is what they were before someone archived them — seeding them as `failed` would have been easier and would have quietly modelled a state the app cannot produce. The documents have no PDF and no Gemini document, so they cannot reach an answer; they can only be listed, searched, filtered and paged.
- **2026-08-31** — `5.10` comments stripped and `CONVENTION.md` brought up to date, **completing Phase 5**. The stripper from 4.9 needed one change: `"use no memo"` had to join its functional list, or it would have been removed with the sentence explaining it — silently re-enabling the React Compiler on the one component that must not have it. 186 → 262 lines of conventions, the largest additions being eleven new entries under "constraints that are not visible from the code". Two of those cost the most time in this phase and are the ones most likely to cost it again: **`signInWithPassword` replaces the token on the client it is called on**, and **`realtime.send` swallows its errors as a `WARNING`**. Together they produced three consistent runs of a wrong conclusion in 5.5.
- **2026-08-31** — post-5.10 correction, from your reading of the shadcn docs. Six links were rendered through `Button`, and my first fix — adding `nativeButton={false}` to silence Base UI's warning — **caused the problem the warning was about**: `useButton.js` applies `role="button"` on exactly that branch, so an `<a href>` stopped being announced as a link, including the two in the PDF preview where one opens in a new tab. The documented answer is `buttonVariants()` on a plain `<Link>` or `<a>`, verified in the rendered HTML: a bare anchor with the button classes and no `role`. A warning that goes away is not the same as a problem that goes away.
