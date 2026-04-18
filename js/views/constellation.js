/* constellation.js — Constellation view for Digital Totem
 * Renders events as nodes in a D3 force-directed graph.
 * Nodes are coloured by category; edges connect events that share tags or people.
 * Click any node to open the full story modal.
 * Filter buttons dim/hide unmatched nodes and their edges.
 *
 * Requires: D3 v7 loaded before this script.
 *
 * Public API (window.ConstellationView):
 *   .init(data)          — called once after events data is fetched
 *   .activateFromURL()   — switches to constellation if ?view=constellation
 *   .filter(category)    — called by filter buttons
 */
(function (window, $) {
    'use strict';

    var _data        = [];
    var _svg         = null;
    var _simulation  = null;
    var _initialized = false;
    var _currentCat  = 'all';
    var _prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Category colours ──────────────────────────────────────────────── */
    var CAT_COLOURS = {
        life:    { fill: '#2ec27e', stroke: '#1a9e62', glow: 'rgba(46,194,126,0.4)' },
        work:    { fill: '#2563eb', stroke: '#1a4dcc', glow: 'rgba(37,99,235,0.4)' },
        passion: { fill: '#f59e0b', stroke: '#d4870a', glow: 'rgba(245,158,11,0.4)' },
        pivotal: { fill: '#ef4444', stroke: '#cc2e2e', glow: 'rgba(239,68,68,0.4)' },
        basic:   { fill: '#2d5bff', stroke: '#1f44d1', glow: 'rgba(45,91,255,0.4)' }
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

    /* ── Modal ──────────────────────────────────────────────────────────── */
    function buildModal() {
        if ($('#constellationModal').length) return;
        var html = [
            '<div id="constellationModal" class="gallery-modal-overlay" role="dialog" aria-modal="true"',
            '     aria-labelledby="conModalTitle" tabindex="-1" style="display:none">',
            '  <div class="gallery-modal-box" role="document">',
            '    <button class="gallery-modal-close" aria-label="Close story">&times;</button>',
            '    <div class="gallery-modal-hero-wrap">',
            '      <img class="gallery-modal-hero" id="conModalHero" src="" alt=""/>',
            '    </div>',
            '    <div class="gallery-modal-content">',
            '      <div class="gallery-modal-meta">',
            '        <span class="gallery-modal-cat" id="conModalCat"></span>',
            '        <span class="gallery-modal-date" id="conModalDate"></span>',
            '      </div>',
            '      <h2 class="gallery-modal-title" id="conModalTitle"></h2>',
            '      <div class="gallery-modal-body" id="conModalBody"></div>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('\n');
        $('body').append(html);
        $('#constellationModal').on('click', function (e) {
            if ($(e.target).is('#constellationModal')) closeModal();
        });
        $(document).on('click', '#constellationModal .gallery-modal-close', closeModal);
        $(document).on('keydown.constellationModal', function (e) {
            if (e.key === 'Escape' && $('#constellationModal').is(':visible')) closeModal();
        });
    }

    var _lastFocused = null;

    function openModal(item) {
        buildModal();
        _lastFocused = document.activeElement;
        var hero = heroFor(item);
        var col  = colourFor(item.category || 'basic');
        var cat  = item.category ? (item.category.charAt(0).toUpperCase() + item.category.slice(1)) : '';
        $('#conModalHero').attr('src', hero).attr('alt', escapeHtml(item.title || ''));
        $('#conModalCat').text(cat).css({ background: col.fill, color: '#fff' });
        $('#conModalDate').text(formatDate(item.dateIso));
        $('#conModalTitle').text(item.detailTitle || item.title || '');
        var bodyHtml = item.bodyHtml || '';
        if (!bodyHtml && item.body) bodyHtml = renderMarkdown(item.body);
        $('#conModalBody').html(bodyHtml || '<p>No further details available.</p>');
        $('body').addClass('gallery-modal-open');
        $('#constellationModal').fadeIn(_prefersReducedMotion ? 0 : 180, function () { $(this).focus(); });
    }

    function closeModal() {
        $('#constellationModal').fadeOut(_prefersReducedMotion ? 0 : 160, function () {
            $('body').removeClass('gallery-modal-open');
            if (_lastFocused) { _lastFocused.focus(); _lastFocused = null; }
        });
    }

    /* ── Graph construction ─────────────────────────────────────────────── */
    function buildGraph(data) {
        var nodes = [];
        var links = [];

        /* Build node list — include all non-basic events that have meaningful metadata */
        data.forEach(function (item) {
            if (!item.category || item.category === 'basic') return;
            var isPrompt = item.type === 'prompt';
            var isMemory = item.type === 'memory';
            nodes.push({
                id:       item.id || item.title,
                item:     item,
                category: item.category,
                tags:     item.tags     || [],
                people:   item.people   || [],
                year:     item.dateIso  ? parseInt(item.dateIso.slice(0, 4), 10) : 0,
                type:     item.type || 'event',
                isPrompt: isPrompt,
                isMemory: isMemory
            });
        });

        /* Build edges from shared tags or people */
        for (var i = 0; i < nodes.length; i++) {
            for (var j = i + 1; j < nodes.length; j++) {
                var a = nodes[i];
                var b = nodes[j];
                var shared = [];

                a.tags.forEach(function (t) {
                    if (b.tags.indexOf(t) !== -1) shared.push({ type: 'tag', value: t });
                });
                a.people.forEach(function (p) {
                    if (b.people.indexOf(p) !== -1) shared.push({ type: 'person', value: p });
                });

                if (shared.length) {
                    links.push({
                        source:    a.id,
                        target:    b.id,
                        shared:    shared,
                        strength:  Math.min(shared.length / 3, 1)
                    });
                }
            }
        }

        return { nodes: nodes, links: links };
    }

    /* ── D3 render ──────────────────────────────────────────────────────── */
    function renderConstellation(data) {
        if (!window.d3) return;

        var container = document.getElementById('constellationCanvas');
        if (!container) return;

        var graph = buildGraph(data);
        if (!graph.nodes.length) {
            $(container).html('<p class="constellation-empty">No events with tags or connections yet. Add tags and people in the admin panel to see connections appear.</p>');
            return;
        }

        /* Clear any previous render */
        d3.select(container).selectAll('*').remove();

        var W = container.offsetWidth  || 800;
        var H = container.offsetHeight || 600;

        /* SVG root */
        var svg = d3.select(container)
            .append('svg')
            .attr('width', W)
            .attr('height', H)
            .attr('viewBox', '0 0 ' + W + ' ' + H)
            .style('display', 'block');

        _svg = svg;

        /* Defs: glow filters per category */
        var defs = svg.append('defs');
        Object.keys(CAT_COLOURS).forEach(function (cat) {
            var col = CAT_COLOURS[cat];
            var filter = defs.append('filter')
                .attr('id', 'glow-' + cat)
                .attr('x', '-50%').attr('y', '-50%')
                .attr('width', '200%').attr('height', '200%');
            filter.append('feGaussianBlur')
                .attr('stdDeviation', '3')
                .attr('result', 'coloredBlur');
            var feMerge = filter.append('feMerge');
            feMerge.append('feMergeNode').attr('in', 'coloredBlur');
            feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
        });

        /* Zoom & pan */
        var zoomG = svg.append('g').attr('class', 'constellation-zoom-group');
        svg.call(
            d3.zoom()
                .scaleExtent([0.3, 4])
                .on('zoom', function (event) {
                    zoomG.attr('transform', event.transform);
                })
        );

        /* Simulation */
        _simulation = d3.forceSimulation(graph.nodes)
            .force('link', d3.forceLink(graph.links)
                .id(function (d) { return d.id; })
                .distance(function (d) { return 120 - (d.strength * 40); })
                .strength(function (d) { return 0.3 + d.strength * 0.4; })
            )
            .force('charge', d3.forceManyBody().strength(-280))
            .force('center', d3.forceCenter(W / 2, H / 2))
            .force('collision', d3.forceCollide(30));

        if (_prefersReducedMotion) {
            _simulation.stop();
            for (var i = 0; i < 300; ++i) _simulation.tick();
        }

        /* Links */
        var linkG = zoomG.append('g').attr('class', 'constellation-links');
        var link = linkG.selectAll('line')
            .data(graph.links)
            .enter().append('line')
            .attr('class', 'constellation-link')
            .attr('stroke-width', function (d) { return 1 + d.strength; })
            .attr('stroke', 'rgba(255,255,255,0.18)')
            .attr('stroke-dasharray', function (d) {
                return d.shared[0].type === 'person' ? '4 3' : 'none';
            });

        /* Node groups */
        var nodeG = zoomG.append('g').attr('class', 'constellation-nodes');
        var node = nodeG.selectAll('g')
            .data(graph.nodes)
            .enter().append('g')
            .attr('class', function (d) {
                var classes = 'constellation-node';
                if (d.isPrompt) classes += ' constellation-node--prompt';
                if (d.isMemory) classes += ' constellation-node--memory';
                return classes;
            })
            .attr('tabindex', 0)
            .attr('role', 'button')
            .attr('aria-label', function (d) { return d.item.title || d.item.question || ''; })
            .style('cursor', 'pointer')
            .call(
                d3.drag()
                    .on('start', dragStart)
                    .on('drag',  dragged)
                    .on('end',   dragEnd)
            )
            .on('click', function (event, d) {
                event.stopPropagation();
                if (d.isPrompt && window.PromptModal) {
                    window.PromptModal.open(d.item);
                } else {
                    openModal(d.item);
                }
            })
            .on('keydown', function (event, d) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (d.isPrompt && window.PromptModal) {
                        window.PromptModal.open(d.item);
                    } else {
                        openModal(d.item);
                    }
                }
            });

        /* Outer glow ring — skip for prompts */
        node.filter(function (d) { return !d.isPrompt; })
            .append('circle')
            .attr('r', function (d) { return d.isMemory ? 14 : 17; })
            .attr('fill', function (d) { return colourFor(d.category).glow; })
            .attr('filter', function (d) { return 'url(#glow-' + d.category + ')'; })
            .attr('opacity', function (d) { return d.isMemory ? 0.6 : 1; });

        /* Main filled circle — different styles for prompts and memories */
        node.filter(function (d) { return !d.isPrompt; })
            .append('circle')
            .attr('r', function (d) { return d.isMemory ? 9 : 11; })
            .attr('fill', function (d) { return d.isMemory ? colourFor(d.category).fill : colourFor(d.category).fill; })
            .attr('stroke', '#ffffff')
            .attr('stroke-width', function (d) { return d.isMemory ? 1.5 : 2; })
            .attr('opacity', function (d) { return d.isMemory ? 0.8 : 1; });

        /* Prompt nodes — dashed circle with question mark */
        var promptNodes = node.filter(function (d) { return d.isPrompt; });
        promptNodes.append('circle')
            .attr('r', 14)
            .attr('fill', 'transparent')
            .attr('stroke', function (d) { return colourFor(d.category).fill; })
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4 3')
            .attr('opacity', 0.7);
        promptNodes.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('fill', function (d) { return colourFor(d.category).fill; })
            .attr('font-size', '16px')
            .attr('font-weight', '600')
            .attr('pointer-events', 'none')
            .attr('opacity', 0.7)
            .text('?');

        /* Year label below node */
        node.append('text')
            .attr('class', 'constellation-year')
            .attr('dy', function (d) { return d.isPrompt ? 30 : 26; })
            .attr('text-anchor', 'middle')
            .attr('fill', 'rgba(255,255,255,0.55)')
            .attr('font-size', '10px')
            .attr('font-style', function (d) { return d.isMemory ? 'italic' : 'normal'; })
            .attr('pointer-events', 'none')
            .text(function (d) { return d.year || ''; });

        /* Hover tooltip: title */
        node.append('title')
            .text(function (d) {
                var label = d.item.title || d.item.question || '';
                if (d.isPrompt) label = '? ' + label;
                return label + (d.year ? ' · ' + d.year : '');
            });

        /* Simulation tick */
        if (!_prefersReducedMotion) {
            _simulation.on('tick', function () {
                link
                    .attr('x1', function (d) { return d.source.x; })
                    .attr('y1', function (d) { return d.source.y; })
                    .attr('x2', function (d) { return d.target.x; })
                    .attr('y2', function (d) { return d.target.y; });
                node.attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')'; });
            });
        } else {
            link
                .attr('x1', function (d) { return d.source.x; })
                .attr('y1', function (d) { return d.source.y; })
                .attr('x2', function (d) { return d.target.x; })
                .attr('y2', function (d) { return d.target.y; });
            node.attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')'; });
        }

        /* Legend */
        buildLegend(svg, W, H);

        /* Store references for filtering */
        _svg._link = link;
        _svg._node = node;
        _svg._graph = graph;
    }

    function dragStart(event, d) {
        if (!_simulation) return;
        if (!event.active) _simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragEnd(event, d) {
        if (!_simulation) return;
        if (!event.active) _simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    function buildLegend(svg, W, H) {
        var cats = ['life', 'work', 'passion', 'pivotal'];
        var labels = { life: 'Life', work: 'Work', passion: 'Passion', pivotal: 'Pivotal' };
        var legendG = svg.append('g')
            .attr('class', 'constellation-legend')
            .attr('transform', 'translate(20,' + (H - 20 - (cats.length * 22)) + ')');

        cats.forEach(function (cat, i) {
            var g = legendG.append('g').attr('transform', 'translate(0,' + (i * 22) + ')');
            g.append('circle').attr('r', 6).attr('cx', 6).attr('cy', 6)
                .attr('fill', CAT_COLOURS[cat].fill).attr('stroke', '#fff').attr('stroke-width', 1.5);
            g.append('text').attr('x', 18).attr('y', 10)
                .attr('fill', 'rgba(255,255,255,0.7)').attr('font-size', '12px')
                .text(labels[cat]);
        });

        /* Edge type legend */
        var edgeG = svg.append('g')
            .attr('class', 'constellation-edge-legend')
            .attr('transform', 'translate(20,' + (H - 10) + ')');

        edgeG.append('line').attr('x1', 0).attr('y1', -6).attr('x2', 24).attr('y2', -6)
            .attr('stroke', 'rgba(255,255,255,0.4)').attr('stroke-width', 1.5);
        edgeG.append('text').attr('x', 30).attr('y', -2).attr('fill', 'rgba(255,255,255,0.5)')
            .attr('font-size', '11px').text('shared tag');

        edgeG.append('line').attr('x1', 120).attr('y1', -6).attr('x2', 144).attr('y2', -6)
            .attr('stroke', 'rgba(255,255,255,0.4)').attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '4 3');
        edgeG.append('text').attr('x', 150).attr('y', -2).attr('fill', 'rgba(255,255,255,0.5)')
            .attr('font-size', '11px').text('shared person');
    }

    /* ── Filtering ──────────────────────────────────────────────────────── */
    function applyFilter(cat) {
        _currentCat = cat || 'all';
        if (!_svg || !_svg._node) return;

        var activeIds = {};
        _svg._graph.nodes.forEach(function (n) {
            var show = !cat || cat === 'all' || n.category === cat;
            activeIds[n.id] = show;
        });

        _svg._node
            .attr('opacity', function (d) { return activeIds[d.id] ? 1 : 0.12; })
            .attr('pointer-events', function (d) { return activeIds[d.id] ? 'all' : 'none'; });

        _svg._link
            .attr('opacity', function (d) {
                var srcId = typeof d.source === 'object' ? d.source.id : d.source;
                var tgtId = typeof d.target === 'object' ? d.target.id : d.target;
                return (activeIds[srcId] && activeIds[tgtId]) ? 1 : 0.05;
            });
    }

    /* ── View switching ─────────────────────────────────────────────────── */
    function activateView(view) {
        $('.js-view-container').hide();
        $('.view-btn').removeClass('view-btn-active');

        if (view === 'constellation') {
            $('.timelineFlat, .timelineLoader').hide();
            $('#constellationView').show();
            $('#view-constellation').addClass('view-btn-active');
            setViewInURL('constellation');
            /* Re-render on first activate or if canvas size changed */
            renderConstellation(_data);
        } else {
            $('.timelineFlat').show();
            $('#view-timeline').addClass('view-btn-active');
            setViewInURL(null);
        }
    }

    /* ── Resize handling ────────────────────────────────────────────────── */
    var _resizeTimer = null;
    $(window).on('resize.constellation', function () {
        if ($('#constellationView').is(':visible')) {
            clearTimeout(_resizeTimer);
            _resizeTimer = setTimeout(function () {
                if (_simulation) { _simulation.stop(); _simulation = null; }
                _svg = null;
                renderConstellation(_data);
                applyFilter(_currentCat);
            }, 250);
        }
    });

    /* ── Public API ─────────────────────────────────────────────────────── */
    window.ConstellationView = {

        init: function (data) {
            if (_initialized) return;
            _initialized = true;
            _data = data || [];

            buildModal();

            $(document).on('click', '#view-constellation', function () {
                activateView('constellation');
            });
        },

        activateFromURL: function () {
            if (getViewFromURL() === 'constellation') activateView('constellation');
        },

        filter: function (cat) {
            applyFilter(cat);
        }
    };

})(window, jQuery);
