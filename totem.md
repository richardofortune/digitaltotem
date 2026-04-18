# The Totem Idea — An Exploration

> *"Turn any life into a museum-worthy exhibit."*

This document explores the deeper conceptual direction of Digital Totem — particularly the Phase 2.5 angle on memory, prompting, and emotional scoring. It's a thinking-out-loud space, not a spec.

---

## What Digital Totem is, as it stands

A static personal site that presents a life as a series of entries, each with a category (Life, Work, Passion, Pivotal), a title, a body written in Markdown, an optional hero image, optional location coordinates, tags, and people.

The same data can be rendered six ways: Timeline, Gallery, Chapters, Decades, Map, Constellation. All views share a single `data/events.json` source. There is no backend — the admin panel produces a downloadable JSON file.

The views are deliberately varied in *posture*: Timeline is chronological and browsable; Chapters is long-form and literary; Decades is retrospective; Map is geographic; Constellation is relational. The same life, six lenses.

The tech stack: vanilla HTML/CSS/JS, jQuery, D3 v7, Leaflet, deployed to GitHub Pages.

---

## The angle: from event log to emotional autobiography

The current model records *what happened*. Events are factual: dates, places, titles, descriptions of outcomes. This is a meaningful starting point — but it misses a layer.

A life is not just its events. It is also:

- The **felt experience** of those events — the texture of a moment, the smell of a place, the specific anxiety of a transition
- The **gaps and silences** — the things not yet written, the years that blur, the questions the owner hasn't answered
- The **weight** of each moment — not just that it happened, but whether it broke you open or merely passed through

Phase 2.5 is about adding those three layers.

---

## Layer 1 — Memory entries

### The distinction

An **event** is: *I moved to Wellington in 2007.*
A **memory** is: *I remember sitting in the empty flat on the first night, eating takeaway on the floor, not knowing a single person in the city, feeling both terrified and entirely free.*

These are different objects. They have different:
- **Certainty** — events can be dated precisely; memories are often approximate or fuzzy
- **Voice** — events are third-person declarative; memories are first-person and sensory
- **Completeness** — an event has a start, a body, an end; a memory is a fragment, often incomplete
- **Relationship to time** — events sit on the timeline; memories float, and may be recalled years later about a different year

### The `attachedTo` relationship

A memory can attach to an existing event — it is the *inner life* of that event. Or it can exist standalone, untethered to any specific moment: a recurring feeling, a formative sensation from childhood, a realisation that arrived out of nowhere.

This creates an interesting toggle for views like Chapters: show the event *and* its attached memories in sequence, or surface memories as a parallel track.

### Visual language

Memories need a softer, more intimate visual register than events:
- Less structured — no hero image required, no category badge required
- Typography that signals interiority — perhaps italicised, indented, a different font weight
- A visual indicator that communicates "this is remembered, not recorded"
- In the Timeline view: perhaps a smaller, softer marker node
- In the Constellation: perhaps a different node shape (rounded square vs circle?)

### Open questions
- Can others contribute their *memories* of events the owner has posted? (Phase 4 territory — but worth designing for now)
- How do you search or filter memories? By approximately when? By the emotion they carry? By the person or place they invoke?
- Should memories be visible by default, or collapsed/opt-in? Some people will want their public-facing totem to show curated events only, with memories as a private layer.

---

## Layer 2 — Prompt / placeholder entries

### The idea

The owner deliberately leaves blank spaces — questions that haven't been answered yet, or that they're inviting others to answer for them.

*"What did I get wrong in my 30s?"*
*"Who was the teacher I never thanked?"*
*"What would I have done differently in Brest?"*

These are not empty fields waiting to be filled in. They are **intentional invitations** — either to the owner's future self (a temporal prompt: I know I haven't processed this yet) or to visitors (a social prompt: I want to hear how you saw this).

### Why this matters for engagement

The current model is a broadcast: here is my life, read it. Prompts change the posture to conversation: here is a gap in my life I'm curious about. That gap is an invitation.

For the owner, writing prompts may itself be revelatory — the act of naming what you *don't yet have a story for* clarifies what matters. For visitors, a prompt is more engaging than a fully resolved story, because it creates a space to respond.

### Prompt types (worth distinguishing)

| Type | Description | Example |
|------|-------------|---------|
| `self-prompt` | Owner's note to their future self | *"I haven't made sense of this yet"* |
| `open-question` | Genuine question the owner is still sitting with | *"What was I actually afraid of?"* |
| `visitor-invite` | Explicit request for a visitor's perspective | *"Did you see this differently?"* |
| `memory-hole` | Known gap — the owner knows something happened but can't remember the detail | *"Something shifted here but I can't name it"* |

These don't need to be distinct types in the data model initially — a single `type: "prompt"` with a `question` field is enough. But the UX treatment might want to distinguish them.

### Visual language

Prompts in any view should communicate:
- This is unfinished / open
- This is an invitation, not a gap
- Something is *expected* here — curiosity, not absence

Ideas: a dashed border, a question-mark icon, a subtle pulsing treatment, a lighter colour weight. The prompt should look like a card that *wants* to be filled in.

### Open questions
- In the Timeline view: where does a prompt sit if it has no date? Floated to the approximate period? Surfaced at the end?
- How does a prompt become a story? Is there a mechanism to "answer" a prompt and have it convert into an event or memory entry?
- In Phase 4 (multi-user), a `visitor-invite` prompt is the entry point for contribution. Worth designing the data model to support that now.

---

## Layer 3 — Valence + Impact scoring

### What it measures

Two numbers per entry, both optional:

**Valence** (`-1.0` to `+1.0`): the emotional charge at the time. Not how you feel about it now in retrospect — how you felt *then*. A job loss might be `-0.8` when it happened and later recontextualised as the best thing that ever happened to you. The scoring is anchored to the moment, not the retelling.

**Impact** (`0.0` to `1.0`): how much this entry influenced the trajectory of your life. A quiet lunch with a mentor might have `impact: 0.9` despite being a tiny event. A decade of routine work might have `impact: 0.1` even though it spans many years.

### What it unlocks

**The life arc at a glance.** Plot valence on the y-axis, time on the x-axis, bubble size as impact. You can immediately see:
- Where the turbulence was
- Which low moments had high consequences (the pivots)
- Which high moments were actually low-impact (the celebrations that didn't change anything)
- Whether a life trends positive, negative, or oscillates

This is richer than any category filter. It's not "show me the work events" — it's "show me the moments that actually mattered."

**The constellation gains depth.** In the current constellation view, edges represent shared tags or people. With impact scores, edge thickness could be weighted by the combined impact of the connected nodes. The high-impact cluster becomes visually dominant — you can see the gravity wells of a life.

**New comparisons across lives** (Phase 4). When multiple people have totems, you can ask: do people who score high on impact tend to also score high on valence? Are pivotal moments more often negative than positive at the time? These are actually interesting research questions.

### The challenge: self-scoring is hard

Asking people to rate their own experiences numerically is fraught:
- Recency bias — recent events feel more impactful
- Negativity bias — negative events feel more impactful than positive ones of equal magnitude
- Narrative bias — we score events higher if they fit a tidy story arc

A few design principles that might help:
- **Relative scoring** rather than absolute — "was this more impactful than that?" — but this breaks down at scale
- **Anchoring** — provide examples at each end of the scale to calibrate
- **Revisability** — scores should be easy to edit; this is a living document
- **The score is yours, not the truth** — the UI should communicate that valence is subjective and personal, not a rating of the event's objective significance
- **AI-assisted first pass** — in Phase 4, you could offer to auto-score entries based on their text/category/people, with the owner reviewing and adjusting

### The new view: Valence

A dedicated `js/views/valence.js` scatter plot:
- x-axis: time (dateIso)
- y-axis: valence (-1 to +1)
- bubble size: impact (0 to 1)
- bubble colour: category colour
- hover: tooltip with title + date
- click: opens the story modal
- entries with no score: shown as small grey dots — present but unscored

Filter buttons work here: "show me only my Pivotal events on the valence chart" is a very natural question.

A secondary idea: a **rolling average line** drawn through the scatter — showing whether a period was net positive or net negative. This creates an emotional autobiography at a glance.

---

## How the three layers connect

They are not independent — they reinforce each other:

1. A **prompt** might surface a **memory** the owner didn't know they had. The act of posing the question triggers retrieval.

2. A **memory** is often better positioned to carry **valence/impact scoring** than a factual event — because memories are already in the emotional register. "I remember feeling terrified and free" already encodes a valence score.

3. **Prompts with no answers** could be visualised in the Valence view as open bubbles — you can see the gaps in the emotional record, not just the scored entries. The silences are data.

4. **Memories attached to events** could *inherit or modify* the parent event's score — the event itself was `valence: -0.6`, but the memory of it is `valence: +0.4` (recontextualised over time). This creates a temporal dimension to emotional scoring.

---

## Implications for the data model

The current model has a single content type (`event`, implied). Phase 2.5 introduces three:

```
entry
├── type: "event"      — what happened
├── type: "memory"     — what it felt like
└── type: "prompt"     — what hasn't been answered yet
```

All three share:
- `id`, `title`, `category`, `dateIso` (nullable), `body`, `media`
- `tags`, `people`, `location` (from Phase 2)
- `valence`, `impact` (new — nullable)

Only `memory` adds:
- `attachedTo` (event id, nullable)
- `dateApprox` (free text, for dateless memories)

Only `prompt` adds:
- `question` (string — the prompt text)
- `promptType` (self / open / visitor / memory-hole)

The beauty of this is that existing `events.json` entries require zero migration — `type: "event"` is the default when `type` is absent.

---

## The bigger question this raises

Digital Totem started as a way to present a life. Phase 2.5 asks: what if it was also a way to *discover* a life?

The current model assumes the owner knows their own story and is curating it for an audience. But many of the most interesting uses might be:
- Someone who doesn't know how to begin writing about themselves
- Someone who has lost the narrative thread of their own life (career change, loss, displacement)
- Someone who wants to understand their own patterns, not just exhibit them

If that's the user, then **prompts are the onboarding mechanism** — you don't start by filling in an event, you start by answering a question. And **valence scoring is the insight mechanism** — you don't just record, you reflect.

This reframes the product: not just a museum for your life, but a mirror.

---

## Open questions to explore

1. **Who scores?** The owner alone, or can trusted others score entries about them? (A friend might score an event differently than the owner.)

2. **Public vs private layers?** Should valence/impact be publicly visible, or a private analytical layer? Some people will want to share the emotional arc; others will find it too exposed.

3. **Temporal revision?** If you score an event at `valence: -0.8` now and revisit it in five years at `valence: +0.2`, does the system preserve both scores with timestamps? The evolution of your relationship to an event is itself a data point.

4. **The prompt-to-entry pipeline.** How does a prompt become a story? Is it a manual process (owner writes it) or could a conversational UI (Claude?) help generate a first draft from the question?

5. **The memory / event distinction in views.** Do memories appear in the Timeline alongside events? Or in a parallel track? The Chapters view seems like the natural home for memories — but they should probably be opt-in visible in all views.

6. **Zero-data state.** For a new Totem owner who has no events yet, what does the starting experience look like? A blank timeline is dispiriting. A set of well-chosen prompts scattered across the decades is an invitation.
