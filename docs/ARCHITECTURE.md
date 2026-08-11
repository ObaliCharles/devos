# Architecture

How v0.1 is put together, and where new work goes. Read this before adding a
module — most of the mistakes available here are structural, not syntactic.

---

## Shape of the app

```
Browser
   │
   ├─ Server Components ──── read path ──── lib/queries.ts ──┐
   │                                                          ├── Mongoose ── MongoDB
   ├─ Server Actions ─────── write path ─── lib/actions.ts ──┘
   │
   └─ Route Handler ──────── /api/ai/explain ─────────────────── Anthropic API
```

Three rules that keep it that way:

1. **Reads go through `lib/queries.ts`.** Pages do not query Mongoose directly
   unless the query is trivial and used in exactly one place.
2. **Writes go through `lib/actions.ts`.** Every mutation is a server action.
   There is no `/api/notes` route, and there does not need to be — the client
   calls the function.
3. **Route handlers are for things that are not mutations of our own data.**
   Right now that is one thing: the AI call.

The only reason to add a REST route is an external consumer — a mobile app, a
webhook, a CLI. Note that in `DECISIONS.md` when it happens.

---

## Data model

```
Roadmap
  └── Phase          (order, locked when previous phase < 80% mastered)
        └── Skill    (difficulty, estimated hours)
              └── Lesson   (body markdown, objectives, exercise, quiz[],
                            learningObjectives[], sections[])

User (clerkId, xp, currentStreak, longestStreak, lastActiveDay)
  ├── LessonProgress  (state, gate{5 booleans}, quizScore)  — unique per user+lesson
  ├── Note            (title, body, optional lesson)
  ├── Review          (dueAt, step, lapses)                 — unique per user+lesson
  ├── Evidence        (skill, dimension, source, strength,  — append-only
  │                    verified, assistLevel)
  └── StudySession    (day "YYYY-MM-DD", minutes, counts)   — unique per user+day
```

### The structured lesson

`sections[]` is the typed replacement for a markdown `body`: a list of sections,
each holding a list of activities discriminated on `type`. **Mongoose stores,
Zod validates** — the activity payload column is `Mixed`, and `lib/lesson-schema.ts`
is the contract every writer parses through. Both fields coexist on purpose:
`sections` empty means "render `body`", which is every lesson authored before
this and needs no migration. Read stored sections with `readSections()`, never
by casting — documents written by earlier schema versions are expected, and it
drops what no longer parses rather than losing the lesson.

`learningObjectives[]` is the measurable form of `objectives: [String]`, which
stays and is still read. `checkObjective()` rejects "Understand APIs"
deterministically, with no model call, the way the ATS scorer grades a resume.

### Evidence, and why competence is a query

`Evidence` is append-only. Nothing anywhere stores "the current mastery level"
of a skill — `lib/competency.ts` derives it from the rows at read time, pure and
with no database, the way `lib/srs.ts` holds the review ladder. Unverified
evidence is halved and a self-report is worth a fraction of an assessment, so
ticking boxes cannot reach mastery; `mastered` also requires at least one
machine-verified artefact.

This is **separate from the mastery gate below**, which is unchanged. The gate
asks "did you do the five things for this lesson". Evidence asks "across
everything you have done, can you do this skill". Do not merge them — the first
is per-lesson and binary and has to stay that way.

Writes go through `lib/evidence.ts`, which is **not a server action and must not
become one** — see DECISIONS 026. Reads go through `lib/queries/competency.ts`;
use `getCompetencyMap()` for more than one skill rather than looping
`getSkillCompetency()`, for the same reason `getRoadmap()` is four queries.

Content collections are **global**. There is no owner on Roadmap, because there
is one user. That is the single biggest thing to change before this is
multi-tenant — see `BACKLOG.md` Tier 4.

### Why the day key is a string

`StudySession.day` is `"2026-07-22"`, not a `Date`. A date object forces you to
normalise timezones on every read and every aggregation, and gets it wrong once.
A string in the user's local day is unambiguous, indexes cleanly, and makes the
streak comparison a string equality check. The cost is that changing timezones
mid-streak behaves slightly oddly, which is an acceptable trade at this size.

### Why the gate is five booleans, not a count

A count tells you *how far*; the booleans tell you *which one is missing*. The
UI needs the second. Storing the count would also make the note gate impossible
to recompute from the notes themselves, which is what keeps it honest.

---

## The gate

The product claim is "you cannot mark it done until you can do it." That claim
is only true if the check is server-side, so it is, in exactly one place:

```ts
// lib/actions.ts
export async function masterLesson(lessonId: string) {
  const unmet = GATE_STEPS.filter((step) => !progress.gate[step.key]);
  if (unmet.length > 0) return { ok: false, message: ... };
  ...
}
```

The client disables the button as a courtesy. The server refuses as a rule.
**If you add a sixth requirement, add it to `GATE_STEPS` in `lib/models/index.ts`
and it is enforced everywhere automatically** — the gate component, the skill
page indicators and this check all read the same array.

Two of the five gates cannot be self-reported:

- `quizzed` is set only by `submitQuiz`, which grades server-side. `setGateStep`
  explicitly ignores it.
- `noted` is recomputed on every lesson render from `Note.countDocuments`, so
  deleting your notes reopens the gate.

The other three (`read`, `exercised`, `reviewed`) are self-reported. That is a
known weakness, listed in `BACKLOG.md`. Scroll-depth tracking would fix `read`;
only code execution fixes `exercised`.

---

## Query budget

`getRoadmap()` builds the whole tree in **four queries** regardless of size:
phases, skills, lessons, progress. It then joins them in memory with Maps.

This is deliberate. The obvious version — loop the phases, query the skills for
each, loop those, query the lessons — is the N+1 problem the PostgreSQL lesson
warns about, and it appears on the dashboard, which is the page that has to be
fast. Keep it at four. If the roadmap grows past a few hundred lessons, paginate
or project fewer fields before you add a fifth query.

`Lesson.find()` there uses `.select("-body -quiz")`. Lesson bodies are the
largest documents in the database and the tree does not need them.

---

## Where things go

| You want to add | Put it in |
|---|---|
| A new page in the app shell | `src/app/(app)/<name>/page.tsx` — layout, sidebar and auth come free |
| A new collection | `src/lib/models/index.ts`, with its indexes |
| A lesson activity type | `ACTIVITY_TYPES` + `ACTIVITY_META` + the union in `src/lib/lesson-schema.ts` — all three, or the renderer has a case it cannot handle |
| A mutation | `src/lib/actions.ts`, as a server action |
| A new source of skill evidence | a recorder in `src/lib/evidence.ts`, called from the action that grades it — never exposed to the client |
| A read used by more than one page | `src/lib/queries.ts` |
| A sidebar entry | `NAV` in `src/components/sidebar.tsx` |
| A colour, radius or font | `src/app/globals.css` — never a hex value in a component |

That last one matters. Every component reads `var(--primary)`, `var(--surface)`
and so on. One file changes the whole app's theme, and light mode works without
touching any component.

---

## Auth

`src/middleware.ts` protects everything except `/`, `/sign-in` and `/sign-up`.

`getCurrentUser()` in `lib/user.ts` resolves the Clerk session to a local User
document, creating it on first sight. Every server component and action calls
`requireUser()`. There is no other path to a user id — keep it that way, or
authorisation ends up in twelve places.

---

## Adding a module

Worked example, Projects:

1. Add `Project`, `Task`, `Milestone` to `lib/models/index.ts` with a `user`
   ref and the indexes you will actually query on.
2. Add `getProjects(userId)` and `getProject(userId, id)` to `lib/queries.ts`.
   Every query filters by user — do not rely on the caller.
3. Add `createProject`, `updateTask`, `moveTask` to `lib/actions.ts`. Start each
   with `const user = await requireUser()` and scope every write to `user._id`.
4. Create `src/app/(app)/projects/page.tsx` and `[projectId]/page.tsx`.
5. Add the sidebar entry.
6. Reuse `.card`, `.btn`, `.eyebrow`, `.input`, `prose-doc`. Do not introduce a
   second set of primitives.

The thing that makes Projects worth building — the link from a project to the
skill it practises — is step 1, not step 4. Model it first.

---

## Performance notes

- Every authenticated page is `force-dynamic`. They are all per-user, so there
  is nothing to cache statically. Revisit if a public portfolio ships.
- `serverExternalPackages: ["mongoose"]` in `next.config.ts` keeps Mongoose out
  of the bundler. Removing it produces confusing build errors.
- The Mongoose connection is cached on `globalThis` because Next reloads modules
  on every edit in dev. Without it you exhaust the connection pool in an hour.
- The AI response is not streamed. It should be — see `BACKLOG.md`.

---

## Testing

There are none, which is a real gap rather than a stylistic choice.

Start with `lib/actions.ts`. That file holds every rule the product makes:
the gate, the pass mark, the streak, the SRS ladder. A bug there is a broken
promise; a bug in a component is a cosmetic annoyance. `lib/srs.ts` is pure and
takes about ten minutes to cover completely.
