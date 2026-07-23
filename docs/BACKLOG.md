# Backlog

> **Status update.** Tiers 0–3 below have since been built. All twelve modules
> in Chapters 1–11 ship — Learning, Review, Practice (with real code
> execution), Knowledge (wiki-links, backlinks, graph, versions, snippets,
> flashcards), Projects, AI centre (streaming, memory, cost caps), Career,
> Analytics, Calendar, Admin, and the platform layer (settings, CTRL+K search,
> notifications, resources, help). `npm run smoke` covers them with 162
> assertions. What remains genuinely unbuilt is **Tier 4 — SaaS** (billing,
> multi-tenancy, teams, live collaboration, mobile app, plugin marketplace) and
> a handful of deep features noted in place below (Cloudinary uploads, Judge0
> for multi-tenant code execution, import/export, streaming everywhere). The
> original text is kept below as the record of the plan.

Everything specified in Chapters 1–10 that is **not** in v0.1, plus the gaps
v0.1 knowingly left inside the features it does ship.

The ordering is a recommendation, not a rule. The principle behind it: build
the thing that makes an existing feature better before building a new module.
A half-finished module is worth less than a finished one.

---

## Tier 0 — finish what is already here

Small, high value, all within the code that exists.

Already done, listed so they are not started twice:

- [x] **The gate now reacts to the note and the quiz** without a page reload.
      It previously stayed locked until you refreshed, which made the central
      feature look broken.
- [x] **Deleting a note reopens the gate.** The flag is recomputed from the
      notes on every write and re-checked inside `masterLesson`.
- [x] **Days are local, not UTC** — see `lib/day.ts`. The streak used to be
      wrong for anyone west of Greenwich.
- [x] **A mastered lesson stays mastered** when a checkbox is toggled after
      the fact, and re-mastering does not award XP twice.
- [x] **`npm run db`** — a local MongoDB with nothing to install.
- [x] **`npm run smoke`** — the whole loop, asserted against a real database.

- [ ] **Topic level.** Chapter 4 specifies Roadmap → Phase → Skill → **Topic** →
      Lesson. v0.1 collapses Topic. Adding it is one collection and one route,
      but touches `queries.ts`, so do it before the tree gets bigger.
- [ ] **Auto-save on notes.** Chapter 6 says every 3 seconds. v0.1 saves on
      blur. Debounce it.
- [ ] **Note version history.** Chapter 6. One `versions` collection, one
      snapshot per save, a restore button.
- [ ] **Tags on notes**, with a page per tag.
- [ ] **Lesson search.** Even a plain regex search over titles and bodies beats
      nothing. Mongo text index first, Atlas Search later.
- [ ] **Empty and error states everywhere.** Some pages have them, some don't.
      Chapter 3 is right that this is not polish.
- [ ] **Mobile navigation.** The sidebar is hidden below `md` with nothing in
      its place. Bottom nav, per Chapter 1.
- [ ] **Time tracking that is real.** `masterLesson` currently credits a flat 30
      minutes. Track actual time on the lesson page instead.
- [ ] **Skip to content link + full keyboard pass.** Chapter 3's accessibility
      list is only partly met.

---

## Tier 1 — the next module

Pick **one**. Projects is the strongest candidate: it is the second half of
"learn by building", and without it the roadmap ends in mid-air.

### Projects (Chapter 5)

- [ ] Projects home, create wizard, project workspace
- [ ] Tasks + Kanban with drag and drop
- [ ] Milestones and timeline
- [ ] Link a project to the skill it practises — this is the part no competitor
      has, and the reason to build it before a Kanban board that Trello already
      does better
- [ ] Files via Cloudinary
- [ ] Bug tracker, deployments, API and schema docs
- [ ] Project analytics

### Practice Centre (Chapter 7)

- [ ] Challenge model, browse and filter
- [ ] Monaco editor
- [ ] **Code execution.** The hard part. Nothing else in this module works
      without it. Judge0 or a sandboxed container — decide before starting.
- [ ] Test cases, hints, AI review
- [ ] Daily challenge, streaks, results, history
- [ ] Mock interviews

### Knowledge Base (Chapter 6)

- [ ] `[[wiki links]]` and automatic backlinks
- [ ] Graph view
- [ ] Daily / weekly / monthly notes
- [ ] Collections and templates
- [ ] Snippet vault
- [ ] Import from Obsidian and Notion; export to Markdown, PDF, DOCX

---

## Tier 2 — modules that need Tier 1 to exist first

### Career & Portfolio (Chapter 9)

Depends on Projects — a portfolio with nothing to show is an empty page.

- [ ] Resume builder + ATS analysis, export to PDF/DOCX
- [ ] Portfolio generated from projects, with themes
- [ ] Job application and interview trackers
- [ ] GitHub analyser, LinkedIn optimiser
- [ ] Freelance clients, invoices, income tracking

### Analytics (Chapter 10)

Depends on having enough events to analyse. Building it now would chart
almost nothing.

- [ ] Analytics dashboard, learning / project / practice / knowledge views
- [ ] Time tracking, focus sessions, Pomodoro
- [ ] Goals, habits, streak centre
- [ ] Heatmaps, reports, exports
- [ ] AI productivity insights
- [ ] Achievement engine (XP and levels exist; badges do not)

### AI Centre (Chapter 8)

v0.1 has the in-lesson tutor only.

- [ ] Standalone chat with conversation history
- [ ] Workspace context panel
- [ ] Prompt library
- [ ] Code review, debugger, project generator, roadmap generator
- [ ] Flashcard and quiz generators
- [ ] AI memory, with a page where the user can see and edit what is stored
- [ ] Streaming responses (currently the tutor waits for the whole reply)
- [ ] **Rate limiting and cost caps.** Do this before any public launch. One
      loop in a client component can cost real money.

---

## Tier 3 — platform

- [ ] Admin panel (Chapter 11, unwritten): user management, content CRUD,
      roadmap builder, audit logs, feature flags
- [ ] Settings module: profile, security, integrations, data export, delete
      account
- [ ] Global search (CTRL+K) and command palette
- [ ] Notification centre
- [ ] Calendar
- [ ] Global file manager
- [ ] Resource library
- [ ] Help centre

---

## Tier 4 — SaaS, if it gets that far

- [ ] Billing and subscriptions
- [ ] Multi-tenant content — right now the roadmap is global, which is fine for
      one user and wrong for a thousand
- [ ] Team workspaces, roles, organisations
- [ ] Live collaboration
- [ ] Public templates and community
- [ ] Plugin marketplace
- [ ] Mobile app
- [ ] Offline mode
- [ ] Multi-agent AI

---

## Known limitations in v0.1

Written down so they are decisions rather than surprises.

| Limitation | Why | Cost of fixing |
|---|---|---|
| Content is global, not per-user | Single user | Medium — add an owner to Roadmap and filter everywhere |
| No content editing UI | Seed script is faster for now | Medium — this is the admin panel |
| Fixed SRS ladder, no ease factor | Simpler and good enough | Small — swap the algorithm in `lib/srs.ts` |
| "Read the lesson" is self-reported | Scroll tracking is unreliable | Small — measure scroll depth and time |
| Exercises are not verified | No code execution | Large — this is the Practice Centre problem |
| AI is not rate-limited | Single user | Small, and urgent before launch |
| ~~No tests~~ | — | Done: `npm run smoke` covers the loop end to end. Rendering is still untested |
