# MVP scope — v0.1

> **Superseded.** This document describes the original five-module cut. The
> product has since been built out to all twelve modules of Chapters 1–11 —
> see the status note at the top of `BACKLOG.md` and the module table in
> `README.md`. This file is kept as the record of why the loop was built first:
> that reasoning still holds, and it is why Learning and the mastery gate are
> the load-bearing centre everything else hangs off.

## The cut

Chapters 1–10 specify 22 modules. v0.1 ships **five**, chosen so that one
complete loop works end to end:

```
Learn  →  Practise  →  Master  →  Review  →  Learn again
```

Everything in that loop is built. Everything outside it is in `BACKLOG.md`.

The alternative — starting all 22 modules — produces a project where nothing
is finished and nothing can be used. A loop that closes can be lived in, and
using it every day is the only way to find out which of the other 17 modules
actually matter.

## In scope

| Module | Shipped | Not shipped |
|---|---|---|
| **Auth** | Sign up/in, protected routes, per-user data | Roles, organisations, MFA config |
| **Dashboard** | Next lesson, stats, 14-day activity, revision queue, recent notes | Widget customisation, drag-and-drop, right panel |
| **Learning** | Roadmap, phase locking, skill pages, lesson pages, mastery gate, quizzes, XP, streak | Topic level, concept pages, video, interactive code, bookmarks, certificates |
| **Knowledge** | Markdown notes, lesson-attached notes, preview, edit, delete | Backlinks, graph, tags, collections, templates, snippets, versions, import/export |
| **Practice** | Per-lesson quizzes, spaced repetition | Code challenges, Monaco, execution, interviews, leaderboards |
| **AI** | In-lesson tutor with lesson context | Standalone chat, memory, code review, generators, history |

Not started at all: Projects, Career, Portfolio, Analytics, Admin, Settings,
Search, Notifications, Calendar, File manager, Resource library, Help centre,
Deployment centre, Whiteboard, System design, Teams, Community.

## Why these five

**Auth** — everything else needs a user id.

**Learning + the mastery gate** — the reason for the product to exist. Notion
does notes better, Jira does tasks better, LeetCode does challenges better.
Nobody enforces mastery. If this part is not good, no amount of Kanban makes
the product worth using.

**Notes** — the gate requires writing one, so it cannot be deferred. It is also
half of the Knowledge module for a fraction of the work.

**Review** — without it, mastery is a one-time event and the product is a
course platform. Spaced repetition is what makes it an operating system.

**AI tutor** — the single highest-value AI feature in Chapter 8, because it is
the one with context ChatGPT does not have. Built as the in-lesson panel rather
than a standalone chat for exactly that reason.

## What "done" meant

v0.1 was considered complete when a person could:

1. Sign up and land on a dashboard that tells them what to do
2. Open that lesson and read real material
3. Write a note that saves
4. Take a quiz that is graded honestly
5. Be *refused* mastery with a requirement outstanding
6. Be *granted* it once all five are met, and see XP and streak move
7. Come back the next day and find the lesson in the revision queue
8. Ask the AI about something they did not understand
9. Do all of it on a phone, in dark or light mode

All nine work.

## What v0.1 does not prove

Worth being clear about, because a working MVP invites over-confidence:

- **That the gate is the right five requirements.** It is a hypothesis. Using
  it for a month is the test.
- **That anyone else wants this.** One user is not validation.
- **That it scales.** Content is global, there are no rate limits, and no
  tests. All fine for one person, none fine for a thousand.
- **That the content model fits every subject.** Eleven lessons across five
  technologies is a small sample.

## Suggested next step

Use it daily for two weeks before writing any more code, and keep a note of
every point of friction. That list will be more useful than any of the tiers in
`BACKLOG.md`, because it will be about the product as it actually behaves
rather than as it was specified.
