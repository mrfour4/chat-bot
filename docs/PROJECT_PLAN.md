# AI Admissions Advisor — Project Plan

**Single source of truth.** Where we are, what's next, why things are the way
they are. Nothing else tracks progress.

---

## 1. Status

**Current phase:** Phase 2.1 — teacher document management
**Current step:** none — 2.1 steps need writing and approving before any code
**Next step:** expand §7.1 into steps, then you approve
**Blocked on:** nothing

| Phase | State |
| --- | --- |
| 1 · Setup | ✅ complete — `/api/health` green, merged to `main` |
| 2.1 · Teacher document management | ⚪ next |
| 2.2 · Gemini RAG | ⚪ |
| 2.3 · Chatbot | ⚪ |
| 2.4 · Access control | ⚪ |
| 2.5 · UX polish | ⚪ |
| 3 · Test | ⚪ |

**Known loose end:** the hosted project has no accounts, so
`npm run promote:teacher -- <email>` has nothing to promote. Sign up at `/login`
first — and turn **off** email confirmation in Dashboard → Authentication →
Sign In / Providers → Email, or the account can't log in. Needed before
`/teacher/documents` is reachable.

---

## 2. How we work

- **Plan first.** Each phase's steps are written here and approved before any code.
- **Step by step, together.** No subagents. One step at a time, so you can read every diff.
- **You verify the UI.** No Playwright, no browser tests. I verify with `typecheck`, `lint`, `build`, and `curl`, and report exactly what they show.
- **One tracking file.** This one.
- **Schema changes go through the Supabase CLI.** Never pasted SQL in the Dashboard.

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
  .groundingChunks[i].retrievedContext  // { title, text, pageNumber, mediaId }
  .groundingSupports[j]                 // { segment, groundingChunkIndices }
```

> `ai.interactions.create`, shown in some Gemini docs, **does not exist** in
> this SDK version. Do not use it.

**5.3 Citations map back to rows.** Upload stamps the Supabase document id into
`customMetadata`, so a citation resolves to a real row.
`documents.gemini_document_name` covers the reverse direction (deletion).

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
behaviour in the product.

**5.8 Generated types stay generated.** `db:types` overwrites
`src/lib/database.types.ts` wholesale, so nothing hand-written may live there.
`src/lib/db.ts` is the stable surface the app imports.

**5.9 Light-only UI, Vietnamese-first.** Bricolage Grotesque (display) / Be
Vietnam Pro (body) / JetBrains Mono (labels, document references), all chosen
for Vietnamese diacritic coverage.

**5.10 Out of scope.** Original PDFs in Supabase Storage, multi-university
tenancy, automated answer-quality eval beyond Phase 3.

**Resolved decisions:** app runs against the **hosted** project (local Docker is
the migration proving ground) · single `.env.local` · `zod` kept for Phase 2.1
validation · **Vitest** added at the start of Phase 2.

---

## 6. Phase 1 — Setup ✅

Merged to `main`: `9840e69`, `45968d9`.

**Built:** Next.js 16 + TypeScript + Tailwind v4 · shadcn/ui on Base UI with
brand tokens · Supabase browser/server/secret clients + session refresh in
`src/proxy.ts` · server-only Gemini client · auth (sign-up, sign-in, sign-out,
email confirmation) + role helpers · app shell (chat page, `/login`,
role-guarded `/teacher/documents`) · `/api/health` reporting each dependency
separately · schema under CLI control with a local Docker stack and seed.

**Verified, local and hosted:** 4 tables with RLS · `profiles` `SELECT`-only ·
`handle_new_user` ACL reduced to `postgres`/`service_role` · signup trigger
firing · `db reset` reproducible from scratch · typecheck/lint/build clean ·
`/api/health` `ok: true` with `gemini-3.7-flash`.

**Two bugs caught by verifying rather than assuming:** a `revoke` that left
`anon` able to execute a `SECURITY DEFINER` function, and fonts silently falling
back to Times because shadcn moved `font-sans` to `<html>` while the `next/font`
variables sat on `<body>`.

---

## 7. Phase 2 — Implement

### 7.1 Teacher document management ← next

Upload a PDF → row created `pending` → indexed into File Search → status
visible → viewable and deletable.

- Vitest added here; upload validation and failure paths written test-first
- Upload route: teacher-only, PDF only, size cap, sha256 for duplicate detection
- `uploadToFileSearchStore` with `customMetadata: { documentId }`; poll the operation; write `ready`/`failed` + `gemini_document_name` back
- Status polling in the UI; delete removes the Gemini document *and* the row
- Failure paths are first-class: a failed index says why and offers retry

*Steps to be expanded here and approved before coding.*

### 7.2 Gemini RAG

- `askDocuments(question)` → `{ answer, citations, grounded }`
- Citations from `groundingMetadata` → `{ documentId, fileName, page, snippet }`, resolved against `documents`
- **The ungrounded guard**, written test-first before the happy path

### 7.3 Chatbot

- Streaming, Vietnamese-first, clear loading and error states
- Citations rendered as document references (the design's signature element)
- Guests chat without an account; students get persisted history

### 7.4 Access control

Guest → chat · Student → chat + own history · Teacher → documents + chat.
Verified at the RLS level, not just the route level.

### 7.5 UX polish

Empty/loading/error states throughout; mobile; keyboard focus; reduced motion.

---

## 8. Phase 3 — Test

- **Documents:** valid PDF · invalid file · oversized · duplicate · deletion · indexing failure · multiple documents
- **RAG:** answerable · multi-part · cross-document · off-topic · **no answer in the documents** · ambiguous · Vietnamese · prompt-injection against the document-only rule
- **Authorization:** guest cannot upload · student cannot upload · student cannot delete teacher documents · unauthorized users cannot reach teacher APIs · users cannot read another's history

**The test that matters most:** if the information isn't in the uploaded
documents, the chatbot must not fabricate an answer.

---

## 9. Changelog

- **2026-08-30** — Phase 1 complete, merged to `main`. Scaffold, auth, design system, shadcn/ui on Base UI; schema under Supabase CLI control (local stack on 544xx, applied and verified on both local and hosted); types generated; `/api/health` green.
