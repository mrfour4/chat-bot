# AI Admissions Advisor — Project Plan

**Single source of truth.** Where we are, what's next, why things are the way
they are. Updated as we go; nothing else tracks progress.

---

## 1. Status

**Current phase:** Phase 1 — Setup (finishing)
**Current step:** Phase 1 · Steps 0–5 done — local stack running, migration verified, types generated
**Next step:** Phase 1 · Step 6 — `supabase login` + `link`, then `db push` to hosted (**needs you**: both are interactive)
**Blocked on:** you, for `supabase login` and the database password

| Phase | State |
| --- | --- |
| 1 · Setup | 🟡 mostly built, schema not yet migrated |
| 2.1 · Teacher document management | ⚪ not started |
| 2.2 · Gemini RAG | ⚪ not started |
| 2.3 · Chatbot | ⚪ not started |
| 2.4 · Access control | ⚪ not started |
| 2.5 · UX polish | ⚪ not started |
| 3 · Test | ⚪ not started |

**Changelog**

- 2026-08-30 — Scaffold, auth, design system, shadcn/ui on Base UI. Plan consolidated into this file.
- 2026-08-30 — Plan approved; D1–D4 resolved.
- 2026-08-30 — Steps 4–5: local stack up (12 containers, `_admissions-advisor`, ports 544xx); migration + seed applied from scratch; RLS verified on all four tables; `profiles` confirmed SELECT-only; `handle_new_user` revoke corrected to include anon/authenticated and re-verified; types generated; aliases extracted to `src/lib/db.ts`; typecheck/lint/build clean.
- 2026-08-30 — Steps 0–3: CLI 2.116.0 installed; `project_id = admissions-advisor`, ports pinned to 544xx; `.env` removed (verified `.env.local` a strict superset); `db:*` scripts added; migration `20260830061744_init.sql` created with `handle_new_user` EXECUTE revoked; `seed.sql` added.

---

## 2. How we work

- **Plan first.** Each phase gets its steps written here and approved before any code.
- **Step by step, together.** No subagents. One step at a time, so you can read every diff, ask questions, and redirect.
- **You verify the UI.** I do not run Playwright or browser tests. I verify with `typecheck`, `lint`, `build`, and `curl` against API routes, and report exactly what those show.
- **One tracking file.** This one. When a step finishes I tick the box and move §1's pointers.
- **Schema changes go through the Supabase CLI.** Never pasted SQL in the Dashboard.

---

## 3. Local environment safety

Your machine runs company infrastructure. **These containers are off limits** — I
will never stop, remove, prune, or rebuild them:

| Container | Image | Host port |
| --- | --- | --- |
| `infra-taskford-db-1` | postgres:18 | 5434 |
| `infra-taskford-db-test-1` | postgres:18 | 5437 |
| `audit-log-db` | postgres:18 | 5433 |
| `redis` | redis | 6379 |
| `redis-test` | redis | 6380 |

**Rules I follow:**

1. Never run `docker system prune`, `docker volume prune`, `docker stop $(docker ps -q)`, or any command that acts on containers by wildcard.
2. Never run `supabase stop --all`. Only `supabase stop` from this project directory, which is scoped by `project_id`.
3. This project's containers are namespaced `supabase_*_admissions_advisor` via `project_id` in `config.toml`, so they can never be confused with yours.
4. Ports are pinned explicitly in `config.toml` and verified free before starting. Six of them, the CLI defaults +100: **api 54421 · db 54422 · studio 54423 · smtp 54424 · analytics 54427 · pooler 54429** — clear of both the Supabase defaults (5432x) and your Postgres/Redis range (5433–5437, 6379–6380).
5. Before any `supabase start`, I re-check the port block is free and show you the result.

Verified free immediately before `supabase init`: all six.

---

## 4. What this is

An admissions Q&A assistant that answers **only** from admissions PDFs uploaded
by teachers, in Vietnamese, with document and page citations, and says "not in
the current documents" rather than guessing.

- **Guest** — asks questions, no account.
- **Student** — asks questions, keeps history.
- **Teacher** — uploads and manages the PDFs.

**Stack:** Next.js 16 (App Router) · TypeScript · Supabase (Postgres + Auth) ·
Gemini File Search · Tailwind v4 · shadcn/ui on Base UI.

---

## 5. Architecture decisions

**5.1 One shared File Search store.** Gemini File Search does chunking,
embedding, and retrieval — no vector DB, no embedding pipeline, no RAG
framework. All documents go into a single store, because admissions questions
routinely span documents. Ownership lives in Postgres, not in index
partitioning.

**5.2 Verified Gemini API surface** (`@google/genai` v2.19.0 — checked against
the installed type definitions, not the docs):

```ts
// Index
ai.fileSearchStores.uploadToFileSearchStore({
  fileSearchStoreName, file, config: { mimeType, displayName, customMetadata },
})                                        // → Operation
ai.operations.get({ operation })          // poll until operation.done

// Query
ai.models.generateContent({
  model, contents,
  config: { tools: [{ fileSearch: { fileSearchStoreNames: [store] } }] },
})

// Citations
response.candidates[0].groundingMetadata
  .groundingChunks[i].retrievedContext     // { title, text, pageNumber, mediaId }
  .groundingSupports[j]                    // { segment, groundingChunkIndices }
```

> The `ai.interactions.create` API shown in some Gemini docs **does not exist**
> in this SDK version. Do not use it.

**5.3 Citations map back to rows.** On upload we stamp the Supabase document id
into `customMetadata`, so a citation resolves to a real row (title, uploader,
date) instead of a bare filename. `documents.gemini_document_name` stores the
Gemini resource name for the reverse direction (deletion).

**5.4a Locking down `SECURITY DEFINER` functions.** Revoking from `PUBLIC` is
not enough on Supabase: its default privileges grant `EXECUTE` to `anon` and
`authenticated` *explicitly*, so those grants survive a `revoke ... from public`.
The revoke must name all three. Verified by reading `pg_proc.proacl` — before:
`postgres=X, anon=X, authenticated=X, service_role=X`; after:
`postgres=X, service_role=X`. The trigger still fires, because Postgres checks
`EXECUTE` on a trigger function at trigger-creation time, not on each firing.

**5.4 RLS is the authorization boundary.** Route guards are for user experience;
Postgres RLS is enforcement. Every table gets RLS in the migration that creates
it.

- `profiles` — read your own row only. **No `UPDATE` policy at all**, so nobody can promote themselves to teacher.
- `documents` — any teacher reads every document (shared knowledge base); deletes only their own.
- `conversations` / `messages` — owner only.
- Guests never touch these tables. The public document list is read server-side with the secret key, narrowed to non-sensitive columns.

**5.5 Roles granted out-of-band.** Everyone signs up as `student`. A teacher is
promoted by a script using the secret key. No invite code, no email-domain rule
— both add attack surface for a system with a handful of teachers.

**5.6 Grounding discipline — three layers, in order of reliability:**

1. **Tooling** — `fileSearch` is the only tool. Google Search is never enabled.
2. **System instruction** — Vietnamese; answer only from retrieved context; say so when it isn't there.
3. **Post-check** — if the response carries no `groundingMetadata`, discard the model's text and return the "not in the current documents" message.

Layer 3 is what makes the guarantee testable and is the most important
behaviour in the product.

**5.7 Light-only UI, Vietnamese-first.** One committed light theme. Type stack
is Bricolage Grotesque (display) / Be Vietnam Pro (body) / JetBrains Mono
(labels, document references) — all three chosen for full Vietnamese diacritic
coverage.

**5.8 Out of scope for the MVP.** Storing original PDFs in Supabase Storage
(Gemini holds them; re-upload is the recovery path), multi-university tenancy,
and any automated answer-quality eval beyond the Phase 3 question set.

---

## 6. Decisions — resolved 2026-08-30

| # | Question | Decision |
| --- | --- | --- |
| D1 | Which database does `npm run dev` hit? | **Hosted project.** Local Docker Postgres is used only to prove migrations apply cleanly from scratch, then `db push` ships them. |
| D2 | Delete the duplicate `.env`? | **Yes.** Keep `.env.local`, which wins anyway. |
| D3 | Keep `zod`? | **Keep** — for upload/request validation in Phase 2.1. |
| D4 | Test tooling? | **Vitest, added at the start of Phase 2.** The ungrounded-answer guard in 2.2 is written test-first. |

---

## 7. Phase 1 — Setup (finishing)

**Goal:** Schema under Supabase CLI control, applied locally and to the hosted
project, types generated from the live schema, `/api/health` green.

### Already done

- Next.js 16 + TypeScript + Tailwind v4, `typecheck` / `lint` / `build` clean
- shadcn/ui on **Base UI** (`base-nova`), tokens remapped to the brand palette
- Supabase browser / server / secret-key clients; session refresh in `src/proxy.ts`
- Server-only Gemini client; key never reaches the browser
- Auth: sign-up, sign-in, sign-out, email confirmation route; role helpers
- App shell: public chat page, `/login`, `/teacher/documents` (role-guarded)
- `/api/health` — reports env, Supabase, Gemini, and File Search store separately
- Env verified live: Gemini key works, File Search reachable, `gemini-3.7-flash` available, all five env vars set

### Step 0 — Your machine (manual)

- [x] Install the CLI: `brew install supabase/tap/supabase && supabase --version`
- [x] ~~Install `psql`~~ — **not needed.** CLI 2.116.0 ships `supabase db query`, so we skip `brew link --force libpq` entirely.
- [ ] `supabase login` — *deferred to Step 6; only `db push` needs it*
- [ ] Have the database password ready for `supabase link` — *deferred to Step 6*

Docker is already running — no action needed there.

### Step 1 — Init with pinned ports

- [x] `supabase init`
- [x] Set `project_id = "admissions-advisor"` in `config.toml`
- [x] Pin ports to the 54421–54424 block (§3)
- [x] Re-verify those ports are free, and show you the check
- [ ] `supabase link --project-ref <ref>` — *deferred to Step 6 (interactive)*

### Step 2 — Consolidate environment

- [x] Delete `.env`, keep `.env.local` (pending D2)
- [x] Confirm all five keys present, without printing values
- [x] Add scripts: `db:new`, `db:reset`, `db:push`, `db:types`, `db:diff`

### Step 3 — The migration

- [x] `supabase migration new init` → timestamped file
- [x] Move the reviewed SQL from `supabase/migrations/0001_init.sql` into it; delete the old file
- [x] Harden per the Supabase security skill: `revoke execute on function public.handle_new_user() from public` — it's `SECURITY DEFINER` in an exposed schema and only ever needs to run as a trigger
- [x] Keep `public.is_teacher()` callable — it takes no arguments and only reports on the caller, so exposing it leaks nothing (deliberate, documented here)
- [x] Add `supabase/seed.sql` with a local-only test teacher

### Step 4 — Prove it locally

- [x] `supabase start` (after the port check)
- [x] `npm run db:reset` — applies from nothing, then seeds
- [x] Verify with `supabase db query`: four tables, `rowsecurity = t` on all four
- [x] **Verify `profiles` has exactly one policy, `SELECT` only** — any `UPDATE` policy is a privilege-escalation hole; stop if one appears
- [x] Verify the signup trigger produced a profile row

### Step 5 — Types from the real schema

- [x] `npm run db:types` → replaces the hand-written `src/lib/database.types.ts`
- [x] Aliases moved to a **new `src/lib/db.ts`**, not appended to the generated file — `db:types` overwrites `database.types.ts` wholesale, so anything hand-written there would be lost on every regeneration. All six importers now point at `@/lib/db`.
- [x] `npm run typecheck && npm run lint && npm run build`

### Step 6 — Ship and verify

- [ ] `supabase migration list` — applied locally, not remotely
- [ ] `npm run db:push`
- [ ] `supabase migration list` — now applied both
- [ ] Turn **off** email confirmation (Dashboard → Authentication → Sign In / Providers → Email). A project setting, not schema — no migration can carry it.
- [ ] Sign up at `/login`, then `npm run promote:teacher -- tu.le@devsamurai.com` (new `scripts/promote-teacher.ts`, uses the secret key — no DB password, no Dashboard)
- [ ] `curl -s localhost:3000/api/health` → `ok: true`, all four checks green
- [ ] Rewrite the README database section for the CLI flow

**Phase 1 is done when:** migrations applied both sides · `db:reset` rebuilds
from nothing · types are generated · typecheck/lint/build clean · health green ·
no SQL pasted into the Dashboard.

---

## 8. Phase 2 — Implement

Steps get expanded into detail when we reach each one. Outline only for now.

### 2.1 Teacher document management

Upload a PDF → row created `pending` → indexed into File Search → status visible
→ viewable and deletable.

- Upload route: teacher-only, PDF only, size cap, sha256 for duplicate detection
- `uploadToFileSearchStore` with `customMetadata: { documentId }`; poll the operation; write `ready` / `failed` + `gemini_document_name` back
- Status polling in the UI; delete removes both the Gemini document and the row
- Failure paths are first-class: a failed index shows why and offers retry

### 2.2 Gemini RAG

The retrieval and grounding core. **Vitest lands here** (pending D4).

- `askDocuments(question)` → `{ answer, citations, grounded }`
- Citation extraction from `groundingMetadata` → `{ documentId, fileName, page, snippet }`, resolved against the `documents` table
- **The ungrounded guard** — no grounding metadata means we return the refusal, never the model's prose. Tested first, before the happy path.

### 2.3 Chatbot

- Streaming answers, Vietnamese-first, clear loading and error states
- Citations rendered as document references (the design's signature element)
- Guests chat without an account; students get history persisted

### 2.4 Access control

- Guest → chat only · Student → chat + own history · Teacher → documents + chat
- Verify at the RLS level, not just the route level

### 2.5 UX polish

- Empty, loading, and error states throughout
- Mobile pass; keyboard focus; reduced motion

---

## 9. Phase 3 — Test

- **Documents:** valid PDF, invalid file, oversized file, duplicate, deletion, indexing failure, multiple documents
- **RAG:** answerable questions · multi-part questions · cross-document questions · off-topic questions · **questions with no answer in the documents** · ambiguous questions · Vietnamese questions · prompt-injection attempts against the document-only rule
- **Authorization:** guest cannot upload · student cannot upload · student cannot delete teacher documents · unauthorized users cannot reach teacher APIs · users cannot read another user's history

**The test that matters most:** if the information isn't in the uploaded
documents, the chatbot must not fabricate an answer.
