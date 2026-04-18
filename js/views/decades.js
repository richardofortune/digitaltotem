/* decades.js — Decade view for Digital Totem
 * Groups events by decade and renders each as a labelled section with a
 * compact card grid. Click any card to open the full story in a modal.
 * Filter buttons show/hide cards and collapse empty decade sections.
 *
 * Public API (window.DecadesView):
 *   .init(data)          — called once after events data is fetched
 *   .activateFromURL()   — switches to decades if ?view=decades
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
                .replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img style="max-width:100%;border-radius:8px;margin:8px 0" src="$2" alt="$1"/>')
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

    /* ── Decade grouping ────────────────────────────────────────────────── */
    function getYear(item) {
        if (item.dateIso) return parseInt(item.dateIso.slice(0, 4), 10);
        /* Fallback: parse MM/DD/YYYY id */
        if (item.id) {
            var parts = item.id.split('/');
            if (parts.length === 3) return parseInt(parts[2], 10);
        }
        return null;
    }

    function groupByDecade(data) {
        var groups = {};
        data.forEach(function (item) {
            if (!item.category || item.category === 'basic') return;
            var year = getYear(item);
            if (year === null || isNaN(year)) return;
            var decade = Math.floor(year / 10) * 10;
            if (!groups[decade]) groups[decade] = [];
            groups[decade].push(item);
        });
        return Object.keys(groups)
            .map(Number)
            .sort(function (a, b) { return a - b; })
            .map(function (decade) {
                return { decade: decade, label: decade + 's', items: groups[decade] };
            });
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
        if ($('#decadesModal').length) return;
        var html = [
            '<div id="decadesModal" class="gallery-modal-overlay" role="dialog" aria-modal="true"',
            '     aria-labelledby="decadesModalTitle" tabindex="-1" style="display:none">',
            '  <div class="gallery-modal-box" role="document">',
            '    <button class="gallery-modal-close" aria-label="Close story">&times;</button>',
            '    <div class="gallery-modal-hero-wrap">',
            '      <img class="gallery-modal-hero" id="decadesModalHero" src="" alt=""/>',
            '    </div>',
            '    <div class="gallery-modal-content">',
            '      <div class="gallery-modal-meta">',
            '        <span class="gallery-modal-cat" id="decadesModalCat"></span>',
            '        <span class="gallery-modal-date" id="decadesModalDate"></span>',
            '      </div>',
            '      <h2 class="gallery-modal-title" id="decadesModalTitle"></h2>',
            '      <div class="gallery-modal-body" id="decadesModalBody"></div>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('\n');
        $('body').append(html);

        $('#decadesModal').on('click', function (e) {
            if ($(e.target).is('#decadesModal')) closeModal();
        });
        $(document).on('click', '#decadesModal .gallery-modal-close', closeModal);
        $(document).on('keydown.decadesModal', function (e) {
            if (e.key === 'Escape' && $('#decadesModal').is(':visible')) closeModal();
        });
    }

    var _lastFocused = null;

    function openModal(item) {
        buildModal();
        _lastFocused = document.activeElement;

        var hero = heroFor(item);
        var col  = colourFor(item.category || 'basic');
        var cat  = item.category ? (item.category.charAt(0).toUpperCase() + item.category.slice(1)) : '';

        $('#decadesModalHero').attr('src', hero).attr('alt', escapeHtml(item.title || ''));
        $('#decadesModalCat').text(cat).css({ background: col.bg, color: col.text });
        $('#decadesModalDate').text(formatDate(item.dateIso));
        $('#decadesModalTitle').text(item.detailTitle || item.title || '');

        var bodyHtml = item.bodyHtml || '';
        if (!bodyHtml && item.body) bodyHtml = renderMarkdown(item.body);
        $('#decadesModalBody').html(bodyHtml || '<p>No further details available.</p>');

        $('body').addClass('gallery-modal-open');
        var fadeDur = _prefersReducedMotion ? 0 : 180;
        $('#decadesModal').fadeIn(fadeDur, function () { $(this).focus(); });
    }

    function closeModal() {
        var fadeDur = _prefersReducedMotion ? 0 : 160;
        $('#decadesModal').fadeOut(fadeDur, function () {
            $('body').removeClass('gallery-modal-open');
            if (_lastFocused) { _lastFocused.focus(); _lastFocused = null; }
        });
    }

    /* ── Decade grid renderer ───────────────────────────────────────────── */
    function renderDecades(data) {
        var $list = $('#decadesList');
        if (!$list.length) return;
        $list.empty();

        var groups = groupByDecade(data);

        groups.forEach(function (group) {
            var totalItems = group.items.filter(function (i) { return i.type !== 'prompt'; }).length;
            var countLabel = totalItems === 1 ? '1 story' : totalItems + ' stories';

            var $section = $('<div/>', {
                'class': 'decade-section',
                'data-decade': group.decade
            });

            /* Decade heading */
            var $heading = $('<div/>', { 'class': 'decade-heading' });
            $heading.append($('<span/>', { 'class': 'decade-label', text: group.label }));
            $heading.append($('<span/>', { 'class': 'decade-count', text: countLabel }));
            $section.append($heading);

            /* Card grid */
            var $grid = $('<div/>', { 'class': 'decade-grid' });

            group.items.forEach(function (item) {
                /* ── Prompt placeholder card ── */
                if (item.type === 'prompt') {
                    var isFilterableP = item.filterable !== false;
                    var $pcard = $('<article/>', {
                        'class': 'decade-card decade-card--prompt' + (isFilterableP ? ' js-decadeItem ' + item.category : ''),
                        'data-id': item.id,
                        'tabindex': '0',
                        'aria-label': escapeHtml(item.question || item.title || '')
                    });
                    var $pbody = $('<div/>', { 'class': 'decade-card-prompt-body' });
                    $pbody.append($('<div/>', { 'class': 'decade-card-prompt-mark', text: '?' }));
                    $pbody.append($('<p/>', { 'class': 'decade-card-prompt-q', text: item.question || '' }));
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
                    var heroMem = heroFor(item);
                    var colMem  = colourFor(item.category);
                    var isFilterableMem = item.filterable !== false;
                    var hasImageMem = item.media && item.media.image;

                    var $mcard = $('<article/>', {
                        'class': 'decade-card decade-card--memory' + (isFilterableMem ? ' js-decadeItem ' + item.category : ''),
                        'data-id': item.id,
                        'role': 'button',
                        'tabindex': '0',
                        'aria-label': 'Open memory: ' + escapeHtml(item.title || '')
                    });

                    if (hasImageMem) {
                        var $mimgWrap = $('<div/>', { 'class': 'decade-card-img decade-card-img--memory' });
                        $mimgWrap.append($('<img/>', { src: heroMem, alt: '', loading: 'lazy' }));
                        $mcard.append($mimgWrap);
                    }

                    var $mbody = $('<div/>', { 'class': 'decade-card-body decade-card-body--memory' });
                    $mbody.append(
                        $('<span/>', { 'class': 'decade-card-cat decade-card-cat--memory', text: 'Memory' })
                            .css({ background: colMem.bg, color: colMem.text, opacity: 0.8 })
                    );
                    $mbody.append($('<h4/>', { 'class': 'decade-card-title decade-card-title--memory', text: item.title || '' }));

                    $mcard.append($mbody);
                    $grid.append($mcard);

                    $mcard.on('click keydown', function (e) {
                        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
                        e.preventDefault();
                        openModal(item);
                    });
                    return;
                }

                var hero = heroFor(item);
                var col  = colourFor(item.category);
                var cat  = item.category.charAt(0).toUpperCase() + item.category.slice(1);
                var isFilterable = item.filterable !== false;

                var $card = $('<article/>', {
                    'class': 'decade-card' + (isFilterable ? ' js-decadeItem ' + item.category : ''),
                    'data-id': item.id,
                    'role': 'button',
                    'tabindex': '0',
                    'aria-label': 'Open story: ' + escapeHtml(item.title || '')
                });

                var $imgWrap = $('<div/>', { 'class': 'decade-card-img' });
                $imgWrap.append($('<img/>', { src: hero, alt: '', loading: 'lazy' }));

                var $body = $('<div/>', { 'class': 'decade-card-body' });
                $body.append(
                    $('<span/>', { 'class': 'decade-card-cat', text: cat })
                        .css({ background: col.bg, color: col.text })
                );
                $body.append($('<h4/>', { 'class': 'decade-card-title', text: item.title || '' }));

                $card.append($imgWrap, $body);
                $grid.append($card);

                $card.on('click keydown', function (e) {
                    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    openModal(item);
                });
            });

            $section.append($grid);
            $list.append($section);
        });
    }

    /* ── Filtering ──────────────────────────────────────────────────────── */
    function applyFilter(cat) {
        var fadeDur = _prefersReducedMotion ? 0 : 280;

        if (!cat || cat === 'all') {
            $('.js-decadeItem').fadeIn(fadeDur);
            $('.decade-section').show();
        } else {
            $('.js-decadeItem').hide();
            $('.js-decadeItem.' + cat).fadeIn(fadeDur);
            /* Collapse decade sections that have no matching stories */
            $('.decade-section').each(function () {
                var hasMatch = $(this).find('.js-decadeItem.' + cat).length > 0;
                $(this).toggle(hasMatch);
            });
        }
    }

    /* ── View switching ─────────────────────────────────────────────────── */
    function activateView(view) {
        $('.js-view-container').hide();
        $('.view-btn').removeClass('view-btn-active');

        if (view === 'decades') {
            $('.timelineFlat, .timelineLoader').hide();
            $('#decadesView').show();
            $('#view-decades').addClass('view-btn-active');
            setViewInURL('decades');
            window.scrollTo({ top: 0, behavior: _prefersReducedMotion ? 'auto' : 'smooth' });
        } else {
            $('.timelineFlat').show();
            $('#view-timeline').addClass('view-btn-active');
            setViewInURL(null);
        }
    }

    /* ── Public API ─────────────────────────────────────────────────────── */
    window.DecadesView = {

        init: function (data) {
            if (_initialized) return;
            _initialized = true;
            _data = data || [];

            renderDecades(_data);
            buildModal();

            $(document).on('click', '#view-decades', function () { activateView('decades'); });
        },

        activateFromURL: function () {
            if (getViewFromURL() === 'decades') activateView('decades');
        },

        filter: function (cat) {
            applyFilter(cat);
        }
    };

})(window, jQuery);
