# Decisions

Short records of the choices that would otherwise be re-litigated in four
months. Each says what was decided, why, and what would change it.

Append to this file rather than editing entries. A decision that turned out
wrong is more useful with its reasoning intact than quietly rewritten.

---

## 001 — Next.js + MongoDB, not FastAPI + PostgreSQL

**Status:** accepted for v0.1 · **See also:** 002

The first planning document specified FastAPI, PostgreSQL, Redis, S3 and
Meilisearch. From Chapter 1 onward the specification says Next.js API routes,
MongoDB, Clerk and Cloudinary, and Chapters 2–10 were all written against that.

Nothing recorded the switch, which meant the documentation had two
incompatible stacks in it and no way to tell which one won.

**Decided:** the Chapter 1 stack. Ten chapters of specification assume it, it is
one language end to end, and it deploys to Vercel with no separate service to
run.

**Reversal cost:** low today, high later. The data layer is behind
`lib/queries.ts` and `lib/actions.ts`; nothing else touches Mongoose.

---

## 002 — MongoDB is a decision, not a conclusion

**Status:** open · **Revisit before:** building Projects or Knowledge

The honest case against the choice in 001:

Almost every relationship in this specification is relational. Roadmap → Phase
→ Skill → Topic → Lesson is a strict hierarchy. Backlinks are a graph. Task
dependencies are a DAG. Every analytics page in Chapter 10 is a join across
five collections. XP, streak and mastery updates want a transaction.

With Postgres those are foreign keys, joins and `BEGIN`. With MongoDB they are
hand-written aggregation pipelines and application-level integrity — which is
why `masterLesson` writes to three collections with no transaction around them.

Two further points: the Project Z roadmap already commits to learning
PostgreSQL, so Postgres would be the thing being learned rather than a
detour. And v0.1 currently uses none of MongoDB's actual strengths — no
sharding, no varying document shapes, no write volume.

**Not reversed now** because ten chapters assume it and a running MVP beats a
correct rewrite. But this is the decision most likely to be wrong.

**What would trigger a switch:** the first aggregation pipeline that takes more
than an hour to write, or the first data-integrity bug caused by a partial
multi-collection write.

**Migration path if it happens:** Prisma or SQLAlchemy behind the same
`queries.ts` / `actions.ts` boundary. Pages and components would not change.

---

## 003 — Clerk for authentication

**Status:** accepted

Rolling your own auth means sessions, password resets, email verification,
MFA and social login — weeks of work with real security consequences for
getting any of it wrong. Clerk's free tier covers far more users than this will
have.

**Cost:** a hard dependency on a third party, and user identity living outside
the database. Mitigated by keeping a local `User` document keyed on `clerkId`,
so all application data hangs off an id we control.

---

## 004 — No shadcn/ui, Framer Motion, Zustand, TanStack Query or Recharts yet

**Status:** accepted

Chapter 1 lists all of them. v0.1 uses none.

- **shadcn/ui** — five hand-written primitives in `globals.css` cover every
  screen. Add shadcn when a component genuinely needs a11y-correct behaviour
  that is tedious to write: dialogs, comboboxes, dropdowns.
- **Framer Motion** — CSS handles what is here. Add it for drag-and-drop
  Kanban, which is where hand-rolling stops being sensible.
- **Zustand** — there is no client state to share. Server Components plus
  `useState` are sufficient. Adding a store now would mostly duplicate the
  server.
- **TanStack Query** — server actions and `revalidatePath` already do
  invalidation. Add it when there is optimistic UI complex enough to need it.
- **Recharts** — the dashboard chart is fourteen divs. Add Recharts with the
  Analytics module, where the charts are real.

**Principle:** a dependency that is not solving a problem you currently have is
a cost with no benefit. Every one of these is worth adding at the point it
earns its place.

---

## 005 — Topic level collapsed

**Status:** accepted for v0.1 · **See:** BACKLOG Tier 0

Chapter 4 specifies Roadmap → Phase → Skill → **Topic** → Lesson. v0.1 goes
straight from Skill to Lesson.

With eleven lessons, Topic would be a level of navigation with one child each —
a click that teaches the user nothing. Add it when a skill exceeds roughly ten
lessons and the list stops being scannable.

**Cost of adding later:** one collection, one route, and changes to
`getRoadmap()`. Do it before the content grows, not after.

---

## 006 — Fixed spaced-repetition ladder

**Status:** accepted

1 / 3 / 7 / 14 / 30 / 60 days, per Chapter 6. Correct recall moves up one rung,
failure drops two.

SM-2 with per-item ease factors is better, but it needs a quality rating from
the user on every review and enough history to be worth anything. The fixed
ladder is legible, debuggable, and produces the same behaviour for the first
few weeks.

`lib/srs.ts` is pure and self-contained — swapping the algorithm touches one
file.

---

## 007 — The mastery gate is enforced server-side

**Status:** accepted · **Do not reverse**

This is the product. If a lesson can be marked complete without meeting the
requirements, DeveloperOS is a checklist app with extra steps.

The client disables the button; the server refuses the write. Two of the five
requirements cannot be self-reported at all: the quiz is graded server-side,
and the note gate is recomputed from saved notes on every render.

The remaining three are self-reported, which is a known compromise —
verifying "you did the exercise" requires code execution, which is the
Practice Centre's problem to solve.

**If you ever add an override, log it.** A gate with a silent bypass is worse
than no gate, because it lies.

---

## 008 — Content is global, not per-user

**Status:** accepted for v0.1 · **Blocks:** multi-tenancy

`Roadmap`, `Phase`, `Skill` and `Lesson` have no owner. There is one user, and
the seed script is the content management system.

This is the single change that turns a personal tool into a SaaS product, and
it touches every content query. It is cheap now and expensive after there are
users. Do it before the first non-you account, not after.

---

## 009 — Anthropic API directly, not a provider abstraction

**Status:** accepted

The first planning document called for an OpenAI-compatible provider
abstraction. v0.1 calls the Anthropic SDK directly from one route handler.

An abstraction over one implementation is speculation. All AI access is behind
`/api/ai/explain`, so swapping or adding a provider means editing one file —
which is what the abstraction would have bought, without writing it first.

**Add the abstraction when:** there is a second provider, or users bring their
own keys.

---

## 010 — Eleven real lessons instead of placeholder content

**Status:** accepted

The seed could have been `Lesson 1`, `Lesson 2`, `lorem ipsum`. It isn't:
eleven lessons with genuine explanations, exercises with acceptance criteria,
and quizzes with explanations for each answer.

Placeholder content makes an app impossible to evaluate. You cannot tell
whether the mastery gate feels right, whether lessons are the correct size, or
whether the quiz threshold is fair, until you work through real material.

**Consequence:** `scripts/seed.ts` is large and will keep growing. Content moves
out of the repository and into the admin panel at Tier 3.

---

## 011 — A local mongod ships with the repo

**Status:** accepted

v0.1 documented two ways to get a database: an Atlas account, or a MongoDB
install. Both are real work before a single line of the app runs, and the
default `MONGODB_URI` in `.env.example` points at a local MongoDB that is not
there — so a fresh clone starts broken, and the first thing it does is throw a
connection error on every page.

`npm run db` starts a real mongod on 127.0.0.1:27017 with its data in
`.data/mongo`, using `mongodb-memory-server` purely as a binary downloader. It
is a genuine MongoDB, not a fake, so nothing about the app's behaviour changes.

**Cost:** an ~80 MB download on first run, and a dev dependency.

**Reversal:** delete the script. Atlas still works — it is one line in
`.env.local`, which is exactly how it should be for production.

---

## 012 — Day keys are the local day, computed by hand

**Status:** accepted · **Supersedes an unstated assumption in ARCHITECTURE.md**

`StudySession.day` was documented as "the user's local day" but computed with
`toISOString().slice(0, 10)`, which is UTC. West of Greenwich that files an
evening's work under tomorrow: the streak can advance twice in one sitting, and
the activity chart draws a bar on a day the user was asleep.

`lib/day.ts` builds the key from local date parts instead. It is pure, has no
dependencies, and is the one place any part of the app decides what "today"
means.

**Still true:** this is the *server's* local day, which is the user's only
because there is one user on one machine. Per-user timezones need a field on
`User` and a key computed against it — worth doing before the first account in
another timezone, not before.

---

## 013 — One smoke test instead of a test suite

**Status:** accepted · **See:** ARCHITECTURE.md "Testing"

`npm run smoke` drives the whole loop against a real database: sign in, be
refused mastery, clear the gate, be granted it, have the review come due, grade
it, and fail to touch another user's data. 46 assertions, no mocks below the
edges — the real server actions, the real Mongoose models, the real rules.

Clerk and `next/cache` are replaced through `tsconfig.smoke.json` path
mappings, because both need a request context that a script does not have.
Nothing in the app resolves to those stubs.

**Why this shape:** the promises this product makes live in `lib/actions.ts`,
and they are only true in combination — "deleting your notes reopens the gate"
spans three functions and two collections. Unit tests around each function
would pass while the promise broke. This runs in about two seconds and fails
loudly when a rule stops holding.

**What it does not cover:** rendering. Every assertion is about data. A
component test story is still missing, and Playwright against a signed-in
session is the obvious next step.

---

## 014 — models/, queries/, actions/ became directories

**Status:** accepted

v0.1 had one file each: `lib/models/index.ts`, `lib/queries.ts`,
`lib/actions.ts`. That was right for five modules and wrong for twenty. Sixty
collections in one file is a file nobody reads.

Each is now a directory of domain files with an `index.ts` barrel that
re-exports them. Every existing import (`@/lib/models`, `@/lib/queries`,
`@/lib/actions`) still resolves, so nothing downstream changed. The rules from
ARCHITECTURE.md are restated at the top of each barrel.

One wrinkle worth recording: the `actions/index.ts` barrel must **not** carry
`"use server"`. A "use server" file may only export async functions, and
`export *` is not allowed in one. The directive lives in each module file where
the actions are actually defined; the barrel is a plain re-export.

---

## 015 — Two reserved Mongoose pathnames, renamed

**Status:** accepted

Mongoose reserves `collection` and `errors` as schema pathnames — a document's
`.collection` is its driver handle, and `.errors` holds validation errors.
Naming a field either would compile, warn once at model build, and then quietly
hand back the wrong object at runtime.

So the note→collection reference is `noteCollection`, and the API endpoint's
error-response field is `errorResponses`. If you add a field and see
"reserved schema pathname" in the logs, rename it rather than suppress the
warning.

---

## 016 — The note gate excludes trashed notes

**Status:** accepted · **Found by:** `npm run smoke`

Chapter 6 gave notes a 30-day trash instead of a hard delete. That interacted
with the mastery gate: `syncNotedGate` counted every note on a lesson, trashed
or not, so trashing your only note left the gate satisfied — mastery standing
on a note in the bin.

The count now filters `trashedAt: null`, everywhere the gate is computed. A
trashed note is not a written note. The smoke test caught this the moment the
trash behaviour landed, which is the argument for the smoke test.

---

## 017 — `[[wiki links]]` derive backlink rows on save

**Status:** accepted

Backlinks could be computed on read by scanning every note body for `[[Title]]`.
That is a full collection scan per note view, and the graph view would scan
everything at once.

Instead, `lib/wikilinks.ts` parses the links on every save and writes one
`Backlink` row per link, resolved to its target by title. "Referenced by" and
the graph then become indexed queries. A link to a note that does not exist yet
is kept unresolved and lights up when that note is created — in either order.

The cost is that a rename has to re-point the rows, which the save path does.
The alternative — storing links by title string only — would break the moment
a note was renamed.

---

## 018 — Code execution runs in node:vm, not Judge0

**Status:** accepted · **Revisit before:** multi-tenant launch

The BACKLOG said to decide this before starting the Practice Centre. The
decision: a learner's JavaScript runs in Node's built-in `vm` with a 2-second
wall-clock timeout, in `lib/runner.ts`. Not Judge0, not a container.

What it buys: real execution. Unlike the lesson's `exercised` gate — which is
self-reported and known-weak — a challenge is graded by actually running the
code against test cases, visible and hidden. `vm`'s timeout interrupts
synchronous runaway code, which is exactly what these challenges are.

What it does not buy: security isolation. `vm` is escapable by a determined
attacker. That is acceptable for a single-user tool and is **not** acceptable
the moment this is multi-tenant. `lib/runner.ts` is deliberately the only place
code executes, so the swap to Judge0 or a gVisor/Firecracker sandbox is one
file. The `submitCode` action calls `runChallenge`; nothing else does.

Only JavaScript runs. TypeScript challenges would need transpilation first, and
the `language` enum leaves room for it. Monaco is likewise deferred — the editor
is a monospace textarea with tab handling (DECISIONS 004); the executor, not
the editor, was the hard part, and it is real.

Every seeded challenge's tests are verified against a reference solution
through this same runner before shipping, and the executor itself has direct
coverage in `npm run smoke` — syntax errors, infinite loops, structural
comparison, and the `process`-is-hidden sandbox check.

---

## 019 — AI cost caps are enforced before the request, not after

**Status:** accepted · **Was:** BACKLOG "urgent before launch"

The BACKLOG flagged rate limiting as urgent and named the failure: one loop in
a client component running up a real bill. So `lib/ai.ts` holds a per-user,
per-day ceiling on both request count and dollar cost, and `checkCap` runs
*before* every model call — the chat route, the in-lesson tutor, everything.
Usage is recorded *after*, so the (N+1)th call reads the count the Nth wrote
and is refused. The ceiling cannot be bypassed from the client because the
client never holds the key; every call goes through a server route that checks
first.

Cost is tracked in micro-dollars to stay in integers. The caps ($2/day, 200
requests) are generous for one person and ruinous for a runaway, which is the
whole point. The AI home shows both meters.

---

## 020 — The AI streams, and the key stays on the server

**Status:** accepted

The tutor response is streamed as Server-Sent Events from `/api/ai/chat`, read
by a plain `fetch` in the client — no Anthropic SDK in the browser. That keeps
the API key server-only (so the cap is always enforceable) and makes the tutor
feel alive rather than frozen for ten seconds, which the BACKLOG asked for.

The context that makes this more than a link to ChatGPT is assembled in
`lib/ai-context.ts`: the user's editable memory plus whatever they have open —
lesson, project, note, or challenge. That is the one thing a general chatbot
cannot have, and it is the reason the module exists.

Memory (Chapter 8) is deliberately plain editable rows, not an opaque
embedding store — the user can read, pin, edit and delete every fact on the
memory page. A memory feature you cannot inspect is one you cannot trust.

---

## 021 — Analytics stores nothing of its own

**Status:** accepted

Every chart in the Analytics module is an aggregation over collections other
modules already write — StudySession, TimeEntry, LessonProgress, Task,
ChallengeAttempt. There is no `analytics` collection, because a second copy of
the numbers is a second thing to keep in sync and a second place for them to
disagree. `lib/queries/analytics.ts` is all reads.

Goals are the same: a goal stores its target and metric, and its *current
value* is measured live from the metric it names, in the period window. The
only exception is a "custom" goal, which is hand-incremented because there is
nothing to measure it against.

Habit streaks are derived, not stored as a running counter: the completed-days
set is walked backwards from today on every toggle, so the streak is correct
even if the app was closed for a week. Storing the counter would let it drift.

## 022 — Badges are data, and the calendar reads other modules' deadlines

**Status:** accepted

Achievement definitions live in `lib/achievements.ts` as rows with a metric and
a threshold; the engine re-evaluates them against real counts and the
`Achievement` collection only records what unlocked. Adding a badge is one line,
not a new branch. The sweep is idempotent (unique index per user+key), so it is
safe to run on any page load in the module.

The calendar shows explicit events *plus* deadlines that already exist
elsewhere — project milestones, scheduled interviews, reviews coming due — read
at query time, never duplicated. A deadline you have to copy into a second place
is one you will miss. Only user-created events are editable there; the pulled-in
items link back to where they live.

---

## 023 — The admin panel, and the first-user bootstrap

**Status:** accepted

`/admin` is guarded in one place — its layout — so every page under it is
protected by construction; a page cannot render without passing the guard. The
first account to sign up is made admin (`getCurrentUser` checks for zero users);
everyone after is a normal user until promoted.

Per DECISIONS 007, every admin action that crosses a user boundary writes an
`AuditLog` row before returning. Two guards worth noting: the last admin cannot
be demoted (locking everyone out of /admin is not recoverable from inside the
app), and content edited here changes what every learner sees, so it is the one
place writes are deliberately global.

## 024 — Search, settings and account deletion

**Status:** accepted

Global search (CTRL+K) is one query fan-out across the collections a developer
reaches for — lessons, notes, projects, challenges, snippets — scoped to the
user, capped per type, regex-backed. The Mongo text indexes are already defined
for when it outgrows regex; callers will not change. The palette is mounted once
in the shell and opens on the shortcut or the topbar button (via a window
event, so the two are decoupled).

`updatePreferences` whitelists every key into `preferences.*`; the smoke test
confirms `role` and `xp` cannot be smuggled through it. Account deletion is the
honest counterpart to data export: it removes every collection keyed to the
user and the user row itself, gated behind typing DELETE, and is covered by the
smoke test end to end (refused without the word, complete with it).
