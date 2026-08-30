# Conventions

How this codebase is arranged and why, plus the constraints that are not
visible from the code itself.

The source carries no explanatory comments. Anything that would have been one
is here.

---

## 1. Directory layout

```
src/
  app/            routes and route handlers, nothing else
  components/
    <feature>/    one component per file, plus index.ts
    ui/           shadcn components -- flat, because the CLI writes here
  constants/      values with no behaviour
  hooks/          client state and server interaction
  i18n/           locale resolution and the locale action
  lib/            business logic
    api/          typed callers for this app's own HTTP routes
    chat/ documents/ gemini/ rag/ supabase/ query/
    validation/   Zod schemas shared by form and server
  providers/      React context providers
  types/          shared types
messages/         vi.json, en.json
supabase/         migrations (CLI only) and the RLS suite
docs/phases/      one document per delivered phase
```

**Formatting:** Prettier, four spaces. `npm run format` writes,
`npm run format:check` verifies. Generated files, applied migrations, the
lockfile and Markdown are excluded.

## 2. Components

- **One component per file.** The file is named for the component in
  kebab-case.
- **States are components, not branches.** `DocumentList` renders
  `DocumentsEmpty`; a page never asks "is this list empty".
- **Feature folders export through `index.ts`.** `src/app/**` imports from the
  barrel. **Files inside a folder import each other directly** — a barrel a
  folder's own members import from is a cycle waiting to happen.
- **Components render; hooks decide.** No `fetch` in a component. `useDocuments`
  and `useChat` hold the state and the mutations.
- **Never hand-roll what `components/ui` provides.** Button, Input, Alert,
  Empty, Spinner, Separator, Badge, Dialog, Field, Collapsible, ToggleGroup.
- **Base UI composes with `render`, not `asChild`:**
  `<Button render={<Link href="…">…</Link>} />`.
- **Do not overwrite `components/ui/*` from the CLI** without deciding to. The
  install prompt is declined by default.

## 3. Forms

TanStack Form with a Zod schema in `lib/validation/`.

- Schemas carry **message keys**, not sentences, because the same schema runs in
  the browser and on the server and only the caller knows the reader's
  language.
- `useFieldErrors()` translates them in a form; server actions use
  `getTranslations`.
- Validity is expressed once: `data-invalid` on `Field` and `aria-invalid` on
  the control, from one expression, so what is seen and what is announced
  cannot disagree.
- **Any client rule the server does not also enforce is decoration.** The
  server re-parses with the same schema.

## 4. Feedback

**A toast reports an outcome the screen does not already show.**

| | Success | Failure |
| --- | --- | --- |
| Upload, delete, retry | toast | toast |
| Ask a question | none — the answer is the feedback | toast **and** inline |
| Sign in / sign up | redirect, or an inline notice | toast **and** inline |

A failed question keeps an inline message because a toast expires, and a
question with no answer and no explanation looks like it was ignored.

## 5. Internationalisation

- `next-intl`, **no locale in the URL**. The locale is a cookie, read in
  `src/i18n/request.ts`. Vietnamese is the default.
- Both catalogues must define the same keys and the same ICU arguments;
  `messages.test.ts` enforces it. A missing key does not throw — next-intl
  renders the key — so only a test catches it.
- **A message produced while someone is waiting is translated.** There is a
  request, so there is a reader whose language we know.
- **A message a background job persists is not.** An indexing failure written
  into `documents.error_message` minutes after the tab closed has no request
  and no reader.
- **The assistant answers in Vietnamese in both locales.** The documents are
  Vietnamese; an English answer would be an unverified translation of a
  Vietnamese regulation, and its citations would still point at Vietnamese
  text. The interface is bilingual; the evidence is not translated.

## 6. Data access and authorization

- **RLS is the authorization boundary, not the route guards.** The publishable
  key ships in the browser by design, so anyone can call PostgREST directly and
  the policy is the only thing standing there. Route guards are for user
  experience.
- **Repositories take their client as an argument.** A teacher's read must go
  through the *user's* client so RLS applies; a background write has no session
  and must use the secret key. A module that picked its own would reach for the
  secret key everywhere and quietly switch the boundary off.
- **404, not 403, for something you may not see.** Answering 403 confirms that
  another user's row exists.
- **Schema changes go through `supabase migration new` and `db push`.** Never
  the Dashboard.
- Storage object policies mirror the table policies exactly. If they diverged, a
  teacher could reach a PDF whose row is invisible to them.
- `npm run test:rls` is the proof, and it is worth breaking on purpose
  occasionally: add a permissive policy, watch a check fail, remove it.

## 7. Constraints that are not visible from the code

These caused real failures. Changing them will look harmless and will not be.

- **Gemini `customMetadata` keys must be lowercase.** With the key stored as
  `documentId`, a `metadataFilter` of `documentId=…` matches **zero chunks** and
  so does `documentid=…`; the same value under `docid` matches. Hyphens in the
  *value* are fine. `DOCUMENT_ID_KEY` is imported by both the writer and the
  reader so they cannot drift.
- **`customMetadata` is an array of `{key, stringValue}`**, not an object.
- **`documents.delete` needs `config: { force: true }`** or it answers
  *400 Cannot delete non-empty Document*.
- **A retrieval check is the only way to know a document indexed.** `sizeBytes`
  reports the uploaded bytes and `state` reads `STATE_ACTIVE` either way. An
  empty index and a correct refusal look identical from the outside.
- **Delete from Gemini before deleting the row.** The reverse order leaves an
  orphan nothing can reach; this order leaves a row you can simply delete
  again. That self-heal depends on treating a 404 as success — and a **403**
  too, which means the API key was rotated and the old store is gone forever.
- **`storage.objects` refuses direct SQL deletes.** A trigger insists on the
  Storage API. Tests clear their own fixtures by setting
  `storage.allow_delete_query`.
- **`documents.updated_at` cannot be backdated** — a trigger rewrites it on
  every write. That is what makes it trustworthy as a liveness signal for the
  sweeper.
- **A bulk PostgREST insert whose objects have different keys sends `NULL`** for
  the missing ones, which a `not null` column rejects.
- **`gemini-3.6-flash`, not the newer 3.7.** 3.7 returned 503 for ~75 seconds
  straight while 3.6 answered first try. Newest is not most available.
- **The free tier is 20 requests per day per model.**
- **The answer cannot be streamed.** `groundingSupports[].segment` carries
  offsets into the *completed* answer, so the metadata that decides whether an
  answer may be shown necessarily arrives last. Streaming would mean publishing
  a possible fabrication and retracting it.

## 8. Background work

- Upload stores the PDF and returns; `after()` runs the indexing.
- The `pending → indexing` transition is a **claim**: the update matches only
  rows still `pending` and proceeds only if it changed one. Two workers can race
  the same document and exactly one wins. Without it both would upload the same
  PDF and the loser would overwrite the winner.
- A job takes **only an id**. Everything else, the bytes included, is re-read
  from storage — the request that started it may be long gone.
- A job never throws. An unhandled rejection in `after()` has nobody to catch
  it and leaves a row at `indexing` with no trace of why.
- The sweeper re-drives anything stale. `STALE_AFTER_MS` is imported by both the
  route and the panel: if they disagreed, the panel would ask on every poll and
  be told nothing every time.

## 9. The rule underneath most of the above

**Correct behaviour and broken behaviour must not look the same.**

An empty document library, a silently unindexed PDF, a redirect with no
explanation, a document stuck at "indexing" because its worker died, a
half-translated catalogue: each of these looks exactly like the system working
until someone checks. Every one of them is handled by making the difference
visible, and the tests are written to fail when it stops being.

## 10. Testing

- `npm test` — unit tests, Node environment, no jsdom. Components are asserted
  through `renderToStaticMarkup` where a string is enough.
- `npm run test:api` — opt-in, calls the real Gemini API. Uses the single-page
  fixtures in `doc-to-test/`.
- `npm run test:rls` — authorization, at the database.
- The UI is verified by hand. No browser automation.
