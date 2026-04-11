# Features — Digital Totem

## Timeline
- Chronological timeline spanning 1978–2016
- 30+ story tiles with icons, titles, and excerpts
- Horizontal scrolling layout on desktop; vertical accordion on mobile
- Auto-loading animation on initial render
- Random profile photo rotation across 4 portrait variants

## Categories & Filtering
- Five filter states via navbar buttons: Show All, Life, Work, Pivotal, Passion
- Tile naming convention drives filtering: `l_*` (life), `w_*` (work), `pi_*` (pivotal), `p_*` (passion)
- Active filter button styled; state persists during session
- Mobile-aware detection with device-specific filter behaviour

## Story Tiles
- 28+ individual story HTML files in `timeline/` directory
- Categories include:
  - **Life:** born, bucket list, kittens, London, wedding, father's death
  - **Work:** Ecole Navale, Microsoft, MSN UK, Xero, Olympic QE, Next Level, Xero Social
  - **Passion:** Whakamihi, Makers Org NZ, Oxfam trailwalk, MakerCrate, Makertorium, Million words
  - **Pivotal:** Long shot (school), Venezuela hiking, Hero discovery, Mongolia hiking
- Special tiles: `start.html` (welcome/guide), `fin.html` (conclusion)

## AJAX Content Loading
- "Read more" expands a tile and loads its HTML from `timeline/` via AJAX
- Loading spinner shown during fetch
- Dynamic height calculation on content wrapper after load
- Image preloading before content is displayed
- Custom `ajaxLoaded.timeline` event fired on completion
- Error fallback message if load fails

## Interactive Elements
- Custom scrollbar on expanded tile content (`jquery.mCustomScrollbar`)
- Lightbox image viewer for photos within tiles
- Image hover: overlay glass effect with zoom animation
- Fixed navbar appears on scroll with shadow
- Mobile close button (×) for expanded tiles

## Dependencies
- jQuery 1.9.1, jQuery Mobile, jQuery easing
- Bootstrap 3 responsive grid
- Font Awesome 4.7 icons
- Lightbox2 for image viewing
- jQuery mCustomScrollbar
- Google Analytics (UA-68928720-1)
