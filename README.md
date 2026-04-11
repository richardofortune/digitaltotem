# Digital Totem

An interactive, personal timeline site for Richard Fortune. It presents life,
work, pivotal, and passion story tiles along a chronological timeline with
filtering and expandable details loaded via AJAX.

> **Owner:** Richard Fortune

## What it includes
- Timeline view with dated story tiles and category filters.
- Expanded story content loaded from the `timeline/` directory.
- Static HTML/CSS/JS assets (no build step required).

## Run locally
Because the timeline details are loaded via AJAX, you must use a local web
server (opening `index.html` directly with `file://` will not work).

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html`.

## Helpful references
- Main experience timeline: `index.html`
- Timeline plugin documentation: `documentation.html`
