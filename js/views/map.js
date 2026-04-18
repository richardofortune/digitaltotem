/* map.js — Map view for Digital Totem
 * Renders events with location data as coloured circle markers on a Leaflet map.
 * Click any marker to open the full story modal.
 * Filter buttons show/hide markers and re-fit the map bounds.
 *
 * Requires: Leaflet CSS + JS loaded before this script.
 *
 * Public API (window.MapView):
 *   .init(data)          — called once after events data is fetched
 *   .activateFromURL()   — switches to map if ?view=map
 *   .filter(category)    — called by filter buttons
 */
(function (window, $) {
    'use strict';

    var _data        = [];
    var _map         = null;
    var _markers     = [];   /* [{ marker, item, category }] */
    var _initialized = false;
    var _prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Category colours ──────────────────────────────────────────────── */
    var CAT_COLOURS = {
        life:    { fill: '#2ec27e', stroke: '#1a9e62' },
        work:    { fill: '#2563eb', stroke: '#1a4dcc' },
        passion: { fill: '#f59e0b', stroke: '#d4870a' },
        pivotal: { fill: '#ef4444', stroke: '#cc2e2e' },
        basic:   { fill: '#2d5bff', stroke: '#1f44d1' }
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
            if (line[0] === '<' && line[line.length - 1] === '>') { html.push(line); return; }
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
        if (view) { url.searchParams.set('view', view); } else { url.searchParams.delete('view'); }
        window.history.replaceState(null, '', url.toString());
    }

    /* ── Modal (reuses gallery-modal styles) ───────────────────────────── */
    function buildModal() {
        if ($('#mapModal').length) return;
        var html = [
            '<div id="mapModal" class="gallery-modal-overlay" role="dialog" aria-modal="true"',
            '     aria-labelledby="mapModalTitle" tabindex="-1" style="display:none">',
            '  <div class="gallery-modal-box" role="document">',
            '    <button class="gallery-modal-close" aria-label="Close story">&times;</button>',
            '    <div class="gallery-modal-hero-wrap">',
            '      <img class="gallery-modal-hero" id="mapModalHero" src="" alt=""/>',
            '    </div>',
            '    <div class="gallery-modal-content">',
            '      <div class="gallery-modal-meta">',
            '        <span class="gallery-modal-cat" id="mapModalCat"></span>',
            '        <span class="gallery-modal-date" id="mapModalDate"></span>',
            '      </div>',
            '      <h2 class="gallery-modal-title" id="mapModalTitle"></h2>',
            '      <div class="gallery-modal-body" id="mapModalBody"></div>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('\n');
        $('body').append(html);
        $('#mapModal').on('click', function (e) { if ($(e.target).is('#mapModal')) closeModal(); });
        $(document).on('click', '#mapModal .gallery-modal-close', closeModal);
        $(document).on('keydown.mapModal', function (e) {
            if (e.key === 'Escape' && $('#mapModal').is(':visible')) closeModal();
        });
    }

    var _lastFocused = null;

    function openModal(item) {
        buildModal();
        _lastFocused = document.activeElement;
        var hero = heroFor(item);
        var col  = colourFor(item.category || 'basic');
        var cat  = item.category ? (item.category.charAt(0).toUpperCase() + item.category.slice(1)) : '';
        $('#mapModalHero').attr('src', hero).attr('alt', escapeHtml(item.title || ''));
        $('#mapModalCat').text(cat).css({ background: col.fill, color: '#fff' });
        $('#mapModalDate').text(formatDate(item.dateIso));
        $('#mapModalTitle').text(item.detailTitle || item.title || '');
        var bodyHtml = item.bodyHtml || '';
        if (!bodyHtml && item.body) bodyHtml = renderMarkdown(item.body);
        $('#mapModalBody').html(bodyHtml || '<p>No further details available.</p>');
        $('body').addClass('gallery-modal-open');
        $('#mapModal').fadeIn(_prefersReducedMotion ? 0 : 180, function () { $(this).focus(); });
    }

    function closeModal() {
        $('#mapModal').fadeOut(_prefersReducedMotion ? 0 : 160, function () {
            $('body').removeClass('gallery-modal-open');
            if (_lastFocused) { _lastFocused.focus(); _lastFocused = null; }
        });
    }

    /* ── Map initialisation ─────────────────────────────────────────────── */
    function initMap() {
        if (_map || !window.L) return;

        _map = L.map('mapCanvas', {
            center: [20, 10],
            zoom: 2,
            minZoom: 1,
            maxZoom: 18,
            zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(_map);
    }

    function buildMarkers(data) {
        if (!_map || !window.L) return;

        data.forEach(function (item) {
            if (!item.location || item.location.lat == null || item.location.lng == null) return;
            if (!item.category || item.category === 'basic') return;

            var col = colourFor(item.category);
            var year = item.dateIso ? item.dateIso.slice(0, 4) : '';
            var isPrompt = item.type === 'prompt';
            var isMemory = item.type === 'memory';

            /* Prompt marker — dashed stroke, question mark label */
            if (isPrompt) {
                var promptMarker = L.circleMarker([item.location.lat, item.location.lng], {
                    radius: 14,
                    fillColor: 'transparent',
                    color: col.fill,
                    weight: 2,
                    opacity: 0.7,
                    fillOpacity: 0,
                    dashArray: '4 4'
                });

                promptMarker.bindTooltip(
                    '<strong style="font-style:italic">' + escapeHtml(item.question || item.title || '') + '</strong>' +
                    '<br><span style="opacity:0.7;font-size:11px">Unanswered question</span>',
                    { direction: 'top', offset: [0, -10], opacity: 0.95 }
                );

                promptMarker.on('click', function () {
                    if (window.PromptModal) window.PromptModal.open(item);
                });

                promptMarker.addTo(_map);
                _markers.push({ marker: promptMarker, item: item, category: item.category, type: 'prompt' });
                return;
            }

            /* Memory marker — smaller, softer appearance */
            if (isMemory) {
                var memMarker = L.circleMarker([item.location.lat, item.location.lng], {
                    radius: 9,
                    fillColor: col.fill,
                    color: '#ffffff',
                    weight: 1.5,
                    opacity: 0.8,
                    fillOpacity: 0.6
                });

                var memYear = item.dateIso ? item.dateIso.slice(0, 4) : (item.dateApprox || '');
                var memLocLabel = item.location.name ? '<br><span style="opacity:0.7;font-size:11px">' + escapeHtml(item.location.name) + '</span>' : '';
                memMarker.bindTooltip(
                    '<em>' + escapeHtml(item.title || '') + '</em>' +
                    (memYear ? ' · ' + memYear : '') + memLocLabel,
                    { direction: 'top', offset: [0, -6], opacity: 0.95 }
                );

                memMarker.on('click', function () { openModal(item); });

                memMarker.addTo(_map);
                _markers.push({ marker: memMarker, item: item, category: item.category, type: 'memory' });
                return;
            }

            /* Regular event marker */
            var marker = L.circleMarker([item.location.lat, item.location.lng], {
                radius: 11,
                fillColor: col.fill,
                color: '#ffffff',
                weight: 2.5,
                opacity: 1,
                fillOpacity: 0.9
            });

            /* Tooltip shown on hover */
            var locLabel = item.location.name ? '<br><span style="opacity:0.7;font-size:11px">' + escapeHtml(item.location.name) + '</span>' : '';
            marker.bindTooltip(
                '<strong>' + escapeHtml(item.title || '') + '</strong>' +
                (year ? ' · ' + year : '') + locLabel,
                { direction: 'top', offset: [0, -8], opacity: 0.95 }
            );

            marker.on('click', function () { openModal(item); });

            marker.addTo(_map);
            _markers.push({ marker: marker, item: item, category: item.category, type: 'event' });
        });

        fitBounds(_markers);
    }

    function fitBounds(visibleEntries) {
        if (!_map || !visibleEntries.length) return;
        var latLngs = visibleEntries.map(function (e) {
            return [e.item.location.lat, e.item.location.lng];
        });
        try {
            _map.fitBounds(latLngs, { padding: [40, 40], maxZoom: 10, animate: !_prefersReducedMotion });
        } catch (ex) { /* silently ignore bad bounds */ }
    }

    /* ── Filtering ──────────────────────────────────────────────────────── */
    function applyFilter(cat) {
        if (!_map) return;
        var visible = [];
        _markers.forEach(function (entry) {
            var show = !cat || cat === 'all' || entry.category === cat;
            if (show) {
                if (!_map.hasLayer(entry.marker)) entry.marker.addTo(_map);
                visible.push(entry);
            } else {
                if (_map.hasLayer(entry.marker)) _map.removeLayer(entry.marker);
            }
        });
        if (visible.length) fitBounds(visible);
    }

    /* ── View switching ─────────────────────────────────────────────────── */
    function activateView(view) {
        $('.js-view-container').hide();
        $('.view-btn').removeClass('view-btn-active');

        if (view === 'map') {
            $('.timelineFlat, .timelineLoader').hide();
            $('#mapView').show();
            $('#view-map').addClass('view-btn-active');
            setViewInURL('map');
            /* Leaflet needs to know its container size after becoming visible */
            if (_map) setTimeout(function () { _map.invalidateSize(); }, 50);
        } else {
            $('.timelineFlat').show();
            $('#view-timeline').addClass('view-btn-active');
            setViewInURL(null);
        }
    }

    /* ── Public API ─────────────────────────────────────────────────────── */
    window.MapView = {

        init: function (data) {
            if (_initialized) return;
            _initialized = true;
            _data = data || [];

            initMap();
            buildMarkers(_data);
            buildModal();

            $(document).on('click', '#view-map', function () { activateView('map'); });
        },

        activateFromURL: function () {
            if (getViewFromURL() === 'map') activateView('map');
        },

        filter: function (cat) {
            applyFilter(cat);
        }
    };

})(window, jQuery);
