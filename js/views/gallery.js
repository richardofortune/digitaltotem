/* gallery.js — Gallery view renderer for Digital Totem
 * Reads the same events array as the timeline, renders an image-forward grid,
 * and opens a modal with the full story on card click.
 *
 * Public API (window.GalleryView):
 *   .init(data)          — called once after events data is fetched
 *   .activateFromURL()   — called after timeline init; switches to gallery if ?view=gallery
 *   .filter(category)    — called by filter buttons to show/hide cards by category
 */
(function (window, $) {
    'use strict';

    var _data = [];
    var _initialized = false;
    var _prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Category colours ──────────────────────────────────────────────── */
    var CAT_COLOURS = {
        life:    { bg: '#2ec27e', text: '#fff' },
        work:    { bg: '#2563eb', text: '#fff' },
        passion: { bg: '#f59e0b', text: '#1a1a1a' },
        pivotal: { bg: '#ef4444', text: '#fff' },
        basic:   { bg: '#2d5bff', text: '#fff' }
    };

    var DEFAULT_HEROES = {
        basic:   'images/flat/default/key_experience.jpg',
        life:    'images/flat/default/key_life.jpg',
        work:    'images/flat/default/key_work.jpg',
        pivotal: 'images/flat/default/key_experience.jpg',
        passion: 'images/flat/default/key_passion.jpg'
    };

    /* ── Helpers ────────────────────────────────────────────────────────── */
    function heroFor(item) {
        if (item.media && item.media.image) return item.media.image;
        return DEFAULT_HEROES[item.category] || DEFAULT_HEROES.basic;
    }

    function colourFor(category) {
        return CAT_COLOURS[category] || CAT_COLOURS.basic;
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function renderMarkdown(md) {
        if (!md) return '';
        var formatInline = function (text) {
            return text
                .replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img class="gallery-md-img" src="$2" alt="$1"/>')
                .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>');
        };
        var lines = md.split(/\r?\n/);
        var html = [];
        var inList = false;
        lines.forEach(function (rawLine) {
            var line = rawLine.trim();
            if (!line) {
                if (inList) { html.push('</ul>'); inList = false; }
                return;
            }
            var hMatch = line.match(/^(#{1,6})\s+(.*)$/);
            if (hMatch) {
                if (inList) { html.push('</ul>'); inList = false; }
                var lvl = hMatch[1].length;
                html.push('<h' + lvl + '>' + formatInline(escapeHtml(hMatch[2])) + '</h' + lvl + '>');
                return;
            }
            if (line.indexOf('- ') === 0) {
                if (!inList) { html.push('<ul>'); inList = true; }
                html.push('<li>' + formatInline(escapeHtml(line.slice(2))) + '</li>');
                return;
            }
            if (inList) { html.push('</ul>'); inList = false; }
            if (line[0] === '<' && line[line.length - 1] === '>') {
                html.push(line);
                return;
            }
            html.push('<p>' + formatInline(escapeHtml(line)) + '</p>');
        });
        if (inList) html.push('</ul>');
        return html.join('');
    }

    function formatDate(dateIso) {
        if (!dateIso) return '';
        try {
            var d = new Date(dateIso + 'T12:00:00');
            return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
        } catch (e) { return dateIso; }
    }

    /* ── URL helpers ────────────────────────────────────────────────────── */
    function getViewFromURL() {
        if (!window.URLSearchParams) return null;
        return new URLSearchParams(window.location.search).get('view') || null;
    }

    function setViewInURL(view) {
        if (!window.history || !window.history.replaceState || !window.URL) return;
        var url = new URL(window.location.href);
        if (view) {
            url.searchParams.set('view', view);
        } else {
            url.searchParams.delete('view');
        }
        window.history.replaceState(null, '', url.toString());
    }

    /* ── Modal ──────────────────────────────────────────────────────────── */
    function buildModal() {
        if ($('#galleryModal').length) return;
        var html = [
            '<div id="galleryModal" class="gallery-modal-overlay" role="dialog" aria-modal="true"',
            '     aria-labelledby="galleryModalTitle" tabindex="-1" style="display:none">',
            '  <div class="gallery-modal-box" role="document">',
            '    <button class="gallery-modal-close" aria-label="Close story">&times;</button>',
            '    <div class="gallery-modal-hero-wrap">',
            '      <img class="gallery-modal-hero" id="galleryModalHero" src="" alt=""/>',
            '    </div>',
            '    <div class="gallery-modal-content">',
            '      <div class="gallery-modal-meta">',
            '        <span class="gallery-modal-cat" id="galleryModalCat"></span>',
            '        <span class="gallery-modal-date" id="galleryModalDate"></span>',
            '      </div>',
            '      <h2 class="gallery-modal-title" id="galleryModalTitle"></h2>',
            '      <div class="gallery-modal-body" id="galleryModalBody"></div>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('\n');
        $('body').append(html);

        /* Close on overlay click */
        $('#galleryModal').on('click', function (e) {
            if ($(e.target).is('#galleryModal')) closeModal();
        });
        /* Close button */
        $(document).on('click', '#galleryModal .gallery-modal-close', closeModal);
        /* Close on Escape */
        $(document).on('keydown.galleryModal', function (e) {
            if (e.key === 'Escape' && $('#galleryModal').is(':visible')) closeModal();
        });
    }

    var _lastFocused = null;

    function openModal(item) {
        buildModal();
        _lastFocused = document.activeElement;

        var hero  = heroFor(item);
        var col   = colourFor(item.category || 'basic');
        var cat   = item.category ? (item.category.charAt(0).toUpperCase() + item.category.slice(1)) : '';

        $('#galleryModalHero').attr('src', hero).attr('alt', escapeHtml(item.title || ''));
        $('#galleryModalCat').text(cat).css({ background: col.bg, color: col.text });
        $('#galleryModalDate').text(formatDate(item.dateIso));
        $('#galleryModalTitle').text(item.detailTitle || item.title || '');

        var bodyHtml = item.bodyHtml || '';
        if (!bodyHtml && item.body) bodyHtml = renderMarkdown(item.body);
        $('#galleryModalBody').html(bodyHtml || '<p>No further details available.</p>');

        $('body').addClass('gallery-modal-open');
        var fadeDur = _prefersReducedMotion ? 0 : 180;
        $('#galleryModal').fadeIn(fadeDur, function () {
            $(this).focus();
        });
    }

    function closeModal() {
        var fadeDur = _prefersReducedMotion ? 0 : 160;
        $('#galleryModal').fadeOut(fadeDur, function () {
            $('body').removeClass('gallery-modal-open');
            if (_lastFocused) { _lastFocused.focus(); _lastFocused = null; }
        });
    }

    /* ── Card grid ──────────────────────────────────────────────────────── */
    function renderCards(data) {
        var $grid = $('#galleryGrid');
        if (!$grid.length) return;
        $grid.empty();

        data.forEach(function (item) {
            /* Skip the guide/intro card — it has no visual story to show */
            if (!item.category || item.category === 'basic') return;

            var col   = colourFor(item.category);
            var cat   = item.category.charAt(0).toUpperCase() + item.category.slice(1);
            var isFilterable = item.filterable !== false;

            /* ── Prompt placeholder card ── */
            if (item.type === 'prompt') {
                var $pcard = $('<article/>', {
                    'class': 'gallery-card gallery-card--prompt' + (isFilterable ? ' js-galleryItem ' + item.category : ''),
                    'data-id': item.id,
                    'tabindex': '0',
                    'aria-label': escapeHtml(item.question || item.title || '')
                });
                var $pbody = $('<div/>', { 'class': 'gallery-card-prompt-body' });
                $pbody.append(
                    $('<span/>', { 'class': 'gallery-card-cat', text: cat })
                        .css({ background: col.bg, color: col.text })
                );
                $pbody.append($('<div/>', { 'class': 'gallery-card-prompt-mark', text: '?' }));
                $pbody.append($('<p/>', { 'class': 'gallery-card-prompt-q', text: item.question || '' }));
                $pbody.append($('<span/>', { 'class': 'gallery-card-cta', html: 'Add your story &rarr;' }));
                $pcard.append($pbody);
                $grid.append($pcard);

                $pcard.on('click keydown', function (e) {
                    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    if (window.PromptModal) window.PromptModal.open(item);
                });
                return;
            }

            /* ── Memory card — reflective entry ── */
            if (item.type === 'memory') {
                var hero  = heroFor(item);
                var hasImage = item.media && item.media.image;

                var $mcard = $('<article/>', {
                    'class': 'gallery-card gallery-card--memory' + (isFilterable ? ' js-galleryItem ' + item.category : ''),
                    'data-id': item.id,
                    'role': 'button',
                    'tabindex': '0',
                    'aria-label': 'Open memory: ' + escapeHtml(item.title || '')
                });

                if (hasImage) {
                    var $mimgWrap = $('<div/>', { 'class': 'gallery-card-img gallery-card-img--memory' });
                    $mimgWrap.append($('<img/>', { src: hero, alt: '', loading: 'lazy' }));
                    $mcard.append($mimgWrap);
                }

                var $mbody = $('<div/>', { 'class': 'gallery-card-body gallery-card-body--memory' });

                var $mcatPill = $('<span/>', { 'class': 'gallery-card-cat gallery-card-cat--memory', text: 'Memory' })
                    .css({ background: col.bg, color: col.text, opacity: 0.8 });

                $mbody.append($mcatPill);
                $mbody.append($('<h3/>', { 'class': 'gallery-card-title gallery-card-title--memory', text: item.title || '' }));

                /* Show approximate date if available */
                if (item.dateApprox) {
                    $mbody.append($('<p/>', { 'class': 'gallery-card-dateapprox', text: item.dateApprox }));
                }

                if (item.summary) {
                    $mbody.append($('<p/>', { 'class': 'gallery-card-summary gallery-card-summary--memory', text: item.summary }));
                }

                $mbody.append($('<span/>', { 'class': 'gallery-card-cta', html: 'Read memory &rarr;' }));

                $mcard.append($mbody);
                $grid.append($mcard);

                $mcard.on('click keydown', function (e) {
                    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    openModal(item);
                });
                return;
            }

            var hero  = heroFor(item);

            var $card = $('<article/>', {
                'class': 'gallery-card' + (isFilterable ? ' js-galleryItem ' + item.category : ''),
                'data-id': item.id,
                'role': 'button',
                'tabindex': '0',
                'aria-label': 'Open story: ' + escapeHtml(item.title || '')
            });

            /* Image */
            var $imgWrap = $('<div/>', { 'class': 'gallery-card-img' });
            $imgWrap.append($('<img/>', { src: hero, alt: '', loading: 'lazy' }));

            /* Text body */
            var $body = $('<div/>', { 'class': 'gallery-card-body' });

            var $catPill = $('<span/>', { 'class': 'gallery-card-cat', text: cat })
                .css({ background: col.bg, color: col.text });

            $body.append($catPill);
            $body.append($('<h3/>', { 'class': 'gallery-card-title', text: item.title || '' }));

            if (item.summary) {
                $body.append($('<p/>', { 'class': 'gallery-card-summary', text: item.summary }));
            }

            $body.append($('<span/>', { 'class': 'gallery-card-cta', html: 'Read story &rarr;' }));

            $card.append($imgWrap, $body);
            $grid.append($card);

            /* Open modal on click or keyboard */
            $card.on('click keydown', function (e) {
                if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                openModal(item);
            });
        });
    }

    /* ── Filtering ──────────────────────────────────────────────────────── */
    function applyFilter(cat) {
        var $items = $('#galleryGrid .js-galleryItem');
        var fadeDur = _prefersReducedMotion ? 0 : 300;
        if (!cat || cat === 'all') {
            $items.fadeIn(fadeDur);
        } else {
            $items.hide();
            $('#galleryGrid .' + cat).fadeIn(fadeDur);
        }
    }

    /* ── View switching ─────────────────────────────────────────────────── */
    function activateView(view) {
        /* Hide every custom view container; each view registers itself with
         * the js-view-container class so this works for any number of views. */
        $('.js-view-container').hide();
        $('.view-btn').removeClass('view-btn-active');

        if (view === 'gallery') {
            $('.timelineFlat, .timelineLoader').hide();
            $('#galleryView').show();
            $('#view-gallery').addClass('view-btn-active');
            setViewInURL('gallery');
        } else {
            /* Timeline — just restore the original timeline container */
            $('.timelineFlat').show();
            $('#view-timeline').addClass('view-btn-active');
            setViewInURL(null);
        }
    }

    /* ── Public API ─────────────────────────────────────────────────────── */
    window.GalleryView = {

        /**
         * Initialise the gallery. Called once after events.json has been
         * fetched and renderTimelineItems() has run.
         */
        init: function (data) {
            if (_initialized) return;
            _initialized = true;
            _data = data || [];

            renderCards(_data);
            buildModal();

            /* Wire view toggle buttons (delegated so they work on any DOM) */
            $(document).on('click', '#view-gallery',  function () { activateView('gallery');  });
            $(document).on('click', '#view-timeline', function () { activateView('timeline'); });
        },

        /**
         * Called by filter.js AFTER the timeline plugin has finished
         * initialising. Checks ?view= in the URL and switches if needed.
         */
        activateFromURL: function () {
            if (getViewFromURL() === 'gallery') activateView('gallery');
        },

        /**
         * Sync gallery filtering with the category filter buttons.
         * Called by filter.js whenever a filter button is clicked.
         */
        filter: function (cat) {
            applyFilter(cat);
        }
    };

})(window, jQuery);
