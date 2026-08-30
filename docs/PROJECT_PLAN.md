# AI Admissions Advisor — Project Plan

**Master tracker.** Status, decisions, and the phase index. Each small phase has
its own doc in `docs/phases/`; this file says where we are and why.

---

## 1. Status

**Last completed:** `2.2.1` — the ungrounded guard ✅
**Current small phase:** `2.2.2` — citation mapping
**State:** implementing through to the chatbot; you test with a fresh key at the end
**Blocked on:** nothing

**Settled:** **D7** = `gemini-3.6-flash` as the answering model, overridable via
`GEMINI_MODEL` (a lower-tier model is used while quota is short). **D6** =
TanStack AI on the client only, per §5.11.

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

**5.11 TanStack AI: client yes, server no.** Evaluated at your suggestion. The
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
| 2.2.2 | Citation mapping | `groundingMetadata` → `Citation[]`, resolved to rows | — | ⚪ |
| 2.2.3 | `askDocuments()` | system instruction, `fileSearch` tool, guard wired in — **decision D7** | — | ⚪ |

### 2.3 Chatbot

| # | Small phase | Deliverable | Doc | State |
| --- | --- | --- | --- | --- |
| 2.3.0 | TanStack AI setup | install, read shipped skills, `intent install` diff — **decision D6**; skipped entirely if you say no | — | ⚪ |
| 2.3.1 | Chat SSE route | `POST /api/chat` streaming AG-UI events + `CUSTOM` citations | — | ⚪ |
| 2.3.2 | Chat UI | `useChat` (or hand-rolled), streaming into shadcn chat primitives | — | ⚪ |
| 2.3.3 | Citation rendering | document references — the design's signature element | — | ⚪ |
| 2.3.4 | Conversation persistence | students get history; guests do not | — | ⚪ |

### 2.4 Access control

| # | Small phase | Deliverable | Doc | State |
| --- | --- | --- | --- | --- |
| 2.4.1 | RLS verification | prove the boundary at the database, not the route | — | ⚪ |
| 2.4.2 | Guards + guest path | route guards, guest chat without an account | — | ⚪ |

### 2.5 UX polish

| # | Small phase | Deliverable | Doc | State |
| --- | --- | --- | --- | --- |
| 2.5.1 | Empty / loading / error states | throughout | — | ⚪ |
| 2.5.2 | Responsive + accessibility | mobile, keyboard focus, reduced motion | — | ⚪ |

---

## 8. Phase 3 — Test

- **Documents:** valid PDF (`uit.pdf`) · **scanned PDF (`iuh.pdf`) — must not report `ready` unless text was genuinely retrieved** · invalid file · oversized · duplicate · deletion · indexing failure · multiple documents
- **RAG:** answerable · multi-part · cross-document (UIT + IUH in one question) · off-topic · **no answer in the documents** · ambiguous · Vietnamese · prompt-injection against the document-only rule
- **Authorization:** guest cannot upload · student cannot upload · student cannot delete teacher documents · unauthorized users cannot reach teacher APIs · users cannot read another's history

**The test that matters most:** if the information isn't in the uploaded
documents, the chatbot must not fabricate an answer.

**Its near-twin, from §5.12:** a correct refusal and a silently empty index look
identical from the outside. Every "not in the documents" result in Phase 3 gets
checked against whether that document actually indexed.

---

## 9. Changelog

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
