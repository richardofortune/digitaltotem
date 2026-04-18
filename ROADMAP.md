# Digital Totem — Product Roadmap

Turn any life into a museum-worthy exhibit. The same content, many presentations.

---

## Current State

- Static HTML/CSS/JS site on GitHub Pages
- Single data source: `data/events.json`
- Seven presentation views: Timeline, Gallery, Chapters, Decades, Map, Constellation, Valence
- Three content types: Event (factual), Memory (reflective), Prompt (unanswered question)
- Admin: form editor (`admin.html`) with entry type selector, scoring sliders, location lookup

**Data model per entry:**
```json
{
  "id": "01/04/1998",
  "type": "event | memory | prompt",
  "title": "...",
  "category": "life | work | pivotal | passion | basic",
  "dateIso": "1998-04-01",
  "dateApprox": "Late 1990s",
  "body": "Markdown...",
  "summary": "...",
  "media": { "image": "..." },
  "location": { "name": "...", "lat": 48.39, "lng": -4.49 },
  "tags": ["education", "travel"],
  "people": ["Bríd DeRoiste"],
  "valence": -0.6,
  "impact": 0.9,
  "attachedTo": "parent-event-id",
  "question": "What was...?"
}
```

---

## Phase 1 — Multiple Views (static, no backend required)

*Goal: same data, multiple presentations. Minimal schema changes.*

The core insight: `events.json` is already presentation-agnostic. Each view is a
renderer that reads the same data. A `?view=` URL param switches between them.

### 1a. Gallery / Exhibit View ✅

Image-forward grid. Each card leads with its hero image, category badge, title,
and a clipped summary. Clicking a card opens a full-screen modal with the
complete story rendered from Markdown. Filter buttons work across all views.

**Files:** `js/views/gallery.js`, CSS additions to `css/style.css`,
view-toggle buttons in `index.html`.

### 1b. Chapters / Narrative View ✅

Full-width, single-column reading experience. Events rendered as long-form prose
sections with large imagery and a category-colour accent stripe. Scroll-driven.
For people who read rather than browse. Filter buttons show/hide sections.

**Files:** `js/views/chapters.js`

### 1c. Decade View ✅

Events grouped vertically by era (1970s, 1980s, 1990s…). Each decade gets a
large typographic heading, a story-count label, and a compact card grid.
Empty decade sections collapse automatically when a filter is active.

**Files:** `js/views/decades.js`

---

## Phase 2 — Richer Data Model ✅

*Goal: unlock map, constellation, and guided-tour views.*

All fields are optional — existing events degrade gracefully. Schema additions
go into `data/events.json` and corresponding inputs in `admin.html`.

```json
{
  "location": { "name": "Brest, France", "lat": 48.39, "lng": -4.49 },
  "tags": ["education", "language", "travel"],
  "people": ["Bríd DeRoiste"],
  "mood": "formative",
  "media": {
    "gallery": ["img1.jpg", "img2.jpg"],
    "embed": "https://youtube.com/..."
  }
}
```

**Completed:**

- `admin.html` — Discovery section added: location name/lat/lng, tags, people fields
- `data/events.json` — 18 events seeded with coordinates across Ireland, France,
  Venezuela, London, Mongolia, and New Zealand
- `js/views/map.js` — Leaflet circle-markers coloured by category, tooltip on hover,
  full modal on click, filter hides/shows markers and refits bounds [key=5]
- `js/views/constellation.js` — D3 v7 force-directed graph; nodes coloured by
  category with glow filter; solid edges = shared tag, dashed = shared person;
  drag, zoom/pan, keyboard-accessible, filter dims inactive nodes [key=6]

### 2a. Map View ✅

Geographic pins on an interactive map (Leaflet.js, no API key needed). Click a
pin → full story modal. Great for well-travelled lives. Requires `location` field.

**Files:** `js/views/map.js`

### 2b. Constellation View ✅

Force-directed graph: events as nodes, shared `tags` and `people` as edges.
Artistic and expressive — reveals thematic connections across time. Built with
D3 v7. Solid edges connect shared tags; dashed edges connect shared people.

**Files:** `js/views/constellation.js`

---

## Phase 2.5 — Richer Content Model ✅

*Goal: deepen what a "life entry" can be, beyond a factual event.*

### Memory entries ✅

A distinct content type alongside `event`. A **memory** is a reflection — not
"I moved to Wellington" but "what I remember feeling when I moved to Wellington".
Memories may be undated, approximate, or attached to an existing event as a
companion reflection. They carry a different visual treatment (softer, more
personal) to signal their different epistemic status.

**Schema:**
```json
{
  "type": "memory",
  "attachedTo": "event-id-optional",
  "dateApprox": "Late 1990s",
  "title": "The smell of the ferry terminal",
  "body": "Markdown reflection...",
  "category": "life"
}
```

**Completed:**
- Memory entries render in all views: Timeline, Gallery, Chapters, Decades, Map, Constellation, Valence
- Visual treatment: softer styling, italic titles, muted backgrounds, smaller map markers
- Admin tool: Entry type selector (Event/Memory/Prompt), dateApprox field, attachedTo dropdown
- Sample data: 3 memory entries added to `events.json`

### Placeholder / prompt entries ✅

Blank entries authored by the owner that surface questions for visitors — or
that the owner leaves as an invitation to their own future self. Examples:
*"What was the bravest thing you did in your 20s?"*, *"Who shaped how you think
about money?"*. Clicking a placeholder opens a response flow or serves as a
conversation-starter.

**Schema:**
```json
{
  "type": "prompt",
  "question": "What was the bravest thing you did in your 20s?",
  "category": "pivotal",
  "dateIso": null
}
```

**Completed:**
- Prompt banner: rotating prompts with category badge, answer/next/dismiss buttons
- Prompt modal: opens on click with form to capture responses (saves to sessionStorage → admin prefill)
- Prompts render in all views: dashed borders, question-mark icons, "Add your story" CTAs
- Map view: dashed circle markers for prompts
- Constellation view: dashed-stroke nodes with "?" label
- Admin tool: Question field appears when type=prompt selected
- Sample data: 6 prompt entries across categories

### Event / memory scoring ✅

Each entry gains two optional numeric fields:

| Field | Range | Meaning |
|-------|-------|---------|
| `valence` | -1.0 → +1.0 | Emotional charge (negative → positive) |
| `impact` | 0.0 → 1.0 | How much this shaped the trajectory |

**Completed:**
- `js/views/valence.js` — D3 v7 scatter plot: x=time, y=valence, bubble size=impact
- Colour zones: green tint for positive valence, red tint for negative
- Unscored entries shown as small grey dots on neutral line
- Rolling average trend line (2-year window) shows emotional trajectory
- Admin tool: Valence/Impact sliders with live labels ("Slightly positive", "Defining")
- Sample data: 7 events scored with valence/impact values
- View accessible via keyboard shortcut [7] or view-switcher button

---

## Phase 3 — Static Site Generator (Strangler Fig Migration)

*Goal: proper component model, co-located content, no backend.*

Migrate to **Astro v6** using a **strangler fig** pattern — replace legacy
jQuery modules one at a time while keeping the site fully functional at every
step. Previous attempt to rewrite all 7 views as Astro/React components at once
reached only ~30% visual parity and was scrapped.

### Current State (April 17, 2026)

Astro serves the original HTML shell and loads legacy JS through
`<script is:inline>` tags. Steps 0–2 complete: shared utilities extracted,
Chapters and Gallery views replaced with SSR components. 13 legacy scripts
remaining. All 7 views fully functional.

**Infrastructure in place:**
- Astro v6.1.7 project at `digitaltotem-astro/`
- Content Collections configured (`src/content.config.ts`, 33 `.md` files)
- `Base.astro` loads jQuery + 13 legacy scripts + 5 CSS files
- `index.astro` renders Chapters + Gallery from Content Collections at build time
- Shared utilities: `src/utils/markdown.ts`, `src/lib/data.ts`
- Build passing, all 7 views functional

### Dependency Analysis

Legacy JS follows a **hub-and-spoke** pattern:

```
filter.js (hub) ──────────────────────────────────────────┐
  │  Fetches events.json                                  │
  │  Builds timeline DOM (calls jquery.timeline.js)       │
  │  Initializes all views: if (window.XView) XView.init()│
  │  Handles: filtering, scroll, keyboard shortcuts       │
  ├── gallery.js       (self-contained card grid + modal) │
  ├── chapters.js      (self-contained narrative sections)│
  ├── decades.js       (self-contained decade groups)     │
  ├── prompt-banner.js (rotating prompt banner)           │
  ├── prompt-modal.js  (response form modal)              │
  ├── map.js           (Leaflet — needs client JS)        │
  ├── constellation.js (D3 force graph — needs client JS) │
  └── valence.js       (D3 scatter plot — needs client JS)│
```

**Massive code duplication:** `escapeHtml()` copied 9×, `renderMarkdown()` 7×,
`heroFor()` 6×, `colourFor()` 7×, modal code 5×. Migration consolidates these
into shared utilities.

### Migration Plan

Each step produces a working site. Legacy JS is removed only after its
replacement is visually verified.

#### Step 0 — Shared utilities ✅
Extracted duplicated helpers into shared modules:
- `src/utils/markdown.ts` — `renderMarkdown()`, `escapeHtml()` (replaces 9+7 copies)
- `src/lib/data.ts` — `formatDate()`, `colourFor()`, `heroFor()`, `sortedByDate()`,
  `groupByDecade()`, `getEvents()` (Content Collections API)
- Fixed `CAT_COLOURS` to match legacy values, `DEFAULT_HEROES` paths, `formatDate()`
  to month+year only

#### Step 1 — SSR Chapters view ✅
**Why first:** Simplest view — pure HTML sections, no external libs, no modal.
- Built `ChaptersSSR.astro` rendering all 3 entry types (event, memory, prompt)
  from Content Collections at build time
- Inline script (~60 LOC) exposes `window.ChaptersView` stub for `filter.js`
  compatibility: `.init()` (no-op), `.activateFromURL()`, `.filter(cat)`
- Removed `chapters.js` from `Base.astro`
- Visual parity verified: accent colours, hero images, date format, markdown body

#### Step 2 — SSR Gallery view ✅
- Built `GallerySSR.astro` — card grid from Content Collections with correct
  ordering: events → memories → prompts (matching legacy `gallery.js` behavior)
- Inline script (~120 LOC) handles: modal build/open/close (vanilla JS, no
  jQuery), card click handlers, filtering, view switching
- Exposes `window.GalleryView` stub for `filter.js` compatibility
- Removed `gallery.js` from `Base.astro`
- Visual parity verified: card layout, images, badges, modal content

#### Step 3 — SSR Decades view ⬜
- Build `Decades.astro` — decade-grouped cards from Content Collections
- Client JS: modal + filter toggle (reuse Gallery's island pattern)
- Remove `decades.js`

#### Step 4 — SSR Timeline view ⬜
- Build `Timeline.astro` — render timeline HTML at build time
- Keep `jquery.timeline.js` for desktop interactive behavior (expand/collapse)
- Replace `renderTimelineItems()` in `filter.js` with SSR HTML
- This is the stickiest piece — `jquery.timeline.js` is deeply coupled

#### Step 5 — Migrate prompt system ⬜
- `PromptBanner.astro` — SSR shell, tiny client island for localStorage + cycling
- `PromptModal.astro` — client island for form + sessionStorage (~80 LOC)
- Remove `prompt-banner.js`, `prompt-modal.js`

#### Step 6 — Migrate interactive views ⬜
- `Map.astro` — Leaflet island (`client:only="react"` or vanilla)
- `Constellation.astro` — D3 force island
- `Valence.astro` — D3 scatter island
- These genuinely need client JS; goal is clean component boundaries

#### Step 7 — Decompose filter.js ⬜
- Data loading → Astro build-time (`getCollection()`)
- Filter state → nanostores or custom events (~30 LOC)
- View routing → tiny `<script>` with URL param logic
- Keyboard shortcuts → standalone module
- Delete `filter.js` and jQuery dependency

#### Step 8 — Clean up ⬜
- Delete `banner.js` (empty file)
- Replace `image.js` hover effects with CSS `:hover`
- Replace `lightbox.js` with `<dialog>` or modern alternative
- Remove jQuery CDN from `Base.astro`
- Remove orphaned Astro components from failed first attempt
- Performance audit, accessibility check, mobile testing

### SSR vs Client Classification

| Component | Rendering | Client JS needed |
|-----------|-----------|-----------------|
| Chapters | Full SSR | Filter toggle only |
| Gallery | Full SSR | Modal + filter (~50 LOC) |
| Decades | Full SSR | Modal + filter (~50 LOC) |
| Timeline | Full SSR | jquery.timeline.js (interactive) |
| Prompt banner | SSR shell | localStorage + cycling |
| Prompt modal | — | Full client (~80 LOC) |
| Map | — | Leaflet island (full client) |
| Constellation | — | D3 island (full client) |
| Valence | — | D3 island (full client) |
| Filter bus | — | ~30 LOC state + URL sync |

---

## Phase 4 — Multi-tenant / Hosted Product

*Goal: anyone can Totem their life.*

Requires:
- Auth: Clerk or Auth.js
- Per-user storage: Supabase (events) + Cloudflare R2 / S3 (media)
- Real admin interface (not download-JSON flow)
- Subdomain or slug routing: `totem.io/richard`

---

## View switcher UX pattern

```
[Filter Experiences]  [All] [Life] [Work] [Pivotal] [Passion]

[1 Timeline] [2 Gallery] [3 Chapters] [4 Decades] [5 Map] [6 Constellation] [7 Valence]
```

- View state is persisted in the URL (`?view=gallery`) so links are shareable.
- Filter state is also URL-persisted (`?filter=work`) and works across all views.
- Both params compose: `?view=gallery&filter=passion` shows passion events in
  gallery layout.
- Keyboard shortcuts: press 1-7 to switch views directly.
