/* valence.js — Valence scatter plot view for Digital Totem
 * Renders events on a D3 scatter plot: x = time, y = valence, bubble size = impact.
 * Unscored events appear as small grey dots on the neutral line.
 * Click any bubble to open the full story modal.
 * Filter buttons show/hide bubbles by category.
 *
 * Requires: D3 v7 loaded before this script.
 *
 * Public API (window.ValenceView):
 *   .init(data)          — called once after events data is fetched
 *   .activateFromURL()   — switches to valence if ?view=valence
 *   .filter(category)    — called by filter buttons
 */
(function (window, $) {
    'use strict';

    var _data        = [];
    var _svg         = null;
    var _initialized = false;
    var _currentCat  = 'all';
    var _tooltip     = null;
    var _prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Category colours ──────────────────────────────────────────────── */
    var CAT_COLOURS = {
        life:    { fill: '#2ec27e', border: '#26a36a' },
        work:    { fill: '#2563eb', border: '#1e4fc2' },
        passion: { fill: '#f59e0b', border: '#d68a09' },
        pivotal: { fill: '#ef4444', border: '#c33' },
        basic:   { fill: '#2d5bff', border: '#1f44d1' }
    };

    var UNSCORED_COLOUR = { fill: '#6b7280', border: '#4b5563' };

    /* Sizing constants */
    var MARGIN = { top: 50, right: 50, bottom: 70, left: 70 };
    var MIN_BUBBLE_RADIUS = 6;
    var MAX_BUBBLE_RADIUS = 28;
    var UNSCORED_RADIUS = 4;

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

    function formatValence(val) {
        if (val == null) return 'unscored';
        var sign = val >= 0 ? '+' : '';
        return sign + val.toFixed(1);
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

    /* ── Modal ──────────────────────────────────────────────────────────── */
    function buildModal() {
        if ($('#valenceModal').length) return;
        var html = [
            '<div id="valenceModal" class="gallery-modal-overlay" role="dialog" aria-modal="true"',
            '     aria-labelledby="valModalTitle" tabindex="-1" style="display:none">',
            '  <div class="gallery-modal-box" role="document">',
            '    <button class="gallery-modal-close" aria-label="Close story">&times;</button>',
            '    <div class="gallery-modal-hero-wrap">',
            '      <img class="gallery-modal-hero" id="valModalHero" src="" alt=""/>',
            '    </div>',
            '    <div class="gallery-modal-content">',
            '      <div class="gallery-modal-meta">',
            '        <span class="gallery-modal-cat" id="valModalCat"></span>',
            '        <span class="gallery-modal-date" id="valModalDate"></span>',
            '      </div>',
            '      <h2 class="gallery-modal-title" id="valModalTitle"></h2>',
            '      <div class="gallery-modal-body" id="valModalBody"></div>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('\n');
        $('body').append(html);
        $('#valenceModal').on('click', function (e) {
            if ($(e.target).is('#valenceModal')) closeModal();
        });
        $(document).on('click', '#valenceModal .gallery-modal-close', closeModal);
        $(document).on('keydown.valenceModal', function (e) {
            if (e.key === 'Escape' && $('#valenceModal').is(':visible')) closeModal();
        });
    }

    var _lastFocused = null;

    function openModal(item) {
        buildModal();
        _lastFocused = document.activeElement;
        var hero = heroFor(item);
        var col  = colourFor(item.category || 'basic');
        var cat  = item.category ? (item.category.charAt(0).toUpperCase() + item.category.slice(1)) : '';
        $('#valModalHero').attr('src', hero).attr('alt', escapeHtml(item.title || ''));
        $('#valModalCat').text(cat).css({ background: col.fill, color: '#fff' });
        $('#valModalDate').text(formatDate(item.dateIso));
        $('#valModalTitle').text(item.detailTitle || item.title || '');
        var bodyHtml = item.bodyHtml || '';
        if (!bodyHtml && item.body) bodyHtml = renderMarkdown(item.body);
        $('#valModalBody').html(bodyHtml || '<p>No further details available.</p>');
        $('body').addClass('gallery-modal-open');
        $('#valenceModal').fadeIn(_prefersReducedMotion ? 0 : 180, function () { $(this).focus(); });
    }

    function closeModal() {
        $('#valenceModal').fadeOut(_prefersReducedMotion ? 0 : 160, function () {
            $('body').removeClass('gallery-modal-open');
            if (_lastFocused) { _lastFocused.focus(); _lastFocused = null; }
        });
    }

    /* ── Tooltip ────────────────────────────────────────────────────────── */
    function createTooltip() {
        if (_tooltip) return _tooltip;
        _tooltip = d3.select('body')
            .append('div')
            .attr('class', 'valence-tooltip')
            .style('opacity', 0)
            .style('pointer-events', 'none');
        return _tooltip;
    }

    function showTooltip(event, d) {
        var tip = createTooltip();
        var html = '<div class="valence-tooltip-title">' + escapeHtml(d.item.title) + '</div>' +
                   '<div class="valence-tooltip-date">' + formatDate(d.item.dateIso) + '</div>' +
                   '<div class="valence-tooltip-score">Valence: ' + formatValence(d.valence) + '</div>';
        tip.html(html)
            .style('left', (event.pageX + 12) + 'px')
            .style('top', (event.pageY - 12) + 'px')
            .transition()
            .duration(_prefersReducedMotion ? 0 : 100)
            .style('opacity', 1);
    }

    function hideTooltip() {
        if (_tooltip) {
            _tooltip.transition()
                .duration(_prefersReducedMotion ? 0 : 100)
                .style('opacity', 0);
        }
    }

    /* ── Data preparation ───────────────────────────────────────────────── */
    function prepareData(data) {
        var plotData = [];
        data.forEach(function (item) {
            /* Skip prompts and basic category */
            if (item.type === 'prompt') return;
            if (item.category === 'basic') return;
            if (!item.dateIso) return;

            var date = new Date(item.dateIso + 'T12:00:00');
            if (isNaN(date.getTime())) return;

            var isScored = (item.valence != null || item.impact != null);
            plotData.push({
                item:     item,
                date:     date,
                valence:  item.valence != null ? item.valence : 0,
                impact:   item.impact  != null ? item.impact  : 0.2,
                isScored: isScored,
                category: item.category || 'basic'
            });
        });

        plotData.sort(function (a, b) { return a.date - b.date; });
        return plotData;
    }

    /* ── Rolling average calculation ────────────────────────────────────── */
    function calculateRollingAverage(plotData, windowDays) {
        if (!plotData.length) return [];

        var scored = plotData.filter(function (d) { return d.isScored; });
        if (scored.length < 2) return [];

        var windowMs = windowDays * 24 * 60 * 60 * 1000;
        var avgPoints = [];

        scored.forEach(function (d, i) {
            var windowEnd   = d.date.getTime();
            var windowStart = windowEnd - windowMs;
            var inWindow = scored.filter(function (dd) {
                var t = dd.date.getTime();
                return t >= windowStart && t <= windowEnd;
            });
            var sum = inWindow.reduce(function (acc, dd) { return acc + dd.valence; }, 0);
            avgPoints.push({
                date:    d.date,
                average: sum / inWindow.length
            });
        });

        return avgPoints;
    }

    /* ── D3 render ──────────────────────────────────────────────────────── */
    function renderValencePlot(data) {
        if (!window.d3) return;

        var container = document.getElementById('valenceCanvas');
        if (!container) return;

        var plotData = prepareData(data);
        if (!plotData.length) {
            $(container).html('<p class="valence-empty">No events with dates found. Add dates to your events to see them on the valence chart.</p>');
            return;
        }

        /* Clear any previous render */
        d3.select(container).selectAll('*').remove();

        var W = container.offsetWidth  || 800;
        var H = container.offsetHeight || 600;
        var innerW = W - MARGIN.left - MARGIN.right;
        var innerH = H - MARGIN.top  - MARGIN.bottom;

        /* SVG root */
        var svg = d3.select(container)
            .append('svg')
            .attr('width', W)
            .attr('height', H)
            .attr('viewBox', '0 0 ' + W + ' ' + H)
            .style('display', 'block');

        _svg = svg;

        /* Chart area group */
        var chartG = svg.append('g')
            .attr('transform', 'translate(' + MARGIN.left + ',' + MARGIN.top + ')');

        /* Scales */
        var dateExtent = d3.extent(plotData, function (d) { return d.date; });
        var pad = (dateExtent[1] - dateExtent[0]) * 0.05;
        var xScale = d3.scaleTime()
            .domain([new Date(dateExtent[0].getTime() - pad), new Date(dateExtent[1].getTime() + pad)])
            .range([0, innerW]);

        var yScale = d3.scaleLinear()
            .domain([-1, 1])
            .range([innerH, 0]);

        var rScale = d3.scaleSqrt()
            .domain([0, 1])
            .range([MIN_BUBBLE_RADIUS, MAX_BUBBLE_RADIUS]);

        /* Background zones */
        chartG.append('rect')
            .attr('class', 'valence-zone-positive')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', innerW)
            .attr('height', innerH / 2);

        chartG.append('rect')
            .attr('class', 'valence-zone-negative')
            .attr('x', 0)
            .attr('y', innerH / 2)
            .attr('width', innerW)
            .attr('height', innerH / 2);

        /* Neutral line at y=0 */
        chartG.append('line')
            .attr('class', 'valence-zero-line')
            .attr('x1', 0)
            .attr('y1', yScale(0))
            .attr('x2', innerW)
            .attr('y2', yScale(0));

        /* X axis */
        var xAxis = d3.axisBottom(xScale)
            .tickFormat(d3.timeFormat('%Y'))
            .tickSize(-innerH)
            .tickPadding(12);

        chartG.append('g')
            .attr('class', 'valence-axis valence-axis-x')
            .attr('transform', 'translate(0,' + innerH + ')')
            .call(xAxis)
            .selectAll('line')
            .attr('stroke', 'rgba(255,255,255,0.08)');

        /* Y axis */
        var yAxis = d3.axisLeft(yScale)
            .tickValues([-1, -0.5, 0, 0.5, 1])
            .tickFormat(function (d) {
                if (d === 1) return '+1 (joyful)';
                if (d === -1) return '-1 (difficult)';
                if (d === 0) return '0';
                return (d > 0 ? '+' : '') + d;
            })
            .tickSize(-innerW)
            .tickPadding(12);

        chartG.append('g')
            .attr('class', 'valence-axis valence-axis-y')
            .call(yAxis)
            .selectAll('line')
            .attr('stroke', 'rgba(255,255,255,0.08)');

        /* Rolling average trend line */
        var avgData = calculateRollingAverage(plotData, 730); /* 2 years */
        if (avgData.length >= 2) {
            var lineGen = d3.line()
                .x(function (d) { return xScale(d.date); })
                .y(function (d) { return yScale(d.average); })
                .curve(d3.curveCatmullRom);

            chartG.append('path')
                .datum(avgData)
                .attr('class', 'valence-trend-line')
                .attr('d', lineGen);
        }

        /* Bubbles group */
        var bubblesG = chartG.append('g').attr('class', 'valence-bubbles');

        /* Draw bubbles */
        var bubbles = bubblesG.selectAll('circle')
            .data(plotData)
            .enter()
            .append('circle')
            .attr('class', function (d) {
                return 'valence-bubble ' + d.category + (d.isScored ? '' : ' valence-bubble--unscored');
            })
            .attr('cx', function (d) { return xScale(d.date); })
            .attr('cy', function (d) { return d.isScored ? yScale(d.valence) : yScale(0); })
            .attr('r', function (d) { return d.isScored ? rScale(d.impact) : UNSCORED_RADIUS; })
            .attr('fill', function (d) {
                if (!d.isScored) return UNSCORED_COLOUR.fill;
                return colourFor(d.category).fill;
            })
            .attr('stroke', function (d) {
                if (!d.isScored) return UNSCORED_COLOUR.border;
                return '#fff';
            })
            .attr('stroke-width', function (d) { return d.isScored ? 2 : 1; })
            .attr('tabindex', 0)
            .attr('role', 'button')
            .attr('aria-label', function (d) {
                return d.item.title + ' — ' + formatDate(d.item.dateIso);
            })
            .style('cursor', 'pointer')
            .on('mouseenter', function (event, d) { showTooltip(event, d); })
            .on('mousemove', function (event, d) { showTooltip(event, d); })
            .on('mouseleave', hideTooltip)
            .on('click', function (event, d) {
                event.stopPropagation();
                openModal(d.item);
            })
            .on('keydown', function (event, d) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openModal(d.item);
                }
            });

        /* Legend */
        buildLegend(svg, W, H);

        /* Store references for filtering */
        _svg._bubbles = bubbles;
        _svg._plotData = plotData;
    }

    function buildLegend(svg, W, H) {
        var cats = ['life', 'work', 'passion', 'pivotal'];
        var labels = { life: 'Life', work: 'Work', passion: 'Passion', pivotal: 'Pivotal' };

        var legendG = svg.append('g')
            .attr('class', 'valence-legend')
            .attr('transform', 'translate(20,' + (H - 20 - (cats.length + 1) * 22) + ')');

        cats.forEach(function (cat, i) {
            var g = legendG.append('g').attr('transform', 'translate(0,' + (i * 22) + ')');
            g.append('circle').attr('r', 6).attr('cx', 6).attr('cy', 6)
                .attr('fill', CAT_COLOURS[cat].fill).attr('stroke', '#fff').attr('stroke-width', 1.5);
            g.append('text').attr('x', 18).attr('y', 10)
                .attr('fill', 'rgba(255,255,255,0.7)').attr('font-size', '12px')
                .text(labels[cat]);
        });

        /* Unscored legend item */
        var unscored = legendG.append('g').attr('transform', 'translate(0,' + (cats.length * 22) + ')');
        unscored.append('circle').attr('r', 4).attr('cx', 6).attr('cy', 6)
            .attr('fill', UNSCORED_COLOUR.fill).attr('stroke', UNSCORED_COLOUR.border).attr('stroke-width', 1);
        unscored.append('text').attr('x', 18).attr('y', 10)
            .attr('fill', 'rgba(255,255,255,0.5)').attr('font-size', '12px')
            .text('Unscored');

        /* Impact size legend */
        var sizeG = svg.append('g')
            .attr('class', 'valence-size-legend')
            .attr('transform', 'translate(' + (W - 120) + ',' + (H - 60) + ')');

        sizeG.append('text')
            .attr('fill', 'rgba(255,255,255,0.5)')
            .attr('font-size', '11px')
            .text('Impact:');

        var sizes = [0.2, 0.5, 1.0];
        var sizeLabels = ['Low', 'Med', 'High'];
        var sizeScale = d3.scaleSqrt().domain([0, 1]).range([MIN_BUBBLE_RADIUS, MAX_BUBBLE_RADIUS]);
        var xOff = 50;

        sizes.forEach(function (s, i) {
            var r = sizeScale(s);
            sizeG.append('circle')
                .attr('cx', xOff)
                .attr('cy', 0)
                .attr('r', r)
                .attr('fill', 'none')
                .attr('stroke', 'rgba(255,255,255,0.3)')
                .attr('stroke-width', 1);
            sizeG.append('text')
                .attr('x', xOff)
                .attr('y', 20)
                .attr('text-anchor', 'middle')
                .attr('fill', 'rgba(255,255,255,0.4)')
                .attr('font-size', '9px')
                .text(sizeLabels[i]);
            xOff += 45;
        });
    }

    /* ── Filtering ──────────────────────────────────────────────────────── */
    function applyFilter(cat) {
        _currentCat = cat || 'all';
        if (!_svg || !_svg._bubbles) return;

        _svg._bubbles
            .transition()
            .duration(_prefersReducedMotion ? 0 : 180)
            .attr('opacity', function (d) {
                if (!cat || cat === 'all') return 1;
                return d.category === cat ? 1 : 0.12;
            })
            .attr('pointer-events', function (d) {
                if (!cat || cat === 'all') return 'all';
                return d.category === cat ? 'all' : 'none';
            });
    }

    /* ── View switching ─────────────────────────────────────────────────── */
    function activateView(view) {
        $('.js-view-container').hide();
        $('.view-btn').removeClass('view-btn-active');

        if (view === 'valence') {
            $('.timelineFlat, .timelineLoader').hide();
            $('#valenceView').show();
            $('#view-valence').addClass('view-btn-active');
            setViewInURL('valence');
            renderValencePlot(_data);
            applyFilter(_currentCat);
        } else {
            $('.timelineFlat').show();
            $('#view-timeline').addClass('view-btn-active');
            setViewInURL(null);
        }
    }

    /* ── Resize handling ────────────────────────────────────────────────── */
    var _resizeTimer = null;
    $(window).on('resize.valence', function () {
        if ($('#valenceView').is(':visible')) {
            clearTimeout(_resizeTimer);
            _resizeTimer = setTimeout(function () {
                _svg = null;
                renderValencePlot(_data);
                applyFilter(_currentCat);
            }, 250);
        }
    });

    /* ── Public API ─────────────────────────────────────────────────────── */
    window.ValenceView = {

        init: function (data) {
            if (_initialized) return;
            _initialized = true;
            _data = data || [];

            buildModal();
            createTooltip();

            $(document).on('click', '#view-valence', function () {
                activateView('valence');
            });
        },

        activateFromURL: function () {
            if (getViewFromURL() === 'valence') activateView('valence');
        },

        filter: function (cat) {
            applyFilter(cat);
        }
    };

})(window, jQuery);
