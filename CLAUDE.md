# DeveloperOS

## Design

**Read [docs/DESIGN-HANDBOOK.md](docs/DESIGN-HANDBOOK.md) before writing or changing any UI.**
It is the authoritative reference for this product's design decisions — identity,
decision framework, visual system, layout architecture, components, motion, and
learning experience.

The rules that get violated most often:

- Inspect and reuse existing components and design tokens before creating new ones.
- No decorative gradients, glow, glass, floating/pulsing animation, or infinite motion.
- Cards represent objects (course, challenge, project, discussion) — not every piece of information. Prefer lists for density.
- One brand accent. Color must carry meaning (green = success, red = error, yellow = warning).
- Every screen has one primary action; supporting and background information stay visually quieter.
- Motion explains state change only. 100–150ms feedback, 150–250ms transitions, 300–500ms rare milestones.
- No fake XP, meaningless streaks, or badges without real capability behind them.

## Other docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DECISIONS.md](docs/DECISIONS.md)
- [docs/MVP-SCOPE.md](docs/MVP-SCOPE.md)
- [docs/BACKLOG.md](docs/BACKLOG.md)

## Commands

```
npm run dev     # Next.js dev server
npm run build   # production build
npm run lint    # next lint
npm run db      # local dev database
npm run seed    # seed data
npm run smoke   # smoke tests
```
