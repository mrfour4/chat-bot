# Cố vấn Tuyển sinh — AI Admissions Advisor

An admissions Q&A assistant that answers **only** from admissions PDFs uploaded
by teachers. Retrieval runs on Gemini File Search; there is no custom vector
database, embedding pipeline, or RAG framework.

- **Guest** — asks questions, no account needed.
- **Student** — asks questions, keeps conversation history.
- **Teacher** — uploads and manages the admissions PDFs the assistant reads.

## Stack

| Concern | Choice |
| --- | --- |
| App + API | Next.js 16 (App Router), TypeScript |
| Auth + database | Supabase (hosted), Postgres RLS as the authorization boundary |
| Retrieval | Gemini File Search (`@google/genai`) |
| Styling | Tailwind CSS v4 |

## Local setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

At [supabase.com](https://supabase.com/dashboard), create a project. Then open
**SQL Editor**, paste the contents of `supabase/migrations/0001_init.sql`, and
run it. This creates the tables, the sign-up trigger, and every RLS policy.

For local development, turn **off** email confirmation under
**Authentication → Sign In / Providers → Email**, so sign-up logs you straight
in without a mail provider.

### 3. Configure the environment

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same page, the publishable key (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | same page, the secret key (`sb_secret_…`) |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_FILE_SEARCH_STORE` | printed by the bootstrap command below |

`.env.local` is gitignored. The secret key and the Gemini key are read
only on the server and are never sent to the browser.

### 4. Create the File Search store

```bash
npm run gemini:bootstrap
```

This creates a store named `admissions-documents` and prints the resource name.
Copy it into `GEMINI_FILE_SEARCH_STORE`. Re-running is safe — an existing store
is reported rather than duplicated.

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>. Check <http://localhost:3000/api/health> to
confirm both Supabase and Gemini are reachable; it reports each dependency
separately so a failure points at one thing.

## Granting the teacher role

Everyone signs up as a student. Promote a teacher by hand in the Supabase SQL
editor:

```sql
update public.profiles set role = 'teacher' where email = 'teacher@example.com';
```

There is deliberately no self-serve path to the teacher role, and no `UPDATE`
policy on `profiles`, so a user cannot promote themselves through the client.

## Project structure

```
src/
  app/
    (auth)/            sign-in / sign-up, server actions
    api/health/        dependency check for local setup
    auth/confirm/      target of the Supabase confirmation email
    teacher/           teacher-only routes (guarded in layout.tsx)
    page.tsx           public chat entry point
  components/          shared UI
  lib/
    auth.ts            session + role helpers
    database.types.ts  hand-maintained schema types
    documents.ts       document reads
    env.ts             environment access, fails loudly when unset
    gemini/            server-only Gemini client
    supabase/          browser / server / service-role clients
  proxy.ts             refreshes the auth session on every request
supabase/migrations/   SQL schema
scripts/               one-off setup scripts
```

## Commands

```bash
npm run dev              # development server
npm run build            # production build
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run gemini:bootstrap # create the File Search store
```

## Deployment

Deploy to any Node host (Vercel is the path of least resistance). Set the same
environment variables in the host's dashboard; the hosted Supabase project and
the Gemini API are the only infrastructure required.
