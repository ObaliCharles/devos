# DeveloperOS

The platform specified in Chapters 1–11, built. Not a demo: real auth, real
database, real AI, real code execution, deployable today.

The idea the whole product rests on is the **mastery gate**. You cannot mark a
lesson complete by clicking a checkbox. You have to read it, write a note about
it, do the exercise, pass the quiz at 80%, and review the summary. The check
runs on the server, so there is no way around it — including for you.

## What is in it

| Module | Where | What it does |
|---|---|---|
| **Auth** | Clerk | Sign up/in, protected routes, per-user data, admin role |
| **Learning** | `/learning` | Roadmap → phase → skill → lesson, phase locking, mastery gate, quizzes, XP, streak, lesson search, real time tracking |
| **Review** | `/review` | Spaced repetition on the 1/3/7/14/30 ladder |
| **Practice** | `/practice` | Coding challenges with **real execution** — your code runs against visible and hidden tests in a sandbox |
| **Knowledge** | `/notes` | Markdown notes with `[[wiki links]]`, backlinks, a graph view, tags, collections, version history, 30-day trash, snippet vault, flashcards, 3s auto-save |
| **Projects** | `/projects` | Create wizard, Kanban with drag-and-drop, milestones, bug tracker, deployments, database designer, API docs — each linked to the skills it practises |
| **AI centre** | `/ai` | Streaming chat that can see your workspace, editable memory, prompt library, per-day cost caps |
| **Career** | `/career` | Job-readiness score, ATS resume builder, portfolio from your projects, application + interview trackers, certificates, freelance |
| **Analytics** | `/analytics` | Time-by-kind, 12-week heatmap, goals measured live, habits with streaks, Pomodoro timer, achievement badges |
| **Calendar** | `/calendar` | Your schedule plus every deadline from the other modules |
| **Admin** | `/admin` | User management, content & roadmap builder, feature flags, audit log |
| **Settings + platform** | `/settings` | Preferences, data export, account delete, global CTRL+K search, notifications, resources, help |

Eleven real lessons and six verified coding challenges ship in the seed, with
exercises, quizzes and hidden test cases written out — not placeholders.

## Proof it works

```bash
npm run smoke
```

**162 assertions** run against a throwaway database and drive every module the
way a user would: the mastery gate refusing and granting, notes and their
backlinks, the code executor grading real submissions, AI cost caps refusing an
over-limit call, the admin guard, account deletion — the rules the product makes
a promise about. See `docs/ARCHITECTURE.md` and `docs/DECISIONS.md`.

## Quick start

```bash
cp .env.example .env.local     # then fill in the Clerk keys — see SETUP.md
npm install

npm run db                     # a real local MongoDB, in its own terminal
npm run seed                   # loads the starter roadmap
npm run dev
```

Open <http://localhost:3000>.

`npm run db` downloads a mongod binary on first run and keeps its data in
`.data/mongo`, so there is nothing to install and no cloud account needed. If
you would rather use Atlas, skip it and point `MONGODB_URI` at your cluster —
nothing else changes.

Only the two Clerk keys are actually required to start. Without
`ANTHROPIC_API_KEY` everything works except the tutor, which says so.

Full setup instructions, including where the Clerk and MongoDB values come
from, are in [SETUP.md](./SETUP.md).

## Layout

```
src/
  app/
    (app)/          authenticated shell — every module's pages
    api/            ai/chat (streaming), ai/explain (tutor), search (CTRL+K)
  components/       one file per surface — kanban, code-runner, ai-chat, …
  lib/
    models/         Mongoose schemas, one file per domain, index.ts barrel
    queries/        read paths, one file per module, index.ts barrel
    actions/        server actions — every rule the product makes, by module
    runner.ts       the code-execution sandbox (Practice Centre)
    ai.ts           model client, pricing, and the per-day cost cap
    ats.ts          the deterministic resume scorer
    achievements.ts badge definitions the engine re-evaluates
    srs.ts / day.ts / user.ts / wikilinks.ts
scripts/
  seed.ts           roadmap, lessons, and challenges
  seed-challenges.ts the six verified coding challenges
  dev-db.ts         local mongod, no install required
  smoke.ts          162 assertions across every module, against a real database
docs/               scope, architecture, decisions, backlog
```

The three `lib/` barrels are why every import stayed `@/lib/models`,
`@/lib/queries`, `@/lib/actions` as the app grew from five modules to twelve —
see `docs/DECISIONS.md` 014.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · MongoDB +
Mongoose · Clerk · Anthropic API.

Deliberately still not here: Framer Motion, shadcn/ui, Zustand, TanStack Query,
Recharts, TipTap, Monaco, FullCalendar. Kanban drag-and-drop, the code editor,
the graph, the calendar and the charts are all hand-built on the token system
rather than pulling those in — see `docs/DECISIONS.md` 004. Add each at the
point it earns its place.
