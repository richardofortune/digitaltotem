(function ($) {
    var isMobile = (window.matchMedia && window.matchMedia('(max-width: 767px)').matches) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var scrollTopVal = 0;
    var tlineWid = 0;
    var startItemDefault = '11/08/1978';

    var getFilterFromURL = function () {
        if (!window.URLSearchParams) return null;
        return new URLSearchParams(window.location.search).get('filter') || null;
    };

    var setFilterInURL = function (filterClass) {
        if (!window.history || !window.history.replaceState || !window.URL) return;
        var url = new URL(window.location.href);
        if (filterClass && filterClass !== 'all') {
            url.searchParams.set('filter', filterClass);
        } else {
            url.searchParams.delete('filter');
        }
        window.history.replaceState(null, '', url.toString());
    };

    var escapeHtml = function (str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    };

    // Minimal Markdown renderer for headings, lists, images, links, bold/italic, and paragraphs.
    var renderMarkdown = function (md) {
        if (!md) return '';
        var formatInline = function (text) {
            return text
                .replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img class="con_borderImage" src="$2" alt="$1"/>')
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
                if (inList) {
                    html.push('</ul>');
                    inList = false;
                }
                return;
            }
            var headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
            if (headingMatch) {
                if (inList) {
                    html.push('</ul>');
                    inList = false;
                }
                var level = headingMatch[1].length;
                html.push('<h' + level + '>' + formatInline(escapeHtml(headingMatch[2])) + '</h' + level + '>');
                return;
            }
            if (line.indexOf('- ') === 0) {
                if (!inList) {
                    html.push('<ul>');
                    inList = true;
                }
                html.push('<li>' + formatInline(escapeHtml(line.slice(2))) + '</li>');
                return;
            }
            if (inList) {
                html.push('</ul>');
                inList = false;
            }
            // Allow raw HTML passthrough for embeds if author includes it
            if (line[0] === '<' && line[line.length - 1] === '>') {
                html.push(line);
                return;
            }
            html.push('<p>' + formatInline(escapeHtml(line)) + '</p>');
        });
        if (inList) html.push('</ul>');
        return html.join('');
    };

    var renderTimelineItems = function (data) {
        if (!Array.isArray(data) || !data.length) return;
        var defaultHeroImages = {
            basic: 'images/flat/default/key_experience.jpg',
            life: 'images/flat/default/key_life.jpg',
            work: 'images/flat/default/key_work.jpg',
            pivotal: 'images/flat/default/key_experience.jpg',
            passion: 'images/flat/default/key_passion.jpg'
        };
        var defaultHeroForCategory = function (category) {
            return defaultHeroImages[category] || defaultHeroImages.basic;
        };
        var $container = $('.timelineFlat .mobile-row');
        if (!$container.length) return;
        $container.empty();
        data.forEach(function (item) {
            var category = item.category || '';
            var filterable = item.filterable !== false && category && category !== 'basic';
            var itemClasses = ['item'];
            if (filterable) {
                itemClasses.push('js-filterItem', category);
            } else if (category) {
                itemClasses.push(category);
            }

            /* Skip prompt entries — handled by the prompt banner above the timeline */
            if (item.type === 'prompt') return;

            var $item = $('<div/>', {
                'class': itemClasses.join(' '),
                'data-id': item.id,
                'data-description': item.description || ''
            });
            var $icon;
            if (item.icon && typeof item.icon === 'string' && item.icon.startsWith('iconify:')) {
                var iconClasses = ['icon', 'mytextwithicon', 'has-iconify'];
                if (category) iconClasses.push(category);
                $icon = $('<div/>', {'class': iconClasses.join(' ')});
                $icon.append($('<span/>', {
                    'class': 'timeline-card-icon iconify-inline',
                    'data-icon': item.icon.replace('iconify:', ''),
                    'data-width': 96,
                    'data-height': 96
                }));
            } else {
                var iconClasses = ['icon', 'mytextwithicon'];
                if (category) iconClasses.push(category);
                if (item.icon) iconClasses.push(item.icon);
                $icon = $('<div/>', {'class': iconClasses.join(' ')});
            }
            if (item.lightbox && item.lightbox.href) {
                var $anchor = $('<a/>', {
                    'class': 'image_rollover_bottom con_borderImage',
                    'data-description': item.lightbox.description || 'ZOOM IN',
                    'href': item.lightbox.href,
                    'rel': item.lightbox.rel || 'lightbox[timeline]'
                });
                $anchor.append($icon);
                $item.append($anchor);
            } else {
                $item.append($icon);
            }
            $item.append($('<h2/>').text(item.title || ''));
            $item.append($('<span/>').text(typeof item.summary === 'string' ? item.summary : ''));
            $item.append($('<div/>', {'class': 'read_more', 'data-id': item.id}).text('Read more'));

            var detailHtml = item.bodyHtml;
            if (!detailHtml && item.body) {
                var imageHtml = '';
                var heroImage = item.media && item.media.image ? item.media.image : defaultHeroForCategory(category);
                if (heroImage) {
                    var imgTag = '<img class="con_borderImage timeline-hero-image" src="' + escapeHtml(heroImage) + '" alt=""/>';
                    // Wrap in lightbox anchor for zoom experience; make it block-level so it spans the card
                    imageHtml = '<a class="image_rollover_bottom con_borderImage timeline-hero-link" data-description="' + escapeHtml((item.media && item.media.description) || 'ZOOM IN') + '" href="' + escapeHtml(heroImage) + '" rel="lightbox[timeline]">' + imgTag + '</a>';
                }
                detailHtml = '<div class="timeline_open_content">' + imageHtml + '<div class="timeline-body"><h2 class="no-marg-top">' + escapeHtml(item.detailTitle || item.title || '') + '</h2><span>' + renderMarkdown(item.body) + '</span></div></div>';
            }
            var $open = $('<div/>', {'class': 'item_open', 'data-id': item.id});
            var $openContent = $('<div/>', {'class': 'item_open_content'});
            if (detailHtml) {
                $openContent.html(detailHtml);
            } else {
                $openContent.append($('<img/>', {'class': 'ajaxloader', src: 'images/timeline/loadingAnimation.gif', alt: ''}));
            }
            $open.append($openContent);

            $container.append($item, $open);
        });
        // Force Iconify to scan the container for new icons
        if (window.Iconify && typeof window.Iconify.scan === 'function') {
            window.Iconify.scan($container[0]);
        }
    };
    var updateNodesForFilter = function (filterClass) {
        var $nodes = $('.tl1 .t_line_node');
        $('.tl1 .item').each(function (idx) {
            var $item = $(this);
            var $node = $nodes.eq(idx);
            if (!$node.length) return;
            if (!filterClass || $item.hasClass(filterClass)) {
                $node.removeClass('node-hidden');
            } else {
                $node.addClass('node-hidden');
            }
        });
    };
    $.filterMe = function () {
        var fadeDuration = prefersReducedMotion ? 0 : 450;
        var $btns = $('.btn').click(function () {
            tlineWid = 0;
            if (window.GalleryView)       window.GalleryView.filter(this.id);
            if (window.ChaptersView)      window.ChaptersView.filter(this.id);
            if (window.DecadesView)       window.DecadesView.filter(this.id);
            if (window.MapView)           window.MapView.filter(this.id);
            if (window.ConstellationView) window.ConstellationView.filter(this.id);
            if (window.ValenceView)       window.ValenceView.filter(this.id);
            if (this.id == 'all') {
                $('.js-filterItem').fadeIn(fadeDuration);
                $('.js-filter').fadeIn(fadeDuration);
                updateNodesForFilter(null);
            } else {
                var $el = $('.' + this.id);
                $('.js-filterItem').each(function () {
                    if ($(this).is($el)) {
                        return;
                    } else {
                        tlineWid += 448;
                    }
                });
                $('.js-filterItem, .js-filter').not($el).hide();
                $el.fadeIn(fadeDuration);
                updateNodesForFilter(this.id);
            }
            setFilterInURL(this.id);
            $btns.removeClass('active');
            $(this).addClass('active');
            if (!isMobile) {
                $('.tl1').timeline('goTo', '01/01/1970');
                $('.tl1').timeline('right');
            }
        });
        // Apply filter from URL on initial page load
        var initialFilter = getFilterFromURL();
        if (initialFilter && initialFilter !== 'all') {
            $('#' + initialFilter).trigger('click');
        }
    };
    $.readMore = function (dataid) {
        if (isMobile) {
            $('.item_open').hide();
        }
        var j = 0;
        $('.item_open').each(function (i) {
            if ($('.item').eq(i).css('display') == 'block') {
                j -= 400;
            }
            if ($(this).data('id') == dataid) {
                var $newThis = $(this);
                if (isMobile) {
                    // Open content and move margin
                    $(this).stop(true).show().animate({width: '100%', marginLeft: 2.5, marginRight: 2.5}, prefersReducedMotion ? 0 : 500, 'easeOutSine');
                    if (typeof $(this).attr('data-access') != 'undefined' && $(this).attr('data-access') != '') {
                        var action = $(this).attr('data-access');
                        $.get(action, function (data) {
                            $('body').append('<div class="ajax_preloading_holder" style="display:none"></div>');
                            $('.ajax_preloading_holder').html(data);
                            $newThis.find('.item_open_cwrapper').css({'width': '96%'});
                            if ($('.ajax_preloading_holder img').length > 0) {
                            $('.ajax_preloading_holder img').on('load', function () {
                                $newThis.find('.item_open_content').html(data);
                                $('.ajax_preloading_holder').remove();
                                $newThis.attr('data-access', '');
                                /* trigger */
                                var event = jQuery.Event('ajaxLoaded.timeline');
                                event.element = $newThis.find('.item_open_content');
                                $("body").trigger(event);
                            });
                        } else {
                            $newThis.find('.item_open_content').html(data);
                            $('.ajax_preloading_holder').remove();
                            $newThis.attr('data-access', '');
                            /* trigger */
                            var event = jQuery.Event('ajaxLoaded.timeline');
                            event.element = $newThis.find('.item_open_content');
                            $("body").trigger(event);
                        }
                    }, 'text').fail(function () {
                        data = '<div class="timeline_open_content"><h2 class="no-marg-top">Ajax request has failed.</h2></div>';
                        $newThis.find('.item_open_content').html(data);
                        $('.ajax_preloading_holder').remove();
                        $newThis.attr('data-access', '');
                        /* trigger */
                        var event = jQuery.Event('ajaxLoaded.timeline');
                        event.element = $newThis.find('.item_open_content');
                            $("body").trigger(event);
                        });
                        $(document, document.body).scrollTop(scrollTopVal);
                    }
                } else {
                    $('.timeline_items').stop(true).css({
                        marginLeft: j
                    });
                    return;
                }
            }
        });
    };
(function initApp($) {
    var initializeTimeline = function (startItem) {
        if (initializeTimeline.done) return;
        initializeTimeline.done = true;
        var startId = startItem || startItemDefault;
        if (!isMobile) {
            $('.tl1').timeline({
                openTriggerClass: '.read_more',
                startItem: startId,
                closeText: 'x',
                ajaxFailMessage: "Oops, something has gone wrong. I apologise, but hopefully you saw enough to want to chat more? Drop me a line xyz@cuckoobydesign.mozmail.com and I'll make it right "
            });
            $('.tl1').on('ajaxLoaded.timeline', function (e) {
                var $span = e.element.find('.timeline_open_content span');
                if ($span.length) {
                    $span.css({'max-height': 'none', 'overflow': 'visible'});
                    if (typeof $span.mCustomScrollbar === 'function' && $span.hasClass('mCustomScrollbar')) {
                        $span.mCustomScrollbar('destroy');
                    }
                }
            });
            // Color-code timeline nodes to match item categories
            (function colorNodes() {
                var nodes = $('.tl1 .t_line_node');
                $('.tl1 .item').each(function (idx) {
                    var $item = $(this);
                    var $node = nodes.eq(idx);
                    if (!$node.length) return;
                    if ($item.hasClass('life')) {
                        $node.addClass('node-life');
                    } else if ($item.hasClass('work')) {
                        $node.addClass('node-work');
                    } else if ($item.hasClass('passion')) {
                        $node.addClass('node-passion');
                    } else if ($item.hasClass('pivotal')) {
                        $node.addClass('node-pivotal');
                    } else {
                        $node.addClass('node-basic');
                    }
                });
            })();
            $('.tl1').timeline('right');
            $('.btn').css({
                'margin-top': '10px'
            });
            $('.read_more').click(function () {
                var dataid = $(this).data('id');
                $.readMore(dataid);
            });
        } else {
            $('.timelineLoader').hide();
            $('.mobile-row').addClass('row');
            $('.timelineFlat').addClass('container').show();
            $('.container').css({
                'padding-left': '0px',
                'padding-right': '0px',
                'margin-right': '0px',
                'margin-left': '0px'
            });
            $('.item, .item_open').css({
                'width': '100%',
                'margin-bottom': '5px'
            }).addClass('col-xs-11');
            $('.item_open').each(function (index) {
                $(this).attr('data-count', index);
                $(this).prepend('<button class="t_close" aria-label="Close" data-count="' + $(this).attr('data-count') + '" data-id="' + $(this).attr('data-id') + '">&times;</button>');
                $(this).wrapInner('<div class="item_open_cwrapper"  />').find('div:first').css({position: 'relative'});
                $(this).css({width: 0, padding: 0, margin: 0, float: 'left', display: 'none', position: 'relative', overflow: 'hidden'});
            });
            $('.item_open').hide();
            $('.read_more').click(function () {
                var dataid = $(this).data('id');
                $.readMore(dataid);
            });
            $('.t_close').click(function () {
                $('.item_open').fadeOut(prefersReducedMotion ? 0 : 400);
            });
            $('#photoDiv').removeClass('text-right');
        }
        $.filterMe();

        $(document, document.body).scroll(function () {
            var navtop = $(this).scrollTop() * 1 - $('.navbar').offset().top;
            scrollTopVal = $(this).scrollTop();
            if (navtop >= 0 && $(this).scrollTop() > 0) {
                $('.navbar').addClass('navbar-fixed-top').css({
                    'box-shadow': '#585555 0 0 15px 0',
                    '-moz-box-shadow': '#585555 0 0 15px 0',
                    '-webkit-box-shadow': '#585555 0 0 15px 0'
                });
            } else {
                $('.navbar').css({
                    'box-shadow': 'none',
                    '-moz-box-shadow': 'none',
                    '-webkit-box-shadow': 'none'
                });
                $('.navbar').removeClass('navbar-fixed-top');
            }
        });
    };

    $(function () {
        if (window.fetch) {
            fetch('data/events.json')
                .then(function (resp) { return resp.json(); })
                .then(function (payload) {
                    var events = Array.isArray(payload) ? payload : payload.events;
                    if (Array.isArray(events) && events.length) {
                        renderTimelineItems(events);
                        if (window.GalleryView)       window.GalleryView.init(events);
                        if (window.ChaptersView)      window.ChaptersView.init(events);
                        if (window.DecadesView)       window.DecadesView.init(events);
                        if (window.MapView)           window.MapView.init(events);
                        if (window.ConstellationView) window.ConstellationView.init(events);
                        if (window.ValenceView)       window.ValenceView.init(events);
                        if (window.VaseView)          window.VaseView.init(events);
                        if (window.PromptBanner)      window.PromptBanner.init(events);
                        var startCandidate = (payload.timeline && payload.timeline.defaultStartId) || events[0].id;
                        initializeTimeline(startCandidate || startItemDefault);
                        if (window.GalleryView)       window.GalleryView.activateFromURL();
                        if (window.ChaptersView)      window.ChaptersView.activateFromURL();
                        if (window.DecadesView)       window.DecadesView.activateFromURL();
                        if (window.MapView)           window.MapView.activateFromURL();
                        if (window.ConstellationView) window.ConstellationView.activateFromURL();
                        if (window.ValenceView)       window.ValenceView.activateFromURL();
                        return;
                    }
                    initializeTimeline(startItemDefault);
                })
                .catch(function () { initializeTimeline(startItemDefault); });
        } else {
            initializeTimeline(startItemDefault);
        }
    });

    /* Keyboard shortcuts: 1–4 switch presentation view */
    $(document).on('keydown', function (e) {
        if ($(e.target).is('input, textarea, select, [contenteditable]')) return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        var map = { '1': '#view-timeline', '2': '#view-gallery', '3': '#view-chapters', '4': '#view-decades', '5': '#view-map', '6': '#view-constellation', '7': '#view-valence' };
        if (map[e.key]) $(map[e.key]).trigger('click');
    });
})(jQuery);
})(jQuery);
