/* chapters.js — Chapters / Narrative view for Digital Totem
 * Renders all events as full-width, scroll-driven chapter sections.
 * Content is fully expanded — no click-to-reveal. Filter buttons show/hide sections.
 *
 * Public API (window.ChaptersView):
 *   .init(data)          — called once after events data is fetched
 *   .activateFromURL()   — called after timeline init; switches to chapters if ?view=chapters
 *   .filter(category)    — called by filter buttons
 */
(function (window, $) {
    'use strict';

    var _data        = [];
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
                .replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img class="chapter-md-img" src="$2" alt="$1"/>')
                .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>');
        };
        var lines = md.split(/\r?\n/);
        var html  = [];
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

    /* ── Chapter sections ───────────────────────────────────────────────── */
    function renderSections(data) {
        var $list = $('#chaptersList');
        if (!$list.length) return;
        $list.empty();

        var chapterNum = 0;

        data.forEach(function (item) {
            /* Skip the guide/intro card — no story body to display */
            if (!item.category || item.category === 'basic') return;

            /* ── Prompt placeholder section ── */
            if (item.type === 'prompt') {
                var isFilterableP = item.filterable !== false;
                var colP = colourFor(item.category);
                var catP = item.category.charAt(0).toUpperCase() + item.category.slice(1);
                var $ps = $('<section/>', {
                    'class': 'chapter-section chapter-section--prompt' + (isFilterableP ? ' js-chapterItem ' + item.category : ''),
                    'data-id': item.id
                });
                var $pi = $('<div/>', { 'class': 'chapter-prompt-inner' });
                var $pm = $('<div/>', { 'class': 'chapter-meta' });
                $pm.append(
                    $('<span/>', { 'class': 'chapter-cat', text: catP })
                        .css({ background: colP.bg, color: colP.text })
                );
                $pi.append($pm);
                $pi.append($('<div/>', { 'class': 'chapter-prompt-mark', text: '?' }));
                $pi.append($('<p/>', { 'class': 'chapter-prompt-q', text: item.question || '' }));
                $pi.append($('<p/>', { 'class': 'chapter-prompt-cta', text: 'This chapter hasn\'t been written yet.' }));
                $ps.append($pi);
                $list.append($ps);

                $ps.on('click keydown', function (e) {
                    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    if (window.PromptModal) window.PromptModal.open(item);
                });
                return;
            }

            /* ── Memory section — reflective entry ── */
            if (item.type === 'memory') {
                var heroM       = heroFor(item);
                var colM        = colourFor(item.category);
                var catM        = 'Memory';
                var isFilterableM = item.filterable !== false;

                var bodyHtmlM = item.bodyHtml || '';
                if (!bodyHtmlM && item.body) bodyHtmlM = renderMarkdown(item.body);

                var $msection = $('<section/>', {
                    'class': 'chapter-section chapter-section--memory' + (isFilterableM ? ' js-chapterItem ' + item.category : ''),
                    'data-id': item.id
                });

                /* Colour accent bar */
                var $maccentM = $('<div/>', { 'class': 'chapter-accent chapter-accent--memory' })
                    .css('background', colM.bg);

                /* Hero image (if available) */
                var $mheroWrap = $('<div/>', { 'class': 'chapter-hero-wrap chapter-hero-wrap--memory' });
                if (item.media && item.media.image) {
                    $mheroWrap.append($('<img/>', {
                        'class': 'chapter-hero chapter-hero--memory',
                        src: heroM,
                        alt: '',
                        loading: 'lazy'
                    }));
                }

                /* Inner content column */
                var $minnerM = $('<div/>', { 'class': 'chapter-inner chapter-inner--memory' });

                /* Memory label instead of chapter number */
                $minnerM.append($('<span/>', {
                    'class': 'chapter-num chapter-num--memory',
                    text: 'Memory'
                }));

                /* Meta row: category pill + date */
                var $mmetaM = $('<div/>', { 'class': 'chapter-meta' });
                $mmetaM.append(
                    $('<span/>', { 'class': 'chapter-cat chapter-cat--memory', text: catM })
                        .css({ background: colM.bg, color: colM.text, opacity: 0.8 })
                );
                if (item.dateApprox) {
                    $mmetaM.append(
                        $('<span/>', { 'class': 'chapter-date chapter-date--memory', text: item.dateApprox })
                    );
                } else if (item.dateIso) {
                    $mmetaM.append(
                        $('<span/>', { 'class': 'chapter-date chapter-date--memory', text: formatDate(item.dateIso) })
                    );
                }
                $minnerM.append($mmetaM);

                /* Title */
                $minnerM.append($('<h2/>', {
                    'class': 'chapter-title chapter-title--memory',
                    text: item.title || ''
                }));

                /* Body */
                if (bodyHtmlM) {
                    $minnerM.append($('<div/>', { 'class': 'chapter-body chapter-body--memory', html: bodyHtmlM }));
                } else if (item.summary) {
                    $minnerM.append($('<div/>', { 'class': 'chapter-body chapter-body--memory' })
                        .append($('<p/>', { text: item.summary })));
                }

                $msection.append($maccentM, $mheroWrap, $minnerM);
                $list.append($msection);
                return;
            }

            chapterNum++;
            var hero        = heroFor(item);
            var col         = colourFor(item.category);
            var cat         = item.category.charAt(0).toUpperCase() + item.category.slice(1);
            var isFilterable = item.filterable !== false;
            var numStr      = chapterNum < 10 ? '0' + chapterNum : String(chapterNum);

            var bodyHtml = item.bodyHtml || '';
            if (!bodyHtml && item.body) bodyHtml = renderMarkdown(item.body);

            var $section = $('<section/>', {
                'class': 'chapter-section' + (isFilterable ? ' js-chapterItem ' + item.category : ''),
                'data-id': item.id
            });

            /* Colour accent bar — thin stripe in category colour */
            var $accent = $('<div/>', { 'class': 'chapter-accent' })
                .css('background', col.bg);

            /* Hero image */
            var $heroWrap = $('<div/>', { 'class': 'chapter-hero-wrap' });
            $heroWrap.append($('<img/>', {
                'class': 'chapter-hero',
                src: hero,
                alt: '',
                loading: 'lazy'
            }));

            /* Inner content column */
            var $inner = $('<div/>', { 'class': 'chapter-inner' });

            /* Chapter number */
            $inner.append($('<span/>', {
                'class': 'chapter-num',
                text: 'Chapter ' + numStr
            }));

            /* Meta row: category pill + date */
            var $meta = $('<div/>', { 'class': 'chapter-meta' });
            $meta.append(
                $('<span/>', { 'class': 'chapter-cat', text: cat })
                    .css({ background: col.bg, color: col.text })
            );
            $meta.append(
                $('<span/>', { 'class': 'chapter-date', text: formatDate(item.dateIso) })
            );
            $inner.append($meta);

            /* Title */
            $inner.append($('<h2/>', {
                'class': 'chapter-title',
                text: item.detailTitle || item.title || ''
            }));

            /* Body */
            if (bodyHtml) {
                $inner.append($('<div/>', { 'class': 'chapter-body', html: bodyHtml }));
            } else if (item.summary) {
                $inner.append($('<div/>', { 'class': 'chapter-body' })
                    .append($('<p/>', { text: item.summary })));
            }

            $section.append($accent, $heroWrap, $inner);

            /* Divider between chapters (not after last — CSS handles that) */
            $list.append($section);
        });
    }

    /* ── Filtering ──────────────────────────────────────────────────────── */
    function applyFilter(cat) {
        var $sections = $('#chaptersList .js-chapterItem');
        var fadeDur   = _prefersReducedMotion ? 0 : 250;
        if (!cat || cat === 'all') {
            $sections.fadeIn(fadeDur);
        } else {
            $sections.hide();
            $('#chaptersList .' + cat).fadeIn(fadeDur);
        }
    }

    /* ── View switching ─────────────────────────────────────────────────── */
    function activateView(view) {
        /* Hide all custom view containers and clear active view button state */
        $('.js-view-container').hide();
        $('.view-btn').removeClass('view-btn-active');

        if (view === 'chapters') {
            $('.timelineFlat, .timelineLoader').hide();
            $('#chaptersView').show();
            $('#view-chapters').addClass('view-btn-active');
            setViewInURL('chapters');
            window.scrollTo({ top: 0, behavior: _prefersReducedMotion ? 'auto' : 'smooth' });
        } else {
            /* Timeline */
            $('.timelineFlat').show();
            $('#view-timeline').addClass('view-btn-active');
            setViewInURL(null);
        }
    }

    /* ── Public API ─────────────────────────────────────────────────────── */
    window.ChaptersView = {

        /**
         * Initialise the chapters view. Called once after events.json has been
         * fetched and renderTimelineItems() has run.
         */
        init: function (data) {
            if (_initialized) return;
            _initialized = true;
            _data = data || [];

            renderSections(_data);

            /* Wire view toggle button */
            $(document).on('click', '#view-chapters', function () { activateView('chapters'); });

            /* Clicking the timeline button from chapters context should hand off
             * cleanly — timeline button click is handled by gallery.js which calls
             * activateView('timeline') there; this handler ensures the chapters
             * container is also hidden via .js-view-container in that path. */
        },

        /**
         * Called by filter.js AFTER the timeline plugin has initialised.
         * Switches to chapters view if ?view=chapters is in the URL.
         */
        activateFromURL: function () {
            if (getViewFromURL() === 'chapters') activateView('chapters');
        },

        /**
         * Sync chapter filtering with the category filter buttons.
         */
        filter: function (cat) {
            applyFilter(cat);
        }
    };

})(window, jQuery);
