# DeveloperOS — what it is, and everything in it

A single-tenant-shaped, multi-user web application that tries to be the whole
operating system a self-taught developer runs their career on: learning,
practice, memory, projects, career, and the analytics that tie them together.

This document is the feature inventory. For *why* things are built the way they
are, read `DECISIONS.md`; for *how* to add to it, `ARCHITECTURE.md`; for the
UI rules, `DESIGN-HANDBOOK.md`.

---

## The thesis

Most learning platforms let you mark a lesson complete by clicking a checkbox.
That makes "progress" a measure of clicking, not of capability.

DeveloperOS's one non-negotiable idea is the **mastery gate**. A lesson cannot
be completed until five conditions are met:

| Step | Key | How it is satisfied |
|---|---|---|
| Read the lesson | `read` | Self-reported — scroll to the end |
| Write a note | `noted` | Recomputed from `Note.countDocuments` on every render |
| Do the exercise | `exercised` | Self-reported against an acceptance list |
| Pass the quiz | `quizzed` | Graded server-side, 80% or better |
| Review the summary | `reviewed` | Self-reported, final pass before the revision queue |

Two of the five cannot be faked. `quizzed` is only ever set by `submitQuiz`,
which grades on the server and which `setGateStep` explicitly refuses to
write. `noted` is derived from your notes, so deleting them reopens the gate.

The check runs in exactly one place on the server. The client disables the
button as a courtesy; the server refuses as a rule.

Everything else in the product hangs off this centre: practice drills it,
review re-tests it, knowledge stores what survived, projects apply it, career
sells it, analytics measures it.

---

## The core loop

```
Learn  →  Practise  →  Master  →  Review  →  Learn again
```

The sidebar is grouped by intent in the order the loop actually runs —
**Learn** (Learning, Practice, Review, Knowledge), **Build** (Projects, AI
Workspace), **Community** (Discussions, Chat, Arena), **Grow** (Career,
Analytics, Calendar), **System** (Settings, Admin).

---

## Feature inventory

### Auth and identity

- Clerk-backed sign up / sign in, with the widget themed from the app's tokens
- Every route protected except `/`, `/sign-in`, `/sign-up` and `/verify`
- Signed-out page requests redirect to sign-in **preserving the destination**;
  signed-out `/api` requests get a `401`, not a redirect to an HTML form
- Clerk sessions resolve to a local `User` document, created on first sight via
  an atomic upsert so a first-load race cannot crash the first page view
- Two roles, `user` and `admin`. The first account to ever sign up becomes the
  admin; everyone after is a normal user until promoted
- XP, level curve (each level costs 200 XP more than the last) and rank titles
  — Explorer → Builder → Developer → Engineer → Architect
- Daily streak, longest streak, and a `lastActiveDay` that only advances the
  first time you do something on a given day

### Learning — `/learning`

The structured path: **Roadmap → Phase → Skill → Lesson**.

- Phase locking — a phase stays shut until the previous one is 80% mastered
- Skill pages with difficulty, estimated hours and per-lesson gate indicators
- Lesson pages with markdown bodies, objectives, exercises and quizzes
- The five-step mastery gate, enforced server-side
- Server-graded quizzes at an 80% pass mark
- XP awards and streak advancement on mastery
- Real time tracking per lesson
- A table of contents, prev/next navigation, and lesson search
- **A 10-course catalog** across four tracks (Development, Data Science, Cloud,
  Security) — 31 modules, 92 lessons with full written content, not placeholders
- **AI curriculum generation** — give it a topic and a goal and it writes you a
  complete roadmap. Runs in two passes (outline first, then one content call per
  skill in parallel) so one bad token costs you one skill rather than the whole
  tree, streams its real progress as newline-delimited JSON, and is grounded in
  researched sources where it can find them. Capped per user.
- Browse, roadmap and discovery views; per-course project briefs and
  certification tracks

### Practice — `/practice`

- Coding challenges with **real execution** — your JavaScript actually runs
- **Run** executes the visible tests only, records nothing, and gives fast
  feedback while you work
- **Submit** runs every test including the hidden ones, so you cannot pass by
  hard-coding the visible cases
- Structural equality on results, so `[1,2]` equals `[1,2]`
- Captured `console.log` output for debugging, runtime timing, per-test verdicts
- Attempt history, best-tests-passed high-water mark, last code retained
- One-time XP on first solve, and a daily challenge
- Unlike the lesson exercise gate, "did it" here is decided by the machine

### Review — `/review`

- Spaced repetition on a fixed **1 / 3 / 7 / 14 / 30 / 60 day** ladder
- Remembered it → move up a rung. Forgot it → drop back two.
- Due times are set to 04:00, so "due today" means all day
- A revision queue on the dashboard, and lapse counts per item

### Knowledge — `/notes`

- Markdown notes with 3-second auto-save
- **`[[wiki links]]`** with real backlinks — rename a note and the links that
  point at it are rewritten
- A graph view of how notes connect
- Tags, collections, and full version history
- A 30-day trash rather than a destructive delete
- **Snippet vault** — saved code by language
- **Flashcards** with their own deck review
- Notes can attach to a lesson, which is what feeds the `noted` gate

### Projects — `/projects`

Each project links to the skills it practises — that link is the point.

- A creation wizard (goal, category, difficulty, stack, features, deadline, repo)
- **Kanban board** with hand-built drag-and-drop
- Milestones, and tasks with priority, tags, checklists, estimates and time spent
- **Bug tracker**
- **Deployment log**
- **Database designer** and **API endpoint documentation**
- Project chat, a team panel, and a discovery feed of other people's projects
- **Role-based collaboration** — viewer / contributor / maintainer / owner, with
  ordered ranks so a permission check is a comparison. Sub-resources are scoped
  to the *project*, not to whoever typed them, so a teammate can actually work
- Invites, membership, and per-project activity logging

### AI Workspace — `/ai`

- **Streaming chat** over Server-Sent Events, so the tutor appears word by word
- The assistant can see your workspace — lesson, project, note or challenge
  context is built into the system prompt
- **Editable memory** — facts about you that persist across conversations
- A **prompt library**
- **In-lesson tutor** with five modes: explain simply, explain as a staff
  engineer, give an analogy (and say where it breaks), list common mistakes, or
  answer a specific question. It is instructed never to hand over a finished
  solution to your exercise.
- **Two providers with automatic failover** — Anthropic first, Groq as fallback
  whenever the primary fails before streaming any text (which is exactly what an
  unbilled key looks like)
- **Per-user, per-day cost caps** — 200 requests and $2.00, checked before the
  request goes out and billed at each provider's real rate. Without any key
  configured the surface still loads and says so.

### Career — `/career`

- A **job-readiness score**
- **ATS resume builder** with a *deterministic* scorer — it does not call the
  model. Section presence, substance, and whether bullets are action verbs and
  numbers rather than prose. Score out of 100 with the findings that produced it,
  so the number is never mysterious.
- **Portfolio** generated from your real projects
- **Job application tracker** and **interview tracker**
- **Certificates** with public verification — codes are `DOS-XXXX-XXXX`, 40+ bits
  from a CSPRNG (not a counter, not `Math.random`), using an alphabet with the
  misread characters removed. `/verify` is public **by design**: a certificate
  only means something if a recruiter can check it without an account.
- **Freelance** — clients, invoices and income tracking
- Networking contacts and career goals

### Analytics — `/analytics`

- Time spent by kind (learning, practice, projects, focus)
- A **12-week contribution heatmap**
- **Goals** measured live against real activity, not self-reported
- **Habits** with streaks
- **Pomodoro / focus timer** with recorded sessions
- **Achievement badges** — data-driven definitions re-evaluated from your real
  counts across nine metrics, so adding a badge is one line

### Calendar — `/calendar`

Your own events plus every deadline the other modules generate — project
deadlines, milestones, reviews due.

### Arena — `/compete`

- Head-to-head coding duels against another person on the same challenge
- **Elo ratings** with a two-tier K-factor — 40 while provisional (under ten
  matches), 24 after, which is the smallest honest fix for placing new players
  without making every later match swing wildly
- Seasons, leagues, win/loss/draw records, streaks and peak rating
- Matches decided by solved-first, then time, then tests passed — so getting
  closer still counts. Ratings are computed from the rating stored at match
  start, so a match scored late produces the same numbers it would have on time.
- Casual mode plays without moving your rating

### Community

Two of the three sidebar entries **leave the app** — Discussions goes to GitHub
Discussions and Chat goes to Discord, on the reasoning that developers are
already signed in there and those platforms bring notifications, search and
moderation this app would otherwise have to build and run.

There is also a **fully built in-app community module** — a discussion feed,
threads with replies, reactions, bookmarks, accepted answers, groups with
membership, and group chat rooms (six pages, six models, ~580 lines of
actions and queries). It is currently **not reachable from navigation**; the
only links into it come from inside itself.

### Public profiles — `/u/[handle]`

A profile is **mostly earned, not typed**. Bio, links and self-declared skills
are optional garnish; level, streak, contribution graph, solved challenges and
shipped projects are computed from what you actually did — which is why a
profile with every text field blank still looks like something. Following is
supported.

### Admin — `/admin`

Visible only to admins, guarded server-side.

- User management and role promotion
- **Content and roadmap builder** — create phases, skills and lessons, edit
  lesson content
- **Feature flags**
- **Audit log** of every admin action

### Platform and settings — `/settings`

- Preferences, including light and dark themes
- **Full data export**
- **Account deletion**
- **Global ⌘K / CTRL+K command palette** searching lessons, notes, projects,
  snippets, challenges, certificates and roadmaps *and* the static course
  catalog — grouped by type rather than given a fake relevance score
- Notifications centre
- A saved **resource library**
- Help centre with support tickets

### Landing and marketing

A public landing page with a particle hero and site navigation, plus a
`/preview` route.

---

## What ships as content

| | Count |
|---|---|
| Courses | 10, across Development / Data Science / Cloud / Security |
| Course modules | 31 |
| Written catalog lessons | 92 |
| Catalog project briefs | 6 |
| Certification tracks | 5 |
| Seeded roadmap lessons | 11, with exercises, quizzes and acceptance lists |
| Seeded coding challenges | 6, with visible and hidden test cases |

---

## Architecture at a glance

```
Browser
   │
   ├─ Server Components ──── read path ──── lib/queries/* ──┐
   │                                                         ├── Mongoose ── MongoDB
   ├─ Server Actions ─────── write path ─── lib/actions/* ──┘
   │
   └─ Route Handlers ─────── /api/ai/chat, /api/ai/explain,
                             /api/ai/explain-topic,
                             /api/learning/generate, /api/search
```

- **Reads** go through `lib/queries/`, **writes** through `lib/actions/` as
  server actions. Route handlers exist only for streaming and for the search
  endpoint.
- Every action starts with `requireUser()` and scopes every write to `user._id`.
  Caller input is never spread into `$set`.
- **71 Mongoose models**, one file per domain behind a barrel. Every user-owned
  document has a `user` ref and an index that starts with it — authorisation is
  a filter, and a filter without an index is a scan.
- `getRoadmap()` builds the whole tree in **four queries** regardless of size,
  joining in memory with Maps rather than N+1-ing the dashboard.
- Day keys are strings (`"2026-08-12"`), not `Date`s, so streaks are a string
  comparison and aggregations need no timezone normalisation.

### Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · MongoDB +
Mongoose · Clerk · Anthropic API (with Groq fallback) · Zod.

The Kanban drag-and-drop, code editor, graph view, calendar and charts are all
hand-built on the design token system rather than pulled in as libraries.

### Design system

One accent colour, colour that carries meaning (green success, red error,
yellow warning), no decorative gradients or glow, cards for objects and lists
for density, one primary action per screen, and motion only to explain state
change. Every component reads `var(--primary)`, `var(--surface)` and so on —
one file changes the whole theme, and light mode works without touching a
component.

---

## Verification

`npm run smoke` drives **164 assertions** against a real throwaway database,
the way a user would: the gate refusing and then granting, notes and their
backlinks, the code executor grading real submissions, the AI cost cap refusing
an over-limit call, the admin guard, account deletion. It cleans up after
itself.

---

## Current state and known gaps

Honest notes, so this document is not marketing:

- **The code sandbox is not a security boundary.** `lib/runner.ts` uses Node's
  `vm`, which isolates but does not contain. It is a confirmed remote code
  execution path for any signed-in user and must move to a real sandbox
  (Judge0, gVisor, Firecracker) before this is exposed to untrusted users. The
  boundary is deliberately one file so that swap is contained.
- **`scoreMatch` in the Arena is an unguarded server action** — it has no auth
  check, unlike every function around it.
- Three of the five gate steps (`read`, `exercised`, `reviewed`) are
  self-reported. Scroll tracking would fix the first; only code execution fixes
  the second.
- `npm run lint` does not work — ESLint is not installed and there is no config.
- Content (roadmaps, lessons, challenges) is global unless it carries an
  `owner`. That is the seam multi-tenancy has to go through.
- The in-app community module is built but unlinked.
- `ARCHITECTURE.md` is in places out of date with the code it describes.