# DeveloperOS — Cinematic Advertisement Production Kit

> Produced by the "team": Product Manager · Ad Director · UI/UX Lead · Motion Designer · Marketer · Video Editor · VO Writer.
> Every reference below is verified against the actual codebase — no invented features.

---

## PHASE 1 — THE PROJECT, UNDERSTOOD

### The problem it solves
Developers drown in half-finished courses. You watch, you tick a box, you move on, and three months later you cannot build anything. **DeveloperOS attacks the "tutorial illusion."** Nothing counts as done until you can actually do it — the completion check runs on the server, not on your willpower.

It is also fragmented tooling: learning is in one app, notes in another, practice in a third, the job hunt in a fourth. DeveloperOS is **one operating system for a developer's whole growth** — learn, practise, take notes, build projects, use AI, and get hired, in a single dark, fast, Linear-grade workspace.

### Complete feature breakdown (verified)
| Module | What it actually does |
|---|---|
| **The Mastery Gate** | A lesson is only "mastered" after 5 server-enforced steps: read, note in your own words, do the exercise, pass the quiz at 80%, review. Rendered as a segmented arc that fills as you meet each requirement. This is the signature. |
| **Learning — two modes** | Follow a curated roadmap (phase → skill → lesson), **or** type a topic + goal and the AI generates a full path — phases, skills, lessons with real teaching bodies, and quizzes — validated and saved as yours. |
| **Practice — real execution** | Your code runs in a real Node `vm` sandbox against visible **and hidden** tests. Pass/fail is genuine, not simulated. |
| **Knowledge (second brain)** | Markdown notes with `[[wiki-links]]`, backlinks, a hand-laid **knowledge graph**, tags, collections, version history, snippet vault, flashcards, 3-second autosave. |
| **Projects** | Create wizard, **drag-and-drop Kanban**, milestones, bug tracker, deployments, a database designer and an API doc builder — each linked to the skills it practises. |
| **AI Centre** | Streaming assistant that can see your lessons/projects/notes, editable memory, prompt library, per-day cost caps. Claude first, **Groq fallback** so it always answers. File attachments. |
| **Career** | Job-readiness score (ring gauges), ATS résumé builder, portfolio built from your projects, application + interview trackers, certificates. |
| **Analytics** | 12-week contribution **heatmap**, time-by-kind bars, goals measured live, habits with streaks, Pomodoro focus timer, achievement badges, XP + levels. |
| **Calendar** | Month grid + agenda rail that pulls every deadline from every other module into one place. |
| **Command palette** | Global ⌘K — jump anywhere or search your own lessons, notes, projects, snippets. |

### Target audience
1. **Primary** — self-taught & bootcamp developers (18–30) who start courses and never finish, and want a job.
2. **Secondary** — CS students and career-switchers who need structure and proof of progress.
3. **Tertiary** — working juniors leveling up, who want one workspace instead of ten tabs.

### The user journey (the story the ad follows)
Sign in → **Dashboard** greets them with "what to do next" → open a **Lesson** → hit the **Mastery Gate** (the emotional core: you can't fake it) → **Practice** runs real code → capture it in the **Knowledge graph** → build a **Project** on the Kanban → ask the **AI** → watch **Analytics** light up → the **Career** readiness ring climbs → hired.

### What makes it unique
- **The gate is enforced server-side.** No competitor makes "done" impossible to fake.
- **Real code execution against hidden tests**, in-app.
- **AI that generates an entire structured curriculum** from a sentence.
- **One workspace** from first lesson to first job offer.
- **A design language** (Linear/Vercel/Arc tier): dark, indigo→cyan gradient, tokenized, motion at 140–260ms ease-out.

### Screens that deserve the camera (ranked)
1. **Mastery Gate** (segmented arc filling, lock → unlock) — the hero moment.
2. **Knowledge Graph** (`/notes/graph`) — nodes and edges lighting on hover, gorgeous and unusual.
3. **Dashboard** (`/dashboard`) — the "continue" hero, stat tiles, progress chart.
4. **Practice / Code Runner** — code typing, tests flipping green.
5. **AI Centre chat** (`/ai/chat`) — a roadmap streaming into existence.
6. **Analytics heatmap** (`/analytics`) — the GitHub-style grid, focus score.
7. **Learning path** (`/learning`) — phase cards, difficulty badges, AI-generate panel.
8. **Career readiness rings** (`/career`).
9. **Calendar** month view.

### Emotions to engineer
Control · momentum · pride · calm focus · "this is *mine*" · unstoppable.

### UI polish notes before shooting (small, high-leverage)
- Ensure the **gate arc** animates from empty→full on load (record the fill).
- On the **graph**, add a one-time gentle "settle" so nodes drift into place on first paint — reads beautifully on camera.
- Seed a demo account with a **half-complete gate**, a **rich graph (25+ notes)**, a **populated heatmap**, and a **70%+ career ring** — empty states don't sell.
- Record at **exact device resolution** (no browser chrome) for clean screen-capture plates.

---

## PHASE 2 — THE STRATEGY

**Positioning line:** *DeveloperOS — the operating system for becoming a developer.*
**Core idea we sell (experience, not features):** the feeling of **earned momentum** — the quiet confidence of someone who can actually build, because the app never let them fake it.

**Tone:** Apple restraint × Tesla precision × Airbnb warmth. Dark, luminous, unhurried, then a rush of momentum. Never a feature list read aloud; every feature appears *as a moment in a story*.

**Three cuts, one master timeline** (60s is the master; 30s and 15s are pulls from it):
- **60s** — the full arc: the lie of "done," the gate, the build, the hire.
- **30s** — gate → build → AI → analytics → hire.
- **15s** — gate reveal → montage burst → logo. Vertical-first for TikTok/Reels/Shorts.

**Formats:** master in **9:16** (social) and **16:9** (YouTube/TV) — shoot plates square-safe so both crop clean.

---

## PHASE 3 — STORYBOARD (master 60s; 30s & 15s marked)

> Music arc: ambient pad → single piano note → pulse builds → beat drop at the gate unlock → triumphant swell → resolve.
> Palette throughout: near-black `#0a0b0e`, indigo `#6d74f4`, violet `#9a6bff`, cyan `#39c2ff`. Grain subtle. Depth of field shallow.

### SCENE 1 — "The Lie" *(also in 60s only)*
- **Duration:** 0:00–0:05
- **Page Used:** none (abstract) — a checkbox ticking itself, floating in black
- **Purpose:** name the enemy (fake "done")
- **User Emotion:** recognition, mild discomfort
- **Transition:** hard cut on a piano note
- **Animation:** a lone checkbox ✓ ticks; then dozens tick in a grid and dissolve to dust
- **Camera Movement:** slow push-in
- **Visual Effects:** particulate dissolve, volumetric haze
- **Lighting:** single cold key from top-left
- **Text Overlay:** *"You marked it done."* → *"But could you actually do it?"*
- **Music:** sub-bass drone + one piano note

### SCENE 2 — Brand ignition
- **Duration:** 0:05–0:09 *(15s starts here)*
- **Page Used:** Logo mark (DO monogram, `</>` glyph)
- **Purpose:** premium brand stamp
- **Emotion:** intrigue, arrival
- **Transition:** light-streak wipe
- **Animation:** the indigo→cyan gradient pours through the monogram; `</>` draws on
- **Camera:** locked, subtle parallax
- **VFX:** lens bloom, chromatic edge, gradient sheen sweep
- **Lighting:** rim light tracing the mark
- **Text Overlay:** **DeveloperOS**
- **Music:** pad swells, first pulse enters

### SCENE 3 — The Dashboard welcome
- **Duration:** 0:09–0:14
- **Page Used:** `/dashboard` (hero: "Good morning" + Resume lesson + stat tiles)
- **Purpose:** show the calm, in-control home base
- **Emotion:** calm, orientation, "this is mine"
- **Transition:** gradient dissolve from the mark into the screen
- **Animation:** stat tiles rise-stagger in; progress line draws left→right
- **Camera:** slow drone-style descent onto a floating device
- **VFX:** soft glass reflection, ambient top glow
- **Lighting:** screen self-lit in a dark room
- **Text Overlay:** *"Your whole growth. One place."*
- **Music:** pulse steady

### SCENE 4 — THE MASTERY GATE (the hero) *(all three cuts)*
- **Duration:** 0:14–0:22
- **Page Used:** `/learning/lesson/[id]` — the segmented Mastery Gate
- **Purpose:** the differentiator, the emotional core
- **Emotion:** tension → release → pride
- **Transition:** snap-zoom into the arc
- **Animation:** five requirements check off one by one; the segmented arc fills; the locked "Mark as mastered" button turns from grey+lock to solid indigo; a satisfying unlock
- **Camera:** macro push on the arc, then pull back as it completes
- **VFX:** the arc emits a soft indigo glow at 100%; particles on unlock; **beat drop synced to the click**
- **Lighting:** the arc becomes the key light of the frame
- **Text Overlay:** *"No shortcuts."* → (on unlock) *"You earned it."*
- **Music:** **beat drop on unlock**

### SCENE 5 — Real code, real tests
- **Duration:** 0:22–0:28 *(30s includes)*
- **Page Used:** `/practice/challenges/[id]` — code editor + test results
- **Purpose:** prove it's real, not simulated
- **Emotion:** focus, then the rush of green
- **Transition:** horizontal slide
- **Animation:** code types itself; "Run" pressed; test rows flip red→green in sequence; "Solved. +XP"
- **Camera:** over-the-shoulder tilt, then push on the passing tests
- **VFX:** green success glow bleeds across the panel; subtle motion blur on the flip
- **Lighting:** cyan accent from the passing column
- **Text Overlay:** *"Your code actually runs."*
- **Music:** rising arpeggio

### SCENE 6 — The Knowledge Graph
- **Duration:** 0:28–0:34
- **Page Used:** `/notes/graph`
- **Purpose:** the "wow / this is beautiful" beat
- **Emotion:** awe, connectedness
- **Transition:** dissolve through a single node
- **Animation:** nodes settle into rings; hovering a hub lights every connected edge in indigo→cyan
- **Camera:** slow orbital drift around the graph
- **VFX:** edges glow and pulse along their length; depth-of-field on far nodes
- **Lighting:** each node a small emitter
- **Text Overlay:** *"Everything you learn, connected."*
- **Music:** shimmer layer added

### SCENE 7 — Build it (Kanban)
- **Duration:** 0:34–0:39
- **Page Used:** `/projects/[id]/board`
- **Purpose:** learning becomes something you can open
- **Emotion:** productivity, flow
- **Transition:** card-flip wipe
- **Animation:** a task card drags across columns and drops with a spring; column counts tick
- **Camera:** top-down, slight rotate to iso
- **VFX:** card shadow lifts on drag; snap ripple on drop
- **Lighting:** even, product-lit
- **Text Overlay:** *"Ship real projects."*
- **Music:** pulse thickens

### SCENE 8 — AI builds your path *(30s includes)*
- **Duration:** 0:39–0:45
- **Page Used:** `/ai/chat` (or Learning → Generate with AI)
- **Purpose:** the modern magic beat
- **Emotion:** delight, "it did that for me?"
- **Transition:** type-caret wipe
- **Animation:** a sentence is typed ("Learn React to get a job"); a full roadmap **streams** into existence — phases and lessons materialize line by line
- **Camera:** slow push into the streaming text
- **VFX:** text glows as it streams; a shimmering ✨ on the Generate button
- **Lighting:** screen glow intensifies with the stream
- **Text Overlay:** *"Describe your goal. Get a plan."*
- **Music:** twinkling rise

### SCENE 9 — Analytics / momentum
- **Duration:** 0:45–0:50
- **Page Used:** `/analytics` — 12-week heatmap + focus/level tiles
- **Purpose:** proof of momentum over time
- **Emotion:** pride, accumulation
- **Transition:** grid-build wipe
- **Animation:** heatmap cells fill week by week from faint to bright indigo; level ring counts up
- **Camera:** slow pull-back revealing the full grid
- **VFX:** cells bloom as they fill; number counters roll
- **Lighting:** the grid lights the frame
- **Text Overlay:** *"Watch yourself become unstoppable."*
- **Music:** triumphant swell begins

### SCENE 10 — Career readiness (the payoff)
- **Duration:** 0:50–0:55
- **Page Used:** `/career` — job-readiness ring climbing
- **Purpose:** the destination — hired
- **Emotion:** triumph, aspiration
- **Transition:** ring-sweep wipe
- **Animation:** the readiness ring sweeps 0→82%; résumé/portfolio tiles assemble
- **Camera:** push into the ring as it completes
- **VFX:** success glow, gold-cyan accent on "ready"
- **Lighting:** warm rim added to the cool palette (arrival warmth)
- **Text Overlay:** *"From first lesson to first offer."*
- **Music:** peak

### SCENE 11 — Logo resolve / CTA *(all three cuts)*
- **Duration:** 0:55–0:60
- **Page Used:** Logo + wordmark on black
- **Purpose:** brand lock + call to action
- **Emotion:** conviction, desire
- **Transition:** everything collapses into the monogram
- **Animation:** all prior screens shrink and fold into the DO mark; wordmark draws; store badges fade up
- **Camera:** final slow push-in, then still
- **VFX:** gradient sheen sweep, soft bloom, particle settle
- **Lighting:** single hero rim
- **Text Overlay:** **DeveloperOS** → *"Stop watching. Start building."* → *App Store · Google Play*
- **Music:** resolve to the single piano note, tail out

**30s cut =** Scenes 2 → 4 → 5 → 8 → 9 → 10 → 11.
**15s cut =** Scenes 2 → 4 (short) → montage burst of 5/6/8/9 (0.6s each) → 11.

---

## PHASE 4 — AI VIDEO GENERATION PROMPTS (one per scene)

> Tips: these are written for image-to-video where possible — generate/record the UI screen as a still (or screen-capture plate), then feed it as the first frame with the prompt as the motion instruction. For fully generative shots (Scenes 1, 2, 11) no plate is needed. Aspect: append "9:16 vertical" or "16:9 cinematic" as needed. Keep each clip 4–8s.

**SCENE 1 — The Lie**
```
Cinematic 4K macro shot in a pitch-black void. A single glowing white checkbox floats center-frame and ticks itself with a soft click; then dozens of identical checkboxes appear in a floating grid and tick in a wave, before dissolving into fine particulate dust that drifts toward camera. Slow push-in, shallow depth of field, volumetric cold blue haze, a single hard key light from top-left, subtle film grain, chromatic aberration on edges. Premium Apple-style minimalist advertisement mood, ultra realistic, smooth motion. 16:9 cinematic.
```

**SCENE 2 — Brand ignition**
```
Cinematic 4K premium logo reveal on near-black background (#0a0b0e). A rounded-square app icon holds a code glyph "</>"; a luminous gradient (violet #9a6bff to indigo #6d74f4 to cyan #39c2ff) pours diagonally through the mark as the code glyph strokes draw on, left to right. A soft light streak wipes across, triggering lens bloom and a gradient sheen sweep. Locked camera with micro parallax, rim light tracing the icon edges, glassy reflection, ultra realistic rendering, buttery-smooth animation, luxury tech commercial style. 16:9.
```

**SCENE 3 — Dashboard**
```
Cinematic 4K product shot: a sleek floating smartphone/laptop in a dark studio, screen self-illuminated, showing a dark developer dashboard with a "Good morning" greeting, a highlighted "Resume lesson" card, and four stat tiles. The stat tiles rise and fade in with a staggered spring; a thin progress line draws itself left to right; an indigo ambient glow breathes at the top. Slow drone-style descent onto the device, shallow depth of field, soft glass reflections, premium Vercel/Linear aesthetic, pixel-perfect UI, ultra realistic, smooth micro-interactions. 16:9.
```

**SCENE 4 — Mastery Gate (hero)**
```
Cinematic 4K hero shot. Macro push-in on a dark UI card titled "Mastery gate" featuring a segmented circular arc. Five list items check off one by one with soft ticks; the segmented arc fills segment by segment glowing indigo (#6d74f4); a greyed, locked "Mark as mastered" button transforms into a solid glowing indigo button and unlocks with a burst of light particles. On the final unlock the whole frame pulses once. Camera pushes to macro then pulls back as the arc completes, the arc becomes the key light source, volumetric glow, depth of field, subtle grain, triumphant premium advertisement energy, ultra realistic, flawless smooth animation. 16:9.
```

**SCENE 5 — Practice / real code**
```
Cinematic 4K over-the-shoulder shot of a dark code editor UI. Monospace code types itself line by line, a "Run" button is pressed, and a vertical list of test rows flips from red to green in quick sequence, ending on a "Solved +50 XP" badge. A green success glow bleeds across the results panel; a cyan accent light rises from the passing column; subtle motion blur on each row flip. Camera tilts then pushes into the passing tests, shallow depth of field, focused desk-lit ambience, premium developer-tool commercial, ultra realistic, smooth. 16:9.
```

**SCENE 6 — Knowledge graph**
```
Cinematic 4K slow orbital drift around a glowing node-and-edge knowledge graph on a near-black canvas. Circular nodes settle gently into concentric rings; as an invisible cursor hovers a central hub, every connected edge lights up and pulses with a violet-to-cyan gradient traveling along its length. Depth of field softens distant nodes into bokeh, each node emits a faint glow, elegant data-visualization beauty, luxury tech aesthetic, ultra realistic rendering, mesmerizing smooth motion. 16:9.
```

**SCENE 7 — Kanban build**
```
Cinematic 4K top-down shot of a dark Kanban board UI that slowly rotates toward isometric. A task card is dragged across columns; its shadow lifts as it moves and it drops into the next column with a springy snap and a soft ripple; column count badges tick up. Even product lighting, crisp UI, tasteful motion blur on the drag, premium productivity-app commercial style, ultra realistic, satisfying smooth interaction. 16:9.
```

**SCENE 8 — AI generates a roadmap**
```
Cinematic 4K slow push-in on a dark AI chat UI. A prompt is typed ("Learn React to get a job") and pressed; a complete structured learning roadmap streams into existence below it, phase and lesson lines materializing one by one with a soft glow as each appears, a shimmering sparkle icon on the "Generate" button. Screen glow intensifies as the content streams, type-caret motion, premium AI-product reveal, ultra realistic, elegant smooth streaming animation, luxury tech mood. 16:9.
```

**SCENE 9 — Analytics heatmap**
```
Cinematic 4K slow pull-back on a dark analytics dashboard featuring a GitHub-style 12-week contribution heatmap. Grid cells fill in week by week from faint to vivid indigo, each cell blooming softly as it lights; a circular level gauge counts upward and number counters roll. The glowing grid becomes the light source of the frame, shallow depth of field, triumphant momentum, premium data commercial, ultra realistic, smooth escalating animation. 16:9.
```

**SCENE 10 — Career readiness**
```
Cinematic 4K push-in on a dark career dashboard. A large circular "job readiness" gauge sweeps from 0 to 82 percent with a glowing indigo-to-cyan stroke; résumé and portfolio preview tiles assemble into place around it. A warm rim light is introduced against the cool palette to signal arrival and success, soft gold-cyan accent glow at completion, aspirational premium tone, ultra realistic, elegant smooth reveal. 16:9.
```

**SCENE 11 — Logo resolve / CTA**
```
Cinematic 4K finale. Multiple dark app screens shrink and elegantly fold inward, collapsing into a single glowing gradient app icon (violet-indigo-cyan) on black; the wordmark "DeveloperOS" strokes on beside it; App Store and Google Play badges fade up beneath, with the line "Stop watching. Start building." A final slow push-in settles to a still, gradient sheen sweep, soft bloom, gentle particle settle, single rim light, luxury Apple-style product resolve, ultra realistic, silky smooth. 16:9.
```

---

## PHASE 5 — SCREEN ANIMATIONS (per page, implementable in the real app)

> The app already uses tokenized motion: `--ease` cubic-bezier(0.16,1,0.3,1), durations 140/190/260ms, plus `rise`/`fade-in`/`scale-in`/`stagger` keyframes. Recommendations below extend that vocabulary; keep everything ≤260ms, ease-out.

**Global**
- *Entrance:* content `rise` (8px up + fade), 380ms, staggered 40ms via `.stagger`.
- *Route change:* top progress line already ships (`route-progress`) — indigo→cyan, decaying to 90%, completes on load.
- *Buttons:* hover lifts surface tone; active `scale(0.975)`; primary carries the inset sheen.
- *Cards:* `.card-link` lifts `translateY(-2px)` + shadow on hover, settles on press.
- *Loading:* shimmer skeletons; AI "thinking" = three pulsing dots.

**Dashboard** — hero `rise`; stat tiles `.stagger`; progress line draws (animate width 0→pct, 800ms); "Resume" arrow micro-nudge on hover.
**Learning** — phase cards `.stagger`; difficulty badges pop-in; progress bars grow on view; locked phases at 55% opacity with a subtle lock shimmer.
**Lesson / Mastery Gate** — arc fills on load (stroke-dashoffset, 700ms); each step check springs; unlock = button color morph + particle burst; scroll-reveal for body sections.
**Practice** — editor caret blink; test rows flip red→green sequentially (stagger 60ms); success panel glow-in; XP badge count-up.
**Knowledge graph** — one-time node settle on first paint; edges fade to full on hover; node hover scales 1.08; click ripples out.
**Projects/Kanban** — cards spring on drag; drop ripple; column count roll; new-project wizard steps slide horizontally.
**AI chat** — messages `rise` from bottom; assistant text streams token-by-token; composer grows with input; suggestion cards `.card-link`.
**Analytics** — heatmap cells stagger-fill on view; ring gauges sweep; bars grow left→right; counters roll.
**Career** — readiness rings sweep (stroke-dashoffset); tiles `.stagger`; "ready" state adds a warm glow.
**Calendar** — month fade-swap on nav; "today" cell pulses once; event dots pop; agenda rail slides in.
**Command palette (⌘K)** — `scale-in` from 97%; results highlight on arrow-key; backdrop blur-in.
**Mobile drawer** — slide-in from left (260ms), backdrop fade, body-scroll lock.

---

## PHASE 6 — VOICE-OVER SCRIPTS

**15-second**
> (soft) You marked it… done.
> (beat) But could you build it?
> DeveloperOS won't let you fake it.
> Learn. Prove it. Ship it.
> (warm) Stop watching. Start building.

**30-second**
> Every course ends the same way. A checkbox. A lie you tell yourself.
> DeveloperOS is different. Nothing is done until you can actually do it — the gate is real, and it doesn't blink.
> Write the code. Watch it pass. Connect what you know. Build something that opens.
> Then watch the momentum stack up… all the way to the offer.
> (warm, certain) DeveloperOS. Stop watching. Start building.

**60-second**
> (quiet) You've done this before. A video. A checkbox. "Complete."
> And then… nothing. Because watching was never the same as knowing.
> DeveloperOS ends the illusion.
> Here, a lesson isn't finished when you say so. It's finished when you *prove* it — read it, write it in your own words, do the work, pass the test. The gate runs on the server. There's no way around it. That's the point.
> Your code runs for real, against tests you can't see. Everything you learn links into one living map. Every project you build is something you can actually open. And when you're stuck, an assistant that knows your work — not the internet's — builds the path forward.
> Day by day, it stacks. The streak. The score. The proof.
> Until one morning you realize… you're ready.
> (warm, resolved) DeveloperOS. The operating system for becoming a developer.
> Stop watching. Start building.

---

## PHASE 7 — TEXT-TO-SPEECH PROMPTS

**Primary voice (recommended for all three)**
- **Gender:** Male
- **Voice:** deep, warm, premium — "flagship product" timbre
- **Style:** slow, cinematic, confident, understated (Apple/Tesla reveal)
- **Speed:** 0.85× (slower than natural); the 60s can breathe more, the 15s slightly quicker at 0.92×
- **Emotion level:** restrained → rising to warm conviction on the CTA (never shouty)
- **Accent:** neutral North American, or refined British for a more luxury read
- **Pauses:** 500–700ms after "done", "different", "the point", and before "Stop watching."
- **Emphasis:** *prove* · *real* · *actually* · *ready* · *building*

**ElevenLabs settings**
- Stability **45–55**, Similarity **80**, Style exaggeration **15–25**, Speaker boost **on**. Model: Multilingual v2 / Turbo v2. Add `<break time="0.6s"/>` at each beat; wrap emphasis words in slight capitalization or SSML `<emphasis>`.

**Alternative voice (for TikTok/younger cut):** female, bright, intimate, close-mic ASMR-adjacent, 0.9×, conspiratorial-warm — great for the 15s vertical.

**Delivery notes (paste alongside the script):**
> Speak like you're letting someone in on a secret they already suspected. Confident, unhurried. Let the silences do work. Land "Stop watching. Start building." as two separate, deliberate sentences — the second one slightly warmer, like a door opening.

---

## PHASE 8 — CAPCUT EDITING GUIDE (60s master)

**Setup:** 3840×2160 (or 1080×1920 for vertical), 30fps. Import all 11 clips + VO + music + a UI-click SFX pack + a soft riser/impact pack.

**Timeline**
```
00:00–00:05  SCENE 1 (The Lie). VO in at 0:01. Music: drone only. Grain overlay 12%. End on piano note = cut.
00:05–00:09  SCENE 2 (Brand ignition). Light-streak transition IN. Add lens-flare + glow. First music pulse on the gradient pour.
00:09–00:14  SCENE 3 (Dashboard). Gradient-dissolve from mark. Stagger the tile reveals to the pulse. Text: "Your whole growth. One place."
00:14–00:22  SCENE 4 (Mastery Gate) — THE DROP. Snap-zoom transition. Sync the beat drop to the unlock frame (place music impact exactly on the click). Add a 1-frame white flash + soft glow on unlock. Text: "No shortcuts." → "You earned it."
00:22–00:28  SCENE 5 (Practice). Slide transition. Sequence test-flip SFX (tick per green). Green glow via "Glow" adjustment. Text: "Your code actually runs."
00:28–00:34  SCENE 6 (Graph). Dissolve-through-node transition. Slow zoom 105%. Shimmer SFX on hover-light. Text: "Everything you learn, connected."
00:34–00:39  SCENE 7 (Kanban). Card-flip transition. Whoosh SFX on drag, soft thud on drop.
00:39–00:45  SCENE 8 (AI). Type-caret transition. Typewriter SFX under the stream; twinkle on Generate. Text: "Describe your goal. Get a plan."
00:45–00:50  SCENE 9 (Analytics). Grid-build transition. Riser under the cell-fill; counter SFX. Text: "Watch yourself become unstoppable."
00:50–00:55  SCENE 10 (Career). Ring-sweep transition. Music hits peak. Warm-up the LUT slightly. Text: "From first lesson to first offer."
00:55–00:60  SCENE 11 (Logo/CTA). Collapse-into-mark transition. Bloom + sheen. Music resolves to piano tail. Text: "DeveloperOS" → "Stop watching. Start building." → store badges.
```

**Global editing rules**
- **Zoom:** every scene has a slow 100→106% Ken Burns push; the gate and CTA get a stronger 108%.
- **Motion blur:** enable on all transitions; add "Motion Blur" effect on the Kanban drag and test-flip.
- **Fades:** 6-frame cross-dissolves except the gate (hard snap-zoom) and CTA (collapse).
- **Text:** app font vibe (Inter). Fade+rise 8px, 300ms in, hold, fade out. Keep text lower-third or center, never covering the hero UI element. Indigo→cyan gradient on the final wordmark only.
- **Color:** consistent dark LUT; lift a touch of warmth only in Scenes 10–11.
- **Audio:** VO −3 dB over music; music ducks −8 dB under VO; SFX −10 dB. Master to −14 LUFS (social) / −16 LUFS (broadcast).
- **Vertical version:** re-center each plate; move text to safe zones (avoid TikTok right-rail and bottom caption band).

---

## PHASE 9 — SOCIAL MEDIA CONTENT

**App Store — subtitle:** *Learn to code. Prove it. Get hired.*
**App Store — description:**
> Most learning apps let you tick a box and move on. DeveloperOS doesn't. Every lesson is locked behind five real requirements — read it, write it in your own words, do the exercise, pass the quiz, review — and the check runs on our servers, so "done" always means done.
>
> It's one workspace for your whole journey: a guided roadmap (or one our AI builds from your goal), a code playground that runs your solutions against real tests, a connected notebook with a knowledge graph, a project board, an AI assistant that actually knows your work, live analytics, and a career toolkit that turns your projects into a résumé and portfolio.
>
> Stop collecting certificates you can't back up. Start building proof.
> **Download DeveloperOS and become the developer you keep meaning to be.**

**Google Play — short:** *The operating system for becoming a developer. Learn, prove it with real code, build projects, and get hired — in one place.*
**Google Play — full:** *(same body as App Store; add:)*
> ✓ Mastery Gate — you can't fake progress ✓ Real in-app code execution ✓ AI that generates your learning path ✓ Knowledge graph & notes ✓ Kanban projects ✓ Career readiness score, ATS résumé & portfolio ✓ Streaks, XP, heatmaps, focus timer.

**Instagram caption:**
> You didn't finish the course. You *survived* it. 😮‍💨
> DeveloperOS won't let you fake "done" — the mastery gate is real, and it runs on the server. Learn it. Prove it. Ship it.
> Your code runs. Your notes connect. Your projects become a portfolio. Your streak becomes an offer. 🔥
> → Link in bio. Stop watching. Start building.
> #coding #learntocode #webdev #developer #programming #softwareengineer #buildinpublic

**Facebook caption:**
> Every course ends with a checkbox. Then three months later you still can't build anything. We fixed that. DeveloperOS locks every lesson behind five real requirements you can't skip — then gives you a code playground, an AI that builds your roadmap, a connected notebook, project boards, and a career toolkit that turns your work into a résumé. One workspace, from first lesson to first offer. Try it free 👇

**TikTok caption:**
> POV: the app won't let you lie about finishing the lesson 💀 the gate runs on the SERVER bestie #coding #codetok #learntocode #programmer #techtok #softwareengineer

**Promotional taglines**
- Stop watching. Start building.
- You can't fake it here.
- Done means done.
- The operating system for becoming a developer.
- From first lesson to first offer.
- Learn it. Prove it. Ship it.
- Proof, not certificates.

**Download CTAs**
- *Become the developer you keep meaning to be. → Download free.*
- *Your next offer starts with one lesson you can't fake. → Get DeveloperOS.*
- *Stop collecting tutorials. Start collecting proof. → Download now.*
```
