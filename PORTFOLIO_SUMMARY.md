# Portfolio Project Summary: Digital Totem

## Project Snapshot
- **Project name:** Digital Totem
- **Type:** Static personal portfolio/timeline website
- **Live domain:** `richardfortune.xyz`
- **Repository:** `digitaltotem-gh-pages`
- **Primary purpose:** Present a narrative-style professional and personal journey through an interactive timeline.

## Problem It Solves
Traditional portfolio pages often flatten experience into static sections. This project presents career and life milestones as a chronological, filterable story, making it easier for visitors to understand progression, pivots, and impact over time.

## Solution Overview
Digital Totem is a data-driven, static web app built with HTML/CSS/JavaScript. Timeline content is stored in a JSON file and rendered client-side into interactive cards. Users can filter entries by theme (Life, Work, Pivotal, Passion), expand entries for long-form content, and zoom images via lightbox.

## Tech Stack
- HTML4/HTML
- CSS (custom styles + Bootstrap)
- JavaScript + jQuery
- JSON content layer (`data/events.json`)
- GitHub Pages deployment (custom domain via `CNAME`)

## Key Features
- **Data-driven content model:** Timeline entries and metadata live in JSON, not hardcoded HTML.
- **Interactive timeline UI:** Chronological nodes with start-position configuration.
- **Category filtering:** Client-side filtering by theme with synchronized node visibility.
- **Rich story content:** Supports Markdown-like body content and optional raw HTML for embeds.
- **Media-first cards:** Optional hero images and lightbox zoom behavior.
- **Responsive behavior:** Mobile-aware logic with adjusted timeline interactions.
- **Local dev simplicity:** No build step; run with `python3 -m http.server 4000`.

## Content and Scale (Current)
- **Total entries:** 24
- **Date range covered:** 1978-02-02 to 2016-04-01
- **Categories:** `basic`, `life`, `work`, `pivotal`, `passion`
- **Entries with media images:** 22

## Architecture Notes
- `index.html`: Entry point, layout, filter controls, script/style loading.
- `data/events.json`: Source of truth for timeline configuration and events.
- `js/filter.js`:
  - Fetches/parses timeline data.
  - Renders cards/open states dynamically.
  - Implements minimal Markdown rendering and filter behavior.
  - Initializes and coordinates timeline plugin behavior.
- `js/jquery.timeline.js`: Timeline interaction engine.
- `js/lightbox.js` + `js/image.js`: Media zoom and image interaction behavior.

## Why This Is Portfolio-Worthy
- Demonstrates front-end fundamentals without framework dependency.
- Shows practical data modeling for content-heavy UIs.
- Balances storytelling UX with maintainable content operations.
- Uses progressive enhancement patterns (rich interactions on top of static delivery).
- Deploys cleanly as a low-maintenance static site.

## Copy-Ready Portfolio Blurbs

### Short (1-2 lines)
Built a data-driven personal timeline site that transforms portfolio content into an interactive, filterable story experience. Implemented client-side rendering from JSON, themed filtering, and media lightbox interactions on a static GitHub Pages stack.

### Medium (Case-study style)
Digital Totem is a static portfolio website designed as an interactive timeline rather than a conventional resume page. I structured the site around a JSON content model, then built client-side rendering and filtering logic so new timeline entries can be added without changing markup. The experience includes category-based exploration, expandable long-form cards, and image lightbox interactions. The result is a lightweight, maintainable site that presents 24 milestones across nearly four decades in a way that is both narrative and scannable.

### Resume Bullets
- Designed and shipped a static, data-driven portfolio site that renders timeline content from JSON instead of hardcoded HTML.
- Implemented client-side filtering and timeline-node synchronization across five story categories (`life`, `work`, `pivotal`, `passion`, `basic`).
- Built interactive content cards with Markdown-like rendering, optional rich HTML embeds, and lightbox-based media viewing for 22 image-backed entries.
- Deployed via GitHub Pages with custom domain configuration for low-cost, low-maintenance hosting.

