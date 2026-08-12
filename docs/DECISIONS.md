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

## 025 — A lesson body becomes typed activities, and mastery becomes evidence

**Status:** accepted

Two changes that only make sense together, both additive.

**A lesson is a list of typed activities, not one markdown string.** Prose in a
`body` column cannot be seen into: the renderer cannot lay it out, the generator
has no target beyond "write an essay", and nothing a learner does inside a
lesson can produce a record, because nothing in the document knows it is an
exercise. `Lesson.sections` holds the structure and `lib/lesson-schema.ts` holds
the contract. `body` stays required and stays the whole lesson wherever
`sections` is empty, which is all 92 catalog lessons and every roadmap generated
before this — the two-field seam is what makes the change need no migration.

**Mongoose stores, Zod validates.** `activities` is a `Mixed` column because it
is a discriminated union of twenty-odd payload shapes, which Mongoose models
badly (its discriminators are per-collection, not per-subdocument) and Zod
models exactly. Defining the union twice, in two languages, is how the two
definitions drift, so there is one union and every writer — the generator, the
admin builder, the seed script — parses through it. Readers go through
`readSections`, which is lenient in the one place leniency is right: it is
reading documents written by earlier versions of the schema, and one activity
that no longer parses should cost that activity, not the lesson. Same
containment argument as the two-pass generator in 018's neighbour.

**The activity type decides what evidence it can produce.** `ACTIVITY_META` maps
each type to one of eight competency dimensions, or to `null` for the ones that
demonstrate nothing — reading a paragraph, writing a reflection. That table is
the join to `lib/competency.ts` and the reason competence can be *derived*
rather than authored.

**`Evidence` is an append-only log; competence is a query.** Nothing stores "the
current level" of a skill, because storing a level forces you to decide what
invalidates it, and the honest answer — forgetting — cannot be observed. So the
collection stores artefacts (this quiz, that commit, this teach-back, at this
time, with this much help) and `competencyFrom` derives the judgement at read
time. Two rules in the weighting carry the product's claim: unverified evidence
is halved, and a self-report is worth 0.15 against an assessment's 1.0, so no
amount of ticking boxes reaches mastery. `mastered` additionally requires at
least one machine-verified artefact; without that clause a diligent clicker
could self-report their way there and the number would mean nothing.

This does not touch the mastery gate. `GATE_STEPS` answers "did you do the five
things for this lesson", per-lesson and binary, and is unchanged. Competence
answers the larger question the gate structurally cannot: across everything you
have done, can you do this skill.

**The executing activity types are named so they can be gated.**
`coding_exercise`, `debugging_exercise`, `fill_in_code`, `interactive_example`
and `assessment` all run learner code, which today means `lib/runner.ts` —
Node's `vm`, isolation without containment, and per 018 a known RCE path.
Embedding them in lessons would take that surface from one page to every lesson
in the product, so `EXECUTING_ACTIVITY_TYPES` is exported for the renderer to
refuse until the sandbox behind `runner.ts` is a real one. The schema is
deliberately ready before the runtime is, rather than the other way round.

## 026 — Evidence is written by the grader, never by the client

**Status:** accepted

`lib/evidence.ts` has no `"use server"` directive and is not re-exported from
the actions barrel, deliberately. Every function in it takes `verified`,
`strength` and `dimension` and writes them; if any were reachable as a server
action, a client that can post `{ verified: true, strength: 1 }` in a loop
reaches mastery without opening a lesson, and the whole competency model becomes
decorative. The smoke test asserts the exported surface stays clean, because
this is the kind of property a later refactor breaks silently.

The callers are the four places that have already graded something server-side
and therefore know the truth about it: `submitQuiz`, `submitCode`,
`gradeReview`, `setGateStep`. The rule for adding a fifth is the rule the
mastery gate already follows — if a human asserted the outcome, `verified` is
false; only a machine's verdict sets it true.

Three consequences worth stating:

**Recording is best-effort.** Evidence is a derived record of something that
already happened. A failure writing it must not fail the action that triggered
it, or a bookkeeping error costs the learner the XP and the gate they earned.
Every recorder runs inside `safely()`.

**Failures are recorded, not just successes.** A quiz at 40% and a submission
that passes 3 of 12 tests are real facts about what was known that day, and the
diminishing returns in `competency.ts` are what handle repetition — not
refusing to write the row. A log of only successes cannot answer "am I actually
improving".

**`read` and `reviewed` record nothing.** Reading a page demonstrates nothing,
which is exactly what `ACTIVITY_META` says about `text` and `reflection`; the
two files agree on purpose. `exercised` does record, as a self-report at 0.15
weight halved for being unverified — weak evidence rather than none.

### The assist level has no default

`Evidence.assistLevel` is optional with **no default**, and `independenceFrom`
excludes rows that lack it rather than counting them as unaided. Defaulting it
to 0 would report every learner as 100% independent from the day this shipped —
a flattering number produced by measuring nothing, on the one metric the product
exists to move. Nothing writes it until the hint ladder lands, so `sample` is
honestly 0 today and callers must check it before drawing anything.

## 027 — The lesson reader renders activities client-side, and never writes evidence

**Status:** accepted

`components/learn/activity-renderer.tsx` and `lesson-reader.tsx` are the first
consumer of the schema from DECISIONS 025 — the renderer Chapter 5 and the
design brief's §7–9 both describe. Two decisions carried over from the schema
layer, now made concrete in UI:

**No answer here ever calls `recordEvidence`.** Every activity — multiple
choice, fill-in-the-code, teach-back — is `useState` that resets on refresh.
This is DECISIONS 026 holding at the last mile: evidence is written only by
code that has already graded something server-side, and a client click has not
been graded by anyone. What these activities give instead is *formative*
feedback — right/wrong, a rubric to compare against — matching Chapter 5's
"Interactive Understanding" step, which sits before assessment. The lesson's
real evidence still comes from exactly the three places it always has: the
Requirement 4 quiz, the exercise gate, and graded code once the sandbox exists.
Nothing new competes with those, and nothing new inflates a competency score.

**The executing activity types render locked, not hidden.** `coding_exercise`,
`debugging_exercise`, `interactive_example` and `assessment` need to actually
run learner code, which today means `lib/runner.ts` — the documented RCE path
from DECISIONS 018. `EXECUTING_ACTIVITY_TYPES` from `lesson-schema.ts` is
checked at render time; those activities show their brief (the reading value
survives) with the run action disabled and a plain explanation, rather than
being generated and then discovered broken. This is the schema's own promise —
written into DECISIONS 025 before any renderer existed — being kept literally.

**The seam is additive, and proven in the render, not just the model.** The
lesson page now branches on `readSections(lesson.body's sibling field)`: sections
present renders the structured reader, empty falls back to the markdown card
exactly as before. `npm run smoke` (246/246) confirms the existing gate/quiz/
review loop is unaffected, and a standalone fixture check confirmed all 22
activity payload shapes assumed while writing the renderer actually satisfy the
Zod union — the TypeScript exhaustiveness check (`const _exhaustive: never`)
additionally guarantees the switch in `ActivityRenderer` has a case for every
member of the union, so a future activity type added to the schema without a
render case fails the build rather than rendering nothing silently in
production.

**The section rail replaced the markdown-derived TOC, for structured lessons
only.** `lesson-toc.tsx`'s heading-scraping TOC is unchanged and still serves
every lesson with no `sections` — including all 92 catalog lessons. A
structured lesson gets a truer rail instead: one entry per authored section, in
`SECTION_LABELS`' vocabulary (Orientation, Concept, Guided Practice, ...) rather
than whatever happened to be an `h2`. The two coexist rather than one replacing
the other, because they are answering the same question from two different
kinds of document.

## 028 — The dashboard leads with a mission, not a stat row

**Status:** accepted

The dashboard already computed the right things — a real next lesson, a real
due-review count, a real weekly delta — but presented them as three
equal-weight cards (Continue / Path / Today) with the four headline numbers
*above* all of them. Three problems followed from that layout rather than from
the data: there was no single primary action (Resume, in one card, and a list
of un-checked-off rows, in another, both said "start something"); the numbers
led before the action did, which is backwards for a product whose one
non-negotiable idea is capability over completion; and the Today list rendered
an empty checkbox square in front of every row that did nothing when clicked —
a decoration implying an interaction the product does not have, the same
mistake this codebase's own principles already rule out for fake badges and
meaningless streaks.

The restructure is presentation only — no query changed, nothing new is
computed. Today's three real signals (next lesson, due reviews, a practice
suggestion) become one full-width mission panel, first under the greeting, with
one primary action ("Start", to the first item) and a numbered list beneath it
— numbers that are real sequence information, not decoration, since this is the
order to do them in. The fake checkbox is removed rather than rebuilt into a
working one: a per-mission-task completion model is Today-engine scope (learning
upgrade spec §8–9), not a styling pass, and a decoration that cannot yet do what
it implies is worse than no decoration.

Continue and Path move below the mission as supporting detail — Continue is the
mission's first item, expanded. The four-tile signal row becomes a `StatRow`
(DECISIONS' neighbour on `Section`/`StatRow`, Design Phase 4) and moves below the
action band, since a number is not the day's headline. `Stat` takes one value,
not a value-plus-unit pair the way the old tile did, so units are folded into
the value string here exactly as `/analytics` already does ("8h", not "8" with
a separate "hrs") — dropping a unit silently would have been a real information
loss on the streak, hours and XP readings.

Mobile (`components/dashboard-mobile.tsx`) is unchanged in this pass; it already
leads with a different pattern (a Continue hero, Today further down) that has
the same "which card is primary" ambiguity and is a separate piece of work.

## 029 — The landing page loses the particle field and its invented numbers

**Status:** accepted

Two unrelated problems on one page, fixed together because both come down to
the same rule: show the real thing, not an effect or a number standing in
for it.

**The particle hero is gone.** It was flagged in the Phase 1 design audit as
a direct conflict with the design handbook — an interactive particle field
with a four-second idle auto-drift (sine/cosine motion that never stops) and
a radial glow wash behind the headline. `CLAUDE.md`'s own list of "rules that
get violated most often" names this pattern outright: no decorative glow, no
infinite motion. The engineering in `particle-hero.tsx` was genuinely good —
one `requestAnimationFrame` loop instead of 225 per-particle timers, tokens
instead of a hard-coded red palette, `prefers-reduced-motion` honoured — none
of that changes what it is. The fix was not to tune it down; the handbook does
not carve out an exception for a well-built version of a banned pattern. The
component file stays in the repo unused rather than deleted, since nothing
else references it and it may find a legitimate one-off use later; `app/page.tsx`
just stops importing it.

What replaced it is what the learning-upgrade spec's §19–20 actually asked
for and the handbook's §19 permits without qualification: the product's own
UI. `DashboardPreview` — a faithful static rendering of the app's dashboard
chrome — was already written and never rendered anywhere; it is now the hero's
visual, directly under the headline.

**The stats and journey cards were inventing numbers.** "15+ Learning
Journeys", "200+ Projects", "50+ Achievements" and four persona cards each
claiming a specific mission/project/achievement count (28 missions, 15
projects...) did not correspond to anything `lib/catalog.ts` contains. This is
the same failure mode the dashboard restructure (DECISIONS 028) already named
and fixed once — "a dashboard of plausible-looking fake numbers is the single
fastest way to make a product untrustworthy" — except here it is worse: a
signed-out visitor has no way to check the claim before signing up, so the
first thing they can verify against the product is finding out the homepage
was wrong.

Fixed by computing every number from the catalog: total courses, lessons,
practice challenges and certification tracks for the stat row; and the four
real tracks (Development, Data Science, Cloud, Security) with real per-track
course/lesson/hour counts in place of the four fabricated personas. The
persona framing survives in "Choose your path", because that section makes no
numeric claim — it is advertising the AI roadmap generator, which really can
build a path for "AI Engineer" or any other goal typed in. A line was added
making that distinction explicit, since it now sits directly under a section
that *is* fixed catalog content and the two could otherwise read as the same
kind of claim.

**What was deliberately left alone:** `ProgressPreview`'s illustrative activity
feed ("Alex", "2 hours ago", "36% Overall") is a mocked-up screenshot of what
the product looks like in use, the same convention every SaaS marketing page
uses for a sample dashboard — it does not claim to be a platform aggregate the
way "15+ Learning Journeys" did, so it is not the same problem and was not
rewritten.

## 030 — Roadmap and Practice needed no changes; Projects got the one real fix

**Status:** accepted

Design Phase 10 targeted three surfaces. Two turned out to already be
correct, which is worth recording so the next pass does not re-litigate them.

**`/learning/roadmap`** has no stat-tile row and no card wrapping a region that
is not an object. `CourseCatalog` already draws the phase/skill tree the right
way: a phase is a plain `<section>` with a text header, never boxed, and only
a skill — which really is an object, a specific course with its own progress —
gets `.card`. This is the exact distinction `Section` was built to enforce,
arrived at independently before `Section` existed.

**`/practice`** likewise needed nothing. Its own header comment already states
the rule this whole design pass is built around — "The summary tiles that used
to sit here are gone... putting one above the challenges said the numbers
mattered more than the practice" — and `ChallengeLibrary`'s says "every number
on a card is a real count. A library nobody has attempted shows no solve rates
rather than a fabricated 82%." Both are the DECISIONS 028/029 principle,
applied here before either of those was written. The remaining `.card` uses
(This week, Topics, Activity, Recent submissions) are kept deliberately: they
sit in a dense multi-panel grid, not a single reading column, and adjacent
unrelated panels in a grid need a visible edge to disambiguate them — the same
reasoning DECISIONS 028 already used to keep Continue/Path as cards on the
dashboard rather than converting them to bare sections. Converting every
`.card` on sight, regardless of layout, would have been the mechanical pass
§33 of the design brief warns against ("consistency does not mean every page
should be a clone").

**`/projects`** had the one real instance of the pattern: four `StatTile`
cards in a row, above the fold, each carrying one number and a now-decorative
icon — identical in shape to the rows already fixed on `/analytics` and the
dashboard. Converted to `StatRow`/`Stat`, semantic colour kept on the bugs
reading (`tone="danger"`/`"success"`, real state, not decoration). `Clock` fell
out of the icon imports as dead code once its only remaining use — the removed
tile's icon — was gone.

## 031 — The route audit found one more real instance, and one that looked like one but was not

**Status:** accepted

Design Phase 11 swept every route for the patterns DECISIONS 028–030 already
named — hex colours outside a token, sub-12px text, stat-tile rows — rather
than opening all 73 pages individually.

**`/admin`** had the fourth instance: six `StatCard` tiles across two grids
(Users/Lessons/Challenges/Projects, then Notes/AI spend), same shape as
analytics, the dashboard and `/projects`. Converted to `StatRow`/`Stat`.

**`/career`** looked like a fifth instance and is not one. Its four `StatTile`
cards (Resume/Portfolio/Applications/Certificates) carry `href` — each is a
real link into its own module page — and heterogeneous values: a percentage, a
publish state, two plain counts. `StatRow`/`Stat` has no link affordance and
represents homogeneous readings of one thing, which this is not. These are
closer to the project cards on `/projects` — distinct objects with their own
identity and destination — than to a row of numbers being compared. Converting
them would have cost real navigation for a resemblance in class name only, so
they stay `StatTile`.

**A known, deliberately unresolved gap:** `StatRow`'s divider CSS clears the
leading border with `:first-child`, which is correct for exactly one row.
`/admin`'s six-item row can wrap to two rows of four at tablet content widths
(roughly 641–840px, the range below where `auto-fit`'s 140px-minimum columns
stop fitting six across and above the 640px mobile breakpoint that switches to
an explicit 2-column layout), and when it does, the fifth item — first in row
two — keeps a left border with nothing to its left. A fix was drafted (fixed
column counts per breakpoint instead of `auto-fit`, so "first in row" becomes
`nth-child(4n+1)` and is correct for any row length, full or partial) and not
applied — it touches a primitive shared by four pages for a cosmetic edge case
in one specific viewport band. Left as a known limitation rather than pushed
through; the correct fix is recorded above if `/admin`'s stat count or another
consumer makes it worth doing.

**Audited and confirmed already correct, changed nothing:** `/learning/roadmap`
and `/practice` (DECISIONS 030). Full audit surface: hex colours (18, all
accounted for — Clerk's theming API, the browser `theme-color` meta, real
language brand marks, and `global-error.tsx`'s necessarily-inline styles, none
of them a token violation), the 12px type floor (0 violations codebase-wide),
loading/error boundary coverage (29 `loading.tsx` / 10 `error.tsx`, both up
from Phase 5 by exactly the files added there, no regression).

Verified: `tsc --noEmit` clean, `npm run smoke` 246/246. The production build
could not be verified in this pass — `next/font`'s fetch to the Google Fonts
CSS endpoint failed repeatedly in this sandbox despite the host itself being
reachable by a plain request, an environment condition unrelated to anything
in this diff (`app/layout.tsx`'s font imports are untouched this session).

## 032 — The hint ladder is the first thing to give the independence metric a real number

**Status:** accepted

Learning-spec Phase 2 is six items (tutor state, hint ladder, dependency
tracking, planning assistant, teach-back, AI-free mode). This is the first
slice — the hint ladder alone — chosen because it is the one piece the rest of
Phase 1 was already waiting on: `independenceFrom` in `lib/competency.ts` and
`getIndependence` in `lib/queries/competency.ts` have existed since Phase 1b,
correctly reporting `sample: 0` because nothing in the product had ever
written a real `assistLevel`. The hint ladder is that writer.

**Progression is enforced server-side, not just offered client-side.**
`lib/hint-ladder.ts` is pure — a level, an instruction, and
`nextAllowedLevel`/`isLevelAllowed` — and `requestExerciseHint` in
`lib/actions/learning.ts` checks a requested level against the deepest level
already reached on `LessonProgress.hintLevel` before it will spend a model
call. This is the same split the mastery gate already uses: the UI only ever
offers "one more rung", so a normal session never hits the refusal, but the
refusal exists because a request is a request, not a click, and skipping
straight to "give me the full solution" for a two-word question is exactly the
failure mode a hint ladder exists to prevent.

**The level is stored on `LessonProgress`, not on a new collection**, because
it is scoped to exactly the thing `LessonProgress` already scopes everything
else to — one user, one lesson, the current attempt at its exercise. It resets
to 0 the moment `exercised` flips false→true (the same transition that already
fires `evidenceFromExerciseClaim`, per DECISIONS 026), so redoing an exercise
later starts the ladder fresh rather than inheriting today's assistance
forever.

**The connection to evidence is one changed call site.**
`evidenceFromExerciseClaim` now takes an optional `assistLevel`, read from
`hintLevel` at the exact moment it is about to be reset. An unaided claim still
writes `assistLevel: undefined`, not `0` — DECISIONS 026's rule holds:
"not measured" and "measured and found to be zero" are different claims, and
`independenceFrom` already excludes the former rather than counting it as the
latter. What changes is that a *hinted* claim now writes a real number for the
first time since the metric was built.

**Deliberately out of scope for this slice**, each a separate follow-up:
coding-challenge hints (the ladder only reaches lesson exercises; challenges
have their own attempt/evidence path and would need their own wiring), hint
text persistence (a returning learner sees the level they reached but not the
prose — refreshing loses the text, matching how the general tutor already
behaves, not a new gap), and any UI surfacing of `getIndependence` itself
(no analytics view renders it yet — this slice only guarantees it now has
something real to show once one exists). The remaining five items of Phase 2 —
tutor state, planning assistant, teach-back grading, AI-free mode
enforcement — are unbuilt.

Verified: `tsc --noEmit` clean (app and smoke config, modulo the pre-existing,
unrelated Clerk typing errors in `middleware.ts` noted since Phase 1a),
`npm run smoke` 264/264 (up from 246 by the 18 assertions this adds — 9 pure
ladder-logic checks, 9 database-backed checks covering the skip-refusal, the
evidence connection, the unaided/hinted distinction, and the independence
metric receiving its first non-zero sample).

## 033 — Generated lessons finally produce their own sections, in a wire shape too small to fail

**Status:** accepted

Since DECISIONS 025 this has been the standing gap: the structured lesson
schema and its renderer existed, but nothing populated `sections` on a real
lesson — not the catalog (92 hand-authored lessons predate the model), not the
seed data, and not the AI generator. The entire lesson reader from Phase 1c
was correct and untestable in the running app at the same time. This closes
it from the generator's side.

**The model is not asked for `Section`/`Activity` JSON.** `Activity` is a
23-variant union; asking a model already writing a body, a quiz and tasks for
two or three lessons per call to also produce that shape reliably is asking
for the exact failure mode `roadmap-gen.ts`'s own top comment describes — a
good start that drifts on a nested shape, and Zod rejecting the whole lesson
for it. Instead Pass 2's wire shape gained four small, flat, independently
optional fields: a `pitfall` paragraph, one `check` question, one `reflection`
prompt, and one `{dimension, cognitiveLevel}` tag per objective.
`lib/roadmap-gen-sections.ts` — pure, no network — turns that into real,
validated `Section[]`/`Objective[]`, parsed through the actual
`Section.safeParse`/`Objective.safeParse` lesson-schema.ts defines rather than
trusted. A malformed `check` (too few choices, say) is dropped; the pitfall and
reflection either side of it are not.

**Deliberately narrow, on purpose.** Three activity types requested
(`callout`, `multiple_choice`, `reflection`), not the full 22 — and none of
the four executing types, which would render `Locked` today regardless (per
DECISIONS 027) and so would only spend tokens on content nobody can use yet.
Every generated lesson still gets exactly the `body`/quiz/tasks it always has;
the additions are strictly on top, and a lesson whose extras never came back
or failed validation renders exactly as it did before this shipped — same
two-field seam as DECISIONS 025, now visible from both the schema side and the
generator side.

**The formative `check` is not the graded quiz.** They are two different
questions on purpose: the existing `quiz` is Requirement 4 of the mastery gate
and stays exactly as it is; `check` lives inside the reading flow as an
ungraded, local-only comprehension check, per DECISIONS 027's rule that
nothing rendered by `ActivityRenderer` writes evidence.

Verified: `tsc --noEmit` clean, `npm run smoke` 277/277 (up from 264 by the 13
assertions this adds, all against the pure transform — the actual model call
in `generateRoadmap` remains untested by smoke, as it always has been, since
it needs a configured provider and a network call neither CI nor this sandbox
reliably has).

## 034 — The diagnostic is reachable, not mandatory, and produces skill-less evidence

**Status:** accepted

Learning-spec Phase 1's last unbuilt piece. §44 calls this the actual first
step of the product's most important test — "what do I know?" before
anything else — and until this shipped a new signup went straight to picking
a roadmap with the system knowing nothing real about them. Like the hint
ladder, this is the second feature this rewrite has built specifically to
give an already-anticipated, already-unused piece of infrastructure its first
real writer: `EVIDENCE_SOURCES` has included `"diagnostic"` with its own
`SOURCE_WEIGHT` since Phase 1a, and `User.onboardedAt` has existed, set
nowhere, since before this rewrite began.

**Reachable, not forced.** There is no middleware gate. `middleware.ts`'s
public-route list is unchanged, and no new redirect sends a fresh signup here
before they can do anything else. A hard gate is a real product-behaviour
change — friction on every future signup, a new failure mode if the page ever
breaks — and is not this change's decision to make unilaterally. `/diagnostic`
is a real, complete, working page, linked wherever the product chooses to
surface it.

**Eight questions, four dimensions, no Planning.** Every question is one of
the *existing*, already-validated `Activity` shapes from `lesson-schema.ts` —
`multiple_choice`, `code_tracing`, `fill_in_code` — not a parallel question
format invented for this one feature, and machine-gradable the instant it is
submitted, no round trip to a model. Coding and debugging are asked as
*predict* and *diagnose* rather than *write and run*, so none of it waits on
DECISIONS 018's sandbox. Planning is deliberately not one of the four tested
dimensions: none of the eight real competency dimensions is "planning
ability", and the spec's own §13 gives planning its own AI-reviewed workflow
(Phase 2's still-unbuilt planning assistant) — testing it here would produce a
number force-fit to a dimension it does not belong to.

**`Evidence.skill` is now optional, for exactly this one case.** A diagnostic
happens before a learner has a roadmap, so its evidence cannot be scoped to
any Skill document — and forcing one would either block the feature entirely
or invent a fake skill to hang it on. The alternative kept: every skill-scoped
query (`getSkillCompetency`, `getCompetencyMap`) filters *by* skill, so a
skill-less row simply never surfaces there — asserted directly in smoke,
because "does diagnostic evidence quietly inflate some unrelated skill's
score" is exactly the kind of bug that would not announce itself. Reading it
back is `getDiagnosticProfile` in `lib/queries/competency.ts`, which derives a
`Competency` from `source: "diagnostic"` evidence with no skill filter at
all — the same `competencyFrom` every other reading in the product already
uses, not a parallel scoring path.

**The free-response question is honestly unverified.** It is not machine-
graded, so it is recorded as `source: "self_report"` (DECISIONS 026's weight,
not the diagnostic's) rather than inflating trust in something nobody
checked — and a trivially short non-answer ("idk") is not recorded as an
attempt at all.

**Retaking is idempotent on the date, not on the evidence.** Evidence is an
append-only ledger, so a retake writes fresh rows exactly like the first
attempt; `onboardedAt` only ever gets set once, so a retake cannot look like
someone's "first diagnosed" date moved.

Verified: `tsc --noEmit` clean, `npm run smoke` 309/309 (up from 277 by 32
assertions — 16 pure grading-logic checks including the deliberately-mixed
half-right-half-wrong submission, and 16 database-backed checks covering the
full submit → evidence → profile round trip, the skill-isolation property,
and the idempotent onboarding timestamp).

## 035 — The tutor is told the learner's mastery and dependency, shared by every AI touchpoint

**Status:** accepted

Learning-spec §10 lists what the tutor must know: current mastery, AI
dependency, learning history, alongside what it already knew (the lesson,
memory, the project in front of them). The AI context builder had none of
the first two — every recorded competency and independence signal built in
Phase 1 and by the hint ladder existed in the database and was invisible to
the model answering questions about it.

**One function, two callers, not two guesses at the same phrasing.**
`learnerStateSummary()` in `lib/ai-context.ts` is the shared "mastery +
dependency" paragraph. `buildSystemContext` (the concept tutor behind
`/api/ai/explain`) and `requestExerciseHint` (the hint ladder) both call it
and append the result to their own prompt, rather than each inventing its own
version of "how do I tell the model this learner leans on full solutions." It
is deliberately *not* folded into `buildSystemContext` as the only caller,
because the hint ladder's prompt is already tight and level-specific —
pulling in memory and full lesson bodies alongside it would dilute the one
instruction that actually matters at that point, the current hint level.

**Both halves are silent by default, not zero by default.** A skill with no
evidence yet produces no competency sentence at all — there is nothing to
report, and reporting "0% competent" would read as a judgement the data does
not support. The independence share stays quiet below a sample of 10, reusing
the exact threshold `Independence.sample`'s own doc comment already
established in Phase 2a rather than inventing a second number: fewer graded
pieces than that do not mean anything, and telling a model "62% independent"
off two data points would be steering its behaviour on noise.

**The dependency signal changes actual behaviour, not just phrasing.** Over
30% of recent work shown a full solution or strategy: the tutor is told to
favour the lower rungs of the hint ladder and ask what has been tried. Over
60% solved unaided: told a small nudge is enough, do not over-explain. This is
§12's own remediation list ("if dependency increases, reduce direct
solutions...") expressed as an instruction the model actually receives, not a
metric that only ever gets displayed.

Verified: `tsc --noEmit` clean, `npm run smoke` 317/317 (up from 309 by 8
assertions covering both silent-by-default cases, the skill-isolation
property — evidence for one skill must not leak into a summary requested for
another — and both dependency-guidance branches).

## 036 — Teach-back is graded, and is the one exception to "the reader writes no evidence"

**Status:** accepted

`EVIDENCE_SOURCES` has carried `"teach_back"` at a real weight (0.8, the same
tier as a project or a challenge submission — second only to a full
assessment) since Phase 1a. Nothing wrote it. Same shape of gap as the hint
ladder and the diagnostic before it: infrastructure built ahead of its first
real writer.

**The generator did not produce teach-back activities either, so this shipped
as two changes, not one.** Grading something nothing generates would have
been the same unreachable-feature problem `sections` itself was before
DECISIONS 033 — a correct code path with nothing real to exercise it.

**One teach-back per skill, not per lesson.** Unlike `pitfall`/`check`/
`reflection` (asked once per lesson, in `SkillContent.lessons[]`),
`teachBack` is a new *skill-level* field in Pass 2's reply, attached in code
to only the skill's last lesson. Chapter 5 is explicit that not every lesson
needs every activity, and a teach-back is described as the rarer, stronger
kind of evidence — asking for one per lesson would have both bloated Pass 2's
JSON (more surface area for the exact truncation failure `roadmap-gen.ts`'s
own top comment exists to avoid) and produced three teach-backs per skill,
diluting the one that matters. The prompt is explicitly allowed to answer
`null` — a single-fact or pure-syntax lesson has no core idea worth teaching
back, and forcing one there would be worse than skipping it.

**`extractJson` moved to `lib/ai-json.ts`.** It was private to `roadmap-gen.ts`
until `lib/actions/teach-back.ts` needed the exact same tolerant-JSON-from-a-
model-reply parsing for the exact same reason. Shared once two call sites
needed it, rather than a second slightly-different regex growing independently.

**Teach-back is now the one deliberate exception to DECISIONS 027's rule.**
Every other activity in `ActivityRenderer` is `useState` that resets on
refresh, because a client click has not been graded by anyone. A teach-back is
different in kind: §29 calls it "stronger evidence than reading", and judging
a real written explanation against a rubric is comparable in rigor to a
challenge submission, not to picking a multiple-choice option. `gradeTeachBack`
in `lib/actions/teach-back.ts` is a real server action; `TeachBack` in
`activity-renderer.tsx` calls it and is the reason `ActivityRenderer` now
takes a required `lessonId` prop that every other activity type ignores.

**"Verified" here means "a machine decided it", the same sense DECISIONS 026
already uses — not "deterministically exact".** Every other `verified: true`
row in the product comes from an exact match: a quiz answerIndex, a test
suite's pass/fail, the diagnostic's string comparison. An AI grading free text
is a real machine decision but a probabilistic one, and that distinction is
exactly what the pre-existing 0.8 source weight already prices in — below a
challenge's or an assessment's 1.0, above a quiz's 0.5. Marking it unverified
instead would have wasted a weight tier that was already sitting there
calibrated for precisely this.

**Grading failure degrades to the local rubric reveal, not a dead end.** No
provider configured, or the model returns something unparseable: the score is
lost, not the exercise — the learner can still compare their own answer
against the rubric by eye, matching how a failed AI-generated lesson body
already falls back to something real rather than nothing (DECISIONS 025's
"a fallback is worse than none" reasoning, applied here to a UI failure rather
than a generation one).

**Not smoke-tested end to end, on purpose, for the same reason `generateRoadmap`
and `requestExerciseHint` are not.** A real Anthropic key happens to be present
in this sandbox's `.env.local`, and it was tempting to use it — but the smoke
suite's reliability must not depend on incidental environment state a CI run
or another machine will not have (DECISIONS 032/033's precedent). Only the
guard that returns before any network call (`gradeTeachBack` on an empty
answer) is asserted.

Verified: `tsc --noEmit` clean, `npm run smoke` 322/322 (up from 317 by 5 —
3 covering the new skill-level `teachBack` extra's containment, including that
an empty rubric is dropped rather than sent through with nothing in it, and 2
covering the pre-network guard).
