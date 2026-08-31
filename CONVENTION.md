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

- **A link that looks like a button is a `<Link>` with `buttonVariants()`,
  never `<Button render={<a/>}>`.** Base UI's Button applies `role="button"`
  whenever `nativeButton` is false (`useButton.js`), which overrides the link
  role: the element stops being announced as a link, and "open in new tab"
  stops being announced at all. `nativeButton={false}` silences the console
  warning and causes the very problem the warning is about.
- **Chat uses `MessageScroller`, history uses `useVirtualizer`.** The scroller
  already virtualizes (`content-visibility: auto` on every item), preserves
  scroll on prepend, and reports reaching the top. A plain list has none of
  that, so it gets a virtualizer — with rows **measured**, not estimated, or the
  list drifts further out of position the further you scroll.
- **Ask for the next page before the end, not at it.** Derived from the last
  rendered virtual item, so scroll position has one source of truth.
- **KaTeX cannot measure Vietnamese, and says so as a warning about a font.**
  Toned vowels live in Latin Extended Additional (`0x1E00–0x1EFF`), which is
  absent from KaTeX's `scriptData`, so it neither has metrics nor substitutes
  `M`'s the way it does for Cyrillic and CJK. The character still draws, in a box
  of zero width and height, so everything after it is mispositioned. Metrics are
  extended once in `lib/chat/katex.ts`; every KaTeX render goes through that
  module so the extension cannot be bypassed.
- **A quotation is rendered with `MathText`, an answer with `Markdown`.** A
  citation snippet is text from someone's document: Markdown would let it
  restructure itself, turning pipes into a table and `*` into a list the source
  never had. `MathText` renders notation and emits every other character
  verbatim.
- **A scroll store's first snapshot is not a measurement.** `MessageScroller`
  creates its state as `{start: false, end: false}` and corrects it in a layout
  effect, so a passive effect on mount reads "at the top" for a viewport that is
  about to be anchored at the end. Anything that fetches on reaching an edge
  arms itself a frame after mount.
- **A React-state flag cannot gate two calls in one commit.** `isPending` lands a
  render later, and Strict Mode invokes mount effects twice. Single-flight
  guards are refs, written before the call.
- **Nothing permanent may sit at the top of `MessageScrollerContent`.** The
  scroller recognises a prepend by the element that used to be first having
  moved down, and restores scroll only then. A trigger or banner pinned at the
  top is always index `0`, so the restore never runs and an infinite-scroll list
  refetches until it is exhausted. Such a control goes beside the viewport, not
  inside the content.
- **A tooltip on a disabled control goes on the wrapper.** A disabled button
  dispatches no pointer events, so a tooltip attached to it never opens; the
  trigger is a wrapping element and the button inside it is `pointer-events-none`.
- **`Select.Value` reads the Root's `items`, not the selected `SelectItem`.**
  Without that map it prints `String(value)`, which looks translated whenever
  the values happen to be English words. Any `Select` whose labels are
  translated passes `items`.
- **`truncate` does nothing in a table cell without `table-fixed` and
  `max-w-0`.** `table-layout: auto` widens the column to its widest content
  instead of clipping, so one long unbroken filename pushes the whole table
  sideways.

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
- **Two i18n tests, and they catch different things.** Key *parity* proves `en`
  and `vi` agree; it says nothing about a key neither file has. A component
  referencing a key that was never added passes parity and throws
  `MISSING_MESSAGE` at render, so a second test scans the source for literal
  `t("…")` calls and resolves each one in both catalogues.

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
- **A soft delete is an `UPDATE`.** When `deleted_at` replaced a row delete, the
  `DELETE` policy stopped covering the action it existed for, without failing.
  Any policy that guards an action has to guard the statement that performs it.
- **`WITH CHECK` sees only the new row**, so it cannot express "this column is
  immutable". `documents.uploaded_by` and `checksum` are held by a trigger;
  without it a teacher could take ownership of a colleague's document and then
  delete it, passing every policy on the way.
- **Two permissive policies for one role and action both run on every row.** The
  advisor flags it. Merge them into one `using (a or b)`.
- `npm run test:rls` is the proof, and it is worth breaking on purpose
  occasionally: add a permissive policy, watch a check fail, remove it.

## 7. Constraints that are not visible from the code

These caused real failures. Changing them will look harmless and will not be.

- **The built-in Supabase email provider sends 2 emails per hour, project-wide.**
  Only custom SMTP raises it, and only custom SMTP allows custom templates. Every
  auth email — confirmation, recovery — shares that budget, so `enable_confirmations`
  competes with password resets.
- **Never report an auth failure as a wrong password.** Classify with
  `authErrorKind`: 429 is a rate limit, no status is an unreachable server, and
  only another status means the request was actually refused. Telling a
  rate-limited user their password is wrong makes them retype it and conclude the
  account is broken.
- **A refusal is not a fact about the account.** `resetPasswordForEmail` answers
  success for an unknown address by design, so any error it returns is a genuine
  failure and can be shown in full — the neutral "if that address has an account"
  wording belongs only on the success path.
- **`DropdownMenuContent` is `w-(--anchor-width)`.** Hanging off an icon button it
  is floored at `min-w-32` with `overflow-x-hidden`, so long labels wrap or clip.
  Pass `className="w-auto"`; adding `whitespace-nowrap` alone converts a wrap
  into a clip.
- **`@supabase/ssr` forces PKCE, so every emailed link returns `?code=`, never a
  fragment.** The token in the email is prefixed `pkce_`. Probing an auth endpoint
  with `curl` produces an *implicit* link instead (no verifier), which is a
  different shape from what the app will ever see — do not design around it.
  Consequence: an emailed link only works in the browser that requested it.
- **`push` after every migration, and check `supabase migration list --linked`.**
  The app reads hosted, so a migration applied only locally is invisible to it —
  a `remote: ""` row is a feature that silently does nothing.
- **An SVG with only a `viewBox` expands to fill its container.** Icons written
  for `Button` carry no size class on purpose (its CSS sizes them); at any other
  call site they need one, or they squeeze their neighbours.
- **A `"use server"` file may export only async functions.** Every export becomes
  a callable endpoint, so a `const` export is refused — and the refusal breaks
  every *other* export in the file, surfacing as "Export X doesn't exist in
  target module". TypeScript and the test suite cannot see this; only running the
  app can. Constants belong in a plain module (`lib/profile/paths.ts`).
- **`profiles` is writable only through two columns.** `grant update (full_name,
  avatar_url)` plus `profiles_update_own` plus the `profiles_guard_immutable`
  trigger. Never `grant update on public.profiles` — `authenticated` would regain
  `role`. The trigger skips callers where `auth.uid()` is null, because
  `promote:teacher` runs as the service role.
- **Supabase silently substitutes `site_url` for a `redirectTo` it does not
  allow.** No error, no warning — the email or callback simply goes somewhere
  else. `additional_redirect_urls` needs `/**` on our origins because a
  `redirectTo` carrying a query string does not match a bare path entry.
- **Free-tier Supabase with the default email provider refuses custom email
  templates**, and `config push` is atomic — one template blocks every other auth
  setting from being pushed. Keep `[auth.email.template.*]` commented out until
  custom SMTP exists.
- **The default recovery/confirmation email returns the session in the URL
  fragment.** A fragment never reaches the server, so a route handler sees no
  token. `/auth/recover` is a client page for exactly this reason.
- **A row inserted into `auth.users` by SQL cannot take part in an email flow.**
  GoTrue reads `confirmation_token` as a string and the insert leaves it `NULL`:
  *"converting NULL to string is unsupported"*. Use the signup API when a test
  needs a real account.
- **The app uses the HOSTED Supabase, not the local stack.**
  `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` is `https://<ref>.supabase.co`. The
  local stack exists for `npm run test:rls` and for applying migrations before
  they are pushed. Verifying auth or data against `127.0.0.1:54421` therefore
  proves nothing about what the running app sees — check the URL first.
- **A session without a profile row looks like being signed out.**
  `getSessionUser()` returns `null` when the profile is missing, so the header
  offers "Đăng nhập" to someone who is genuinely authenticated. Any account
  created before `handle_new_user` existed is in this state; the
  `backfill_missing_profiles` migration closes it.
- **Supabase links a new OAuth identity to an existing verified email.** Signing
  in with Google on an address that already has a password account does not
  create a second user; `auth.identities` gains a row against the same
  `user_id`. One account, one history.
- **The Supabase CLI reads `.env.local`.** `env()` substitution in
  `config.toml` resolves from the same file Next.js uses, so a value like
  `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` feeds both the local stack and the
  app. Verified by reading the auth container's environment after a restart.
  Both `supabase start` and `next dev` read it **only at boot** — a hot reload
  will not pick up a change.
- **The two OAuth callbacks are not interchangeable.** Google Cloud Console must
  be given *Supabase's* callback
  (`http://127.0.0.1:54421/auth/v1/callback` locally, `https://<ref>.supabase.co/auth/v1/callback`
  hosted) — that is the `redirect_uri` GoTrue sends, and Google matches it
  exactly. This app's `/auth/callback` belongs in `additional_redirect_urls`.
  Swapping them yields `redirect_uri_mismatch`. The official Supabase guide's
  example shows the app URL in Google's list; it is wrong.
- **Start an OAuth flow from a server action, not the browser client.**
  `@supabase/ssr` flushes a cookie immediately for any key ending
  `-code-verifier`, so the PKCE verifier lands in an `HttpOnly` cookie. The
  browser client stores the same value where page scripts can read it.
- **Never pass a `flowId` to `exchangeCodeForSession` here.** `auth-js` keys
  verifiers per flow, but `@supabase/ssr` leaves
  `appendPkceFlowIdToRedirects` off, so `sb_flow_id` never reaches the callback.
  With no flow id the SDK reads the fixed key it dual-writes; with a wrong one it
  submits another flow's verifier and burns the single-use auth code.
- **`enabled` in `config.toml` cannot be env-gated.** `env()` substitution works
  on strings only, so a provider is on or off in committed config. Gate the *UI*
  on the credential instead, or a clone with no credentials shows a button that
  fails at the provider.
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
- **Gemini cannot rename a document.** `fileSearchStores.documents` exposes
  `list`, `get` and `delete` — no update. `displayName` is written once at
  upload. So a citation's name comes from our own row, resolved through the
  `docid` stamped into `customMetadata`, and it is resolved **at render**: a
  rename has to reach messages written last week.
- **Archiving means deleting from the store.** File Search has no "disable", so
  leaving retrieval scope is `documents.delete` and un-archiving costs a
  re-index.
- **`%` and `_` are `ilike` wildcards.** An unescaped search for `100%` matches
  every row rather than one. Both search boxes escape them.
- **PostgREST's `or()` takes a comma-separated string**, so a comma in a search
  term would rewrite the filter. Searches are single-column for that reason.
- **PostgREST has no row-value comparison.** A `(created_at, id)` keyset is
  written out as `created_at.lt.X,and(created_at.eq.X,id.lt.Y)`.
- **A cursor on a timestamp alone loses messages.** A turn writes its question
  and its answer in one round trip, so an identical millisecond is the normal
  case. Measured: 2 of 60.
- **`signInWithPassword` replaces the token on the client it is called on.** A
  probe that signs in on the service-role client silently downgrades every later
  write, and if the write is refused by RLS the probe reports whatever it was
  measuring as broken. Use two clients.
- **`realtime.send` swallows its errors as a `WARNING`.** A broadcast that never
  arrives leaves no trace in the caller.
- **`realtime.messages` is shared by every channel in the project.** A policy on
  it must check `realtime.topic()` as well as the role, or it opens all of them.
- **`useVirtualizer` needs `"use no memo"`.** It is a mutable instance whose
  methods read scroll state React cannot see.
- **The answer cannot be streamed.** `groundingSupports[].segment` carries
  offsets into the *completed* answer, so the metadata that decides whether an
  answer may be shown necessarily arrives last. Streaming would mean publishing
  a possible fabrication and retracting it.

- **`documents.updated_by` is stamped by a `BEFORE UPDATE` trigger, not by
  routes.** `documents_update_teacher` requires `updated_by = auth.uid()` in its
  `WITH CHECK`, so any update on a user's client that does not set it is refused
  with 42501 — worded "new row violates row-level security policy", which reads
  like an insert failure and is not one. The trigger leaves an explicitly set
  value alone, and does nothing under service role, so background jobs do not
  claim someone's edit.
- **Only upload, restore, retry and the cron sweep may call Gemini.** Renaming,
  archiving, deleting, searching and paging change nothing about the index. A
  client must never trigger the recovery sweep: it re-ran on every refetch and
  spent quota on documents that were only ever going to look stale.
- **`GEMINI_BASE_URL` makes Gemini unreachable, not merely unused.** It rewrites
  the host on every request, and when it is set the API key and store name fall
  back to placeholders, so local work cannot spend quota by accident.

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
- **`STALE_AFTER_MS` must exceed `INDEXING_TIMEOUT_MS`.** The sweeper resets a
  row to `pending` before re-running it, so if indexing could outlast the stale
  window the sweeper would hijack a job that was still working — and the claim
  could not stop it, because the reset already put the row back. Asserted in
  `status.test.ts`.
- **Uploading schedules one worker, not one job per file.** The worker drains
  the queue in sequence. Sequence is enforced twice: an in-process promise keeps
  concurrent Gemini calls to one, and the claim keeps two instances from
  indexing the same document. The lock saves quota; the claim is the
  correctness.
- **A document that loses the claim race is skipped, not retried.** Otherwise
  the worker asks for the same oldest row forever.
- **Status reaches the browser by Realtime broadcast, and polling is the
  fallback.** Polling runs only while the channel is not `SUBSCRIBED`, because a
  WebSocket fails in ways a fetch does not and a dead socket would otherwise
  look like a document stuck on "Uploading".
- **The broadcast is a signal, not data.** It invalidates the query rather than
  patching the row into the cache: the list is paged, searched and filtered
  server-side, so merging a payload would mean re-implementing the `where`
  clause in the browser.

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
- `npm run test:api` — opt-in. `*.itest.ts` needs a real database, and some of
  them need Gemini. Point them at the mock instead of spending quota:

  ```bash
  npm run mock:gemini
  GEMINI_BASE_URL=http://127.0.0.1:4010 npm run test:api
  ```

  The real-API tests use the single-page fixtures in `doc-to-test/`.
- `npm run mock:gemini` — an independent server speaking Gemini's wire protocol,
  so the real SDK stays in the path. `GEMINI_BASE_URL` redirects the whole
  surface, because the SDK rewrites the resumable upload's host to that base.
- `npm run seed:test -- <email>` — enough rows to see paging, virtualization,
  search and filtering; `--clean` removes exactly what it made.
- `npm run test:rls` — authorization, at the database.
- The UI is verified by hand. No browser automation.
