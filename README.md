# Icon System Migration (2026)

## Feature Flags (2026)

To simplify the public deployment, key features can be enabled/disabled via feature flags in `index.html`:

```
<script>
	window.FEATURE_FLAGS = {
		lifeVase: false, // 3D vase easter egg
		admin: false,    // admin UI/tools
		experimental: false // for future use
	};
</script>
```

Set these to `false` to hide features from the public site. The admin UI and Life Vase will not be accessible if disabled.

# Icon System Migration (2026)

## Why migrate?
The project originally used FontAwesome class names for timeline icons, but this limited icon selection and future compatibility. In April 2026, the icon system was migrated to use [Iconify](https://iconify.design/) for a vastly larger icon set and more robust, future-proof rendering.

## What changed?
- **Data:** All `icon` fields in `data/events.json` are now in the format `iconify:collection:icon-name` (e.g., `iconify:fa6-solid:heart`, `iconify:mdi:school`). A one-time migration script updated all legacy FontAwesome values (e.g., `fa-solid fa-heart`) to the new format.
- **Admin:** The admin tool now saves icons in Iconify format. Any legacy icon values are automatically converted on save.
- **Rendering:**
	- Timeline and all views use Iconify's SVG framework via CDN loader in `index.html`.
	- The JS pipeline (`js/filter.js`) includes a runtime migration step: if any legacy icon value is encountered, it is converted to Iconify format before rendering.
	- After timeline items are rendered, `Iconify.scan()` is called to ensure all icons are replaced with SVGs.
- **Styling:** Timeline icon backgrounds and sizing are applied to both `.iconify` and `.iconify-inline` classes for consistent appearance.

## How to use icons now
- When editing or adding events, always use the Iconify format: `iconify:collection:icon-name`.
- You can browse available icons at [icon-sets.iconify.design](https://icon-sets.iconify.design/).
- The admin UI and all runtime code will handle icons in this format end-to-end.

## Troubleshooting
- If an icon does not appear, check that the `icon` value is in the correct format and that the icon exists in the Iconify collection.
- The runtime migration ensures legacy data is still displayed, but all new data should use the Iconify format.

## Example
```json
{
	"icon": "iconify:fa6-solid:graduation-cap"
}
```

---
# Digital Totem (GH Pages)

Static personal timeline site built with plain HTML, CSS, and JavaScript.

## Views

Seven presentation styles for the same data:

| Key | View | Description |
|-----|------|-------------|
| 1 | Timeline | Horizontal scrolling cards |
| 2 | Gallery | Image-forward grid with modals |
| 3 | Chapters | Long-form narrative reading |
| 4 | Decades | Grouped by era (1980s, 1990s…) |
| 5 | Map | Geographic pins (Leaflet) |
| 6 | Constellation | Force-directed graph (D3) |
| 7 | Valence | Emotional scatter plot |

Switch views with keyboard shortcuts (1-7) or the view-switcher buttons.

## Content types

- **Event** — factual record (default)
- **Memory** — reflective fragment, may be undated or attached to an event
- **Prompt** — unanswered question, invites responses

## How it works

- `index.html` is the entry point and wires up styles and scripts.
- `data/events.json` holds all timeline content and configuration.
- `data/events.reference.json` is a pristine backup (never edited by admin).
- `js/filter.js` fetches the events, renders timeline cards, and handles filtering.
- `js/views/*.js` render the alternate views (gallery, chapters, decades, map, constellation, valence).
- `css/style.css` and `css/flat.css` provide the main visual styling.

## Edit content

All story entries live in `data/events.json`.

### Option 1: Admin server (recommended for editing)

The admin server saves changes directly to `data/events.json`:

```sh
node scripts/admin-server.js
```

Open `http://127.0.0.1:4100/admin.html`. The **Save file** button writes changes immediately.

### Option 2: Download flow

If you use a simple HTTP server (no save endpoint), the admin tool downloads a replacement JSON file instead:

```sh
python3 -m http.server 4000
```

Open `http://localhost:4000/admin.html`, edit entries, click **Download**, then replace `data/events.json` manually.

### Restore from backup

To reset to the clean reference data:

```sh
cp data/events.reference.json data/events.json
```

### Key fields

- `type`: `event` (default), `memory`, or `prompt`
- `id`: unique date string in `MM/DD/YYYY` format (or `mem-001` for memories)
- `category`: `life`, `work`, `pivotal`, `passion`, or `basic`
- `body`: Markdown-like text (headings, lists, links, images, bold/italic)
- `location`: `{ name, lat, lng }` for Map view
- `tags`, `people`: arrays for Constellation edges
- `valence`: -1.0 to +1.0 (emotional charge)
- `impact`: 0.0 to 1.0 (trajectory significance)
- `question`: prompt text (for type=prompt)
- `dateApprox`: free text date (for type=memory)
- `attachedTo`: parent event ID (for type=memory)

## Run locally

This site uses `fetch`, so serve it with a local web server (not `file://`).

```sh
# Simple viewing (no save)
python3 -m http.server 4000

# Editing with save (recommended)
node scripts/admin-server.js
```

Then open `http://localhost:4000` or `http://127.0.0.1:4100`.

## Deploy

Published via GitHub Pages. The custom domain is stored in `CNAME`.
