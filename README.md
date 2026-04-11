# Digital Totem (GH Pages)

Static personal timeline site built with plain HTML, CSS, and JavaScript.

## How it works
- `index.html` is the entry point and wires up styles and scripts.
- `data/events.json` holds all timeline content and configuration.
- `js/filter.js` fetches the events, renders timeline cards, and handles filtering.
- `js/jquery.timeline.js` powers the scrolling timeline UI.
- `js/lightbox.js` and `js/image.js` handle image zoom and hover effects.
- `css/style.css` and `css/flat.css` provide the main visual styling.

## Edit content
All story entries live in `data/events.json`.

Key fields:
- `timeline.defaultStartId`: the initial timeline item ID to focus on.
- `events[].id`: a unique date string in `MM/DD/YYYY` format (used by the timeline).
- `events[].category`: one of `life`, `work`, `pivotal`, `passion`, or `basic`.
- `events[].body`: Markdown-like text (headings, lists, links, images, bold/italic).
- `events[].bodyHtml`: optional raw HTML if you need full control.
- `events[].media.image`: optional hero image for the expanded card.

If you add a new category, you also need to:
- Add a filter button in `index.html` (button `id` matches the category).
- Add CSS styles for the category and timeline node in `css/style.css`.

## Run locally
This site uses `fetch`, so serve it with a local web server (not `file://`).

```sh
python3 -m http.server 4000
```

Then open `http://localhost:4000`.

## Deploy
Published via GitHub Pages. The custom domain is stored in `CNAME`.
