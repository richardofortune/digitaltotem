/*

 Content Timeline 3.1

 Date organised content slider.

 Copyright (c) 2012 Br0 (shindiristudio.com)

 Project site: http://codecanyon.net/
 Project demo: http://shindiristudio.com/timeline

 */

(function ($) {
    // EVENTS.timeline
    // init.timeline          : triggered when timeline is initialised
    // scrollStart.timeline   : triggered when item move animation starts
    // scrollEnd.timeline     : triggered when item move animation ends
    // itemOpen.timeline      : triggered on click to open item
    // itemClose.timeline     : triggered on click to close item
    // ---------------------------------------------------------
    // On KeyPress (left)     : trigger $.timeline('left')
    // On KeyPress (right)    : trigger $.timeline('right')
    // ---------------------------------------------------------
    // $.timeline(METHODS)
    // $.timeline('init')     : initialises timeline
    // $.timeline('destroy')  : clears timeline data
    // $.timeline('left')     : moves one left by one element
    // $.timeline('right')    : moves right by one element
    // $.timeline('open', id) : opens element with 'data-id' = id
    // $.timeline('close', id): closes element with 'data-id' = id
    // $.timeline('goTo', id) : goes to element width 'data-id' = id
    var isMobile = false; //initiate as false
// device detection
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
        || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0, 4)))
        isMobile = true;
    var t_methods = {
        init: function (options) {
            // Default settings
            var settings = $.extend({
                'itemClass': '.item', // class used for timeline items
                'itemOpenClass': '.item_open', // class used for item details
                'openTriggerClass': '.item', // class of read more element (default uses whole item to trigger open event)
                'closeText': '', // text of close button in open item
                'itemMargin': 1, // spacing between items
                'scrollSpeed': 500, // animation speed
                'startItem': '02/02/1978', // timeline start item id, 'last' or 'first' can be used insted
                'easing': 'easeOutSine', // jquery.easing function for animations,
                'categories': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], // categories shown above timeline (months are default)
                'nuberOfSegments': [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], // number of elements per category (number of days)
                // 'categories'             : ['1900', '1978', '1981', '1995', '2001', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015'], // categories shown above timeline (months are default)
                // 'nuberOfSegments'        : [6,6,6,6,6,6,6,6,6,6,6,6,6,6,6], // number of elements per category (number of days)
                'yearsOn': true, // show years (can be any number you use in data-id (elementNumber/category/yearOrSomeOtherNumber))
                'swipeOn': false, // turn on swipe moving function
                'hideTimeline': false,//isMobile, //hides the timeline line
                'hideControles': false, //hides the prev/next controles
                'closeItemOnTransition': true, //if ture, closes the item after transition
                'ajaxFailMessage': 'Ajax request has failed.'
            }, options); // Setings


            // main queries
            var $this = this,
                $body = $('body'),
                $items = $this.find(settings.itemClass),
                $itemsOpen = $this.find(settings.itemOpenClass),
                itemWidth = $items.first().width(),
                itemOpenWidth = $itemsOpen.first().width(),
                closeItemOnTransition = settings.closeItemOnTransition;

            // Trigger init event
            $this.trigger('init.Timeline');


            // If no index found
            var startIndex = $items.length - 1;

            // Find index of start element
            if (settings.startItem == 'first') {
                startIndex = 0;
            }
            else if (settings.startItem == 'last') {
                startIndex = $items.length - 1;
            }
            else {
                $items.each(function (index) {
                    if (settings.startItem == $(this).attr('data-id')) {
                        startIndex = index;
                        return true;
                    }
                });
            }
            $items.each(function (index) {
                $(this).attr('data-count', index);
                $(this).next(settings.itemOpenClass).attr('data-count', index);
                if (!$(this).hasClass(settings.openTriggerClass)) {
                    $(this).find(settings.openTriggerClass).attr('data-count', index);
                }
            });

            // Create wrapper elements, and needed properties
            $this.append('<div style="clear:both"></div>');
            $this.css({width: '100%', 'overflow': 'hidden', marginLeft: 'auto', marginRight: 'auto', 'text-align': 'center', height: 0});
            $this.wrapInner('<div class="timeline_items" />');
            $this.find('.timeline_items').css('text-align', 'left');

            if ('ontouchstart' in window) {
                $this.addClass('timelineTouch');
            }

            // ZoomOut placement fix
            $this.wrapInner('<div class="timeline_items_holder" />');
            if (!settings.hideControles) {
                $this.append('<div class="t_controles"><div class="t_left"></div><div class="t_right"></div></div>');
            }
            $this.wrapInner('<div class="timeline_items_wrapper" />');
            $this.find('.timeline_items_holder').css({width: '300px', marginLeft: 'auto', marginRight: 'auto'});


            $items.css({
                paddingLeft: 0,
                paddingRight: 0,
                marginLeft: settings.itemMargin / 2,
                marginRight: settings.itemMargin / 2,
                float: 'left',
                position: 'relative'
            });

            $itemsOpen.each(function () {
                $(this).prepend('<div class="t_close" data-count="' + $(this).attr('data-count') + '" data-id="' + $(this).attr('data-id') + '">' + '</div>');
                $(this).wrapInner('<div class="' + settings.itemOpenClass.substr(1) + '_cwrapper"  />').find('div:first').css({position: 'relative'});
                $(this).css({width: 0, padding: 0, margin: 0, float: 'left', display: 'none', position: 'relative', overflow: 'hidden'});
            });

            // Get new queries
            var $iholder = $this.find('.timeline_items:first'),
                $line = $this.find('.t_line_wrapper:first'),
                margin = 300 / 2 - ((itemWidth + settings.itemMargin) * (1 / 2 + startIndex)),
                width = (itemWidth + settings.itemMargin) * $items.length + (itemOpenWidth + settings.itemMargin) + 660,
                data = $this.data('timeline');
            // Set margin so start element would place in midle of the screen
            $iholder.css({width: width, marginLeft: margin});
            // If the plugin hasn't been initialized yet
            if (!data) {
                $this.data('timeline', {
                    currentIndex: startIndex,
                    itemCount: $items.length,
                    margin: margin,
                    itemWidth: itemWidth,
                    itemOpenWidth: itemOpenWidth,
                    lineMargin: 0,
                    lineViewCount: 0,
                    options: settings,
                    items: $items,
                    iholder: $iholder,
                    open: false,
                    noAnimation: false,
                    marginResponse: false,
                    mousedown: false,
                    mousestartpos: 0
                });
            }
            if (!settings.hideTimeline) {
                $this.timeline('createElements');
                if ($this.hasClass('timelineClean')) {
                }
            }
            // Bind keyLeft and KeyRight functions
            $(document).keydown(function (e) {
                if (e.keyCode == 37) {
                    $this.timeline('left');
                    return false;
                }
                if (e.keyCode == 39) {
                    $this.timeline('right');
                    return false;
                }
            });
            $(document).ready(function () {
                $this.find(settings.itemClass).css({
                    '-webkit-touch-callout': 'none',
                    '-webkit-user-select': 'none',
                    '-khtml-user-select': 'none',
                    '-moz-user-select': 'none',
                    '-ms-user-select': 'none',
                    'user-select': 'none'
                }).find('img').on('dragstart', function (event) {
                    if (!($(this).hasClass('timeline_rollover_bottom')))
                        event.preventDefault();
                });
                $('.image_rollover_bottom').on('dragstart', function (event) {
                    $(this).addClass("disableClick");
                    event.preventDefault();
                });
                $('.image_rollover_bottom').on('mousedown', function (event) {
                    if (!$(this).is("hover")) {
                        $(this).removeClass("disableClick");
                    }
                });
                $('.image_rollover_bottom').on('click', function (event) {
                    if ($(this).hasClass('disableClick')) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    $(this).removeClass('disableClick')
                });
            });

            // Respond to window resizing
            $(window).resize(function () {
                //var id = $this.find('.active:first').attr('href').substr(1);
                var data = $this.data('timeline'),
                    id = $items.eq(data.currentIndex).attr('data-id');
                itemWidth = $items.first().width(),
                    itemOpenWidth = $itemsOpen.first().find('div:first').width();
                data.margin += data.itemCount * (data.itemWidth - itemWidth);
                data.itemWidth = itemWidth;
                if (data.open)
                    data.margin += (data.itemOpenWidth - itemOpenWidth) / 2;
                data.itemOpenWidth = itemOpenWidth;
                if ($('body').width() < 767 && data.open && !data.marginResponse) {
                    data.margin -= (itemWidth + settings.itemMargin) / 2;
                    data.marginResponse = true;
                } else if ($('body').width() >= 767 && data.marginResponse && data.open) {
                    data.margin += (itemWidth + settings.itemMargin) / 2;
                    data.marginResponse = false;
                }
                data.noAnimation = true;
                $this.timeline('goTo', id);
            });
            // Bind left on click
            $this.find('.t_left').click(function () {
                $this.timeline('left');
            });

            // Bind right on click
            $this.find('.t_right').click(function () {
                $this.timeline('right');
            });

            // SWIPE bind
            if (settings.swipeOn) {
                $items.find('*').each(function () {
                    $(this).css({
                        '-webkit-touch-callout': 'none',
                        '-webkit-user-select': 'none',
                        '-khtml-user-select': 'none',
                        '-moz-user-select': 'none',
                        '-ms-user-select': 'none',
                        'user-select': 'none'
                    });
                });
                $this.bind('touchstart', function (e) {
                    $this.timeline('touchStart', e);
                });
                $this.find(settings.itemClass).mousedown(function (e) {
                    $this.timeline('mouseDown', e.pageX);
                });
                $(document).bind('touchend', function (e) {
                    data = $this.data('timeline');
                    $this.timeline('touchEnd', data.touchpos);
                });

                $(document).mouseup(function (e) {
                    var data = $this.data('timeline');
                    if (data.mousedown) {
                        $this.timeline('mouseUp', e.pageX);
                    }
                });
            }
            // Bind open on click
            $this.find(settings.openTriggerClass).click(function () {
                $this.timeline('goTo', $(this).attr('data-id'), $(this).attr('data-count'), true);
            });
            // Bind close on click
            $this.find('.t_close').click(function () {
                $this.timeline('close', $(this).attr('data-id'), $(this).attr('data-count'));
            });
            // Show when loaded
            $this.css({height: 'auto'}).show();
            $this.prev('.timelineLoader').hide();
            // Reposition nodes due to their width
            $this.find('.t_line_node').each(function () {
                if ($(this).width() < 10)
                    $(this).width(12);
                $(this).css({marginLeft: -$(this).width() / 2});
            });
            return $this;
        },
        // Clear data
        destroy: function () {
            $(document).unbind('mouseup');
            $(window).unbind('resize');
            var $this = this,
                data = $this.data('timeline');
            $this.removeData('timeline');

        },
        touchStart: function (evt) {
            var $this = this,
                data = $this.data('timeline'),
                xmargin = 0;
            data.xpos = evt.originalEvent.touches[0].pageX,
                data.ypos = evt.originalEvent.touches[0].pageY;
            data.mousedown = true;
            data.touchHorizontal = false;
            data.mousestartpos = data.xpos;
            $this.unbind('touchmove');
            $this.bind('touchmove', function (e) {
                var newx = e.originalEvent.touches[0].pageX,
                    newy = e.originalEvent.touches[0].pageY;
                if (data.mousedown && !data.touchHorizontal) {
                    if (Math.abs(newx - data.xpos) > Math.abs(newy - data.ypos)) {
                        data.touchHorizontal = true;
                    }
                }
                else if (data.touchHorizontal) {
                    e.preventDefault();
                    data.touchpos = e.originalEvent.touches[0].pageX;
                    xmargin = data.margin - data.xpos + e.originalEvent.touches[0].pageX;
                    data.iholder.css('marginLeft', xmargin + 'px');
                }
                data.mousedown = false
            });
        },
        mouseDown: function (xpos) {
            var $this = this,
                data = $this.data('timeline'),
                xmargin = 0;
            data.mousedown = true;
            data.mousestartpos = xpos;

            $('body').css('cursor', 'move');
            $(document).mousemove(function (e) {
                xmargin = data.margin - xpos + e.pageX;
                data.iholder.css('marginLeft', xmargin + 'px');
            });
        },
        touchEnd: function (xpos) {
            var $this = this,
                data = $this.data('timeline'),
                itemWidth = data.itemWidth + data.options.itemMargin,
                itemC = data.currentIndex,
                mod = 0,
                xmargin = xpos - data.mousestartpos;

            if (typeof data.touchHorizontal != 'undefined' && data.touchHorizontal) {
                data.touchHorizontal = false;

                itemC -= parseInt(xmargin / itemWidth);
                mod = xmargin % itemWidth;
                if (xmargin < 0 && mod < -itemWidth / 2) {
                    itemC++;
                }
                if (xmargin > 0 && mod > itemWidth / 2) {
                    itemC--;
                }

                if (itemC < 0) {
                    itemC = 0;
                }
                if (itemC >= data.itemCount) {
                    itemC = data.itemCount - 1;
                }

                $this.timeline('goTo', data.items.eq(itemC).attr('data-id'), data.items.eq(itemC).attr('data-count'));

                if (data.options.closeItemOnTransition)
                    $this.timeline('close', data.items.eq(itemC).attr('data-id'));
            }
        },
        mouseUp: function (xpos) {

            var $this = this,
                data = $this.data('timeline'),
                itemWidth = data.itemWidth + data.options.itemMargin,
                itemC = data.currentIndex,
                mod = 0,
                xmargin = xpos - data.mousestartpos;
            data.mousedown = false;

            $(document).unbind('mousemove');
            $('body').css('cursor', 'auto');

            itemC -= parseInt(xmargin / itemWidth);
            mod = xmargin % itemWidth;
            if (xmargin < 0 && mod < -itemWidth / 2) {
                itemC++;
            }
            if (xmargin > 0 && mod > itemWidth / 2) {
                itemC--;
            }

            if (itemC < 0) {
                itemC = 0;
            }
            if (itemC >= data.itemCount) {
                itemC = data.itemCount - 1;
            }

            $this.timeline('goTo', data.items.eq(itemC).attr('data-id'), data.items.eq(itemC).attr('data-count'));
            if (data.options.closeItemOnTransition)
                $this.timeline('close', data.items.eq(itemC).attr('data-id'));

        },
        open: function (id, data_count) {
            var $this = this,
                data = $this.data('timeline'),
                $items = $this.find(data.options.itemOpenClass),
                speed = data.options.scrollSpeed,
                width = data.itemOpenWidth,
                easing = data.options.easin,
                itemMargin = data.options.itemMargin;
            $items.each(function () {
                if ($(this).attr('data-id') == id) {
                    if (!data_count || data_count == $(this).attr('data-count')) {
                        var $newThis = $(this);
                        // Trigger itemOpen event
                        $this.trigger('itemOpen.Timeline');
                        // Open content and move margin
                        $(this).stop(true).show().animate({width: width, marginLeft: itemMargin / 2, marginRight: itemMargin / 2}, speed, easing);
                        if (typeof $(this).attr('data-access') != 'undefined' && $(this).attr('data-access') != '') {
                            var action = $(this).attr('data-access');
                            $.get(action, function (data) {
                                $('body').append('<div class="ajax_preloading_holder" style="display:none"></div>');
                                $('.ajax_preloading_holder').html(data);
                                if ($('.ajax_preloading_holder img').length > 0) {
                                    $('.ajax_preloading_holder img').load(function () {
                                        $newThis.find('.item_open_content').html(data);
                                        $('.ajax_preloading_holder').remove();
                                        $(this).attr('data-access', '');

                                        /* trigger */
                                        var event = jQuery.Event('ajaxLoaded.timeline');
                                        event.element = $newThis.find('.item_open_content');
                                        $("body").trigger(event);
                                        $this.trigger(event);
                                    });
                                }
                                else {
                                    $newThis.find('.item_open_content').html(data);
                                    $('.ajax_preloading_holder').remove();
                                    $(this).attr('data-access', '');

                                    /* trigger */
                                    var event = jQuery.Event('ajaxLoaded.timeline');
                                    event.element = $newThis.find('.item_open_content');
                                    $("body").trigger(event);
                                    $this.trigger(event);
                                }
                            }, 'text').fail(function () {
                                data = '<div class="timeline_open_content"><h2 class="no-marg-top">' + data.options.ajaxFailMessage + '</h2></div>';
                                $newThis.find('.item_open_content').html(data);
                                $('.ajax_preloading_holder').remove();
                                /* trigger */
                                var event = jQuery.Event('ajaxLoaded.timeline');
                                event.element = $newThis.find('.item_open_content');
                                $("body").trigger(event);
                                $this.trigger(event);
                            });
                        }
                        if ($('body').width() < 767) {
                            data.margin -= (data.itemWidth + data.options.itemMargin) / 2;
                            data.marginResponse = true;
                        } else {
                            data.marginResponse = false;
                        }
                        data.margin -= (width + data.options.itemMargin + data.itemWidth) / 2 - data.itemWidth / 2;
                        data.iholder.stop(true).animate({marginLeft: data.margin}, speed, easing);
                        data.open = id;
                    }
                }
            });
            return $this;
        },
        close: function (id, idOpen, dataCountOpen) {
            var $this = this,
                data = $this.data('timeline'),
                $items = $this.find(data.options.itemOpenClass),
                speed = data.options.scrollSpeed,
                width = data.itemOpenWidth,
                easing = data.options.easing;
            $items.each(function () {
                if ($(this).attr('data-id') == id && $(this).is(":visible")) {
                    // Trigger itemOpen event
                    $this.trigger('itemClose.Timeline');
                    // Close content and move margin
                    $(this).stop(true).animate({width: 0, margin: 0}, speed, easing, function () {
                        $(this).hide()
                    });
                    if (data.marginResponse) {
                        data.margin += (data.itemWidth + data.options.itemMargin) / 2;
                    }
                    data.margin += (width + data.options.itemMargin) / 2;
                    data.iholder.stop(true).animate({marginLeft: data.margin}, speed, easing);
                    data.open = false;
                }
            });
            if (idOpen) {
                $this.timeline('open', idOpen, dataCountOpen);
            }
            return $this;
        },
        // Move one step left
        right: function () {
            var $this = this,
                data = $this.data('timeline'),
                speed = data.options.scrollSpeed,
                easing = data.options.easing;
            if (data.currentIndex < data.itemCount - 1) {
                var dataId = data.items.eq(data.currentIndex + 1).attr('data-id');
                var dataCount = data.items.eq(data.currentIndex + 1).attr('data-count');
                $this.timeline('goTo', dataId, dataCount);

                if (data.options.closeItemOnTransition)
                    $this.timeline('close', dataId);
            }
            else {
                data.iholder.stop(true).animate({marginLeft: data.margin - 50}, speed / 2, easing).animate({marginLeft: data.margin}, speed / 2, easing);
            }
            return $this
        },
        // Move one step right
        left: function () {
            var $this = this,
                data = $this.data('timeline'),
                speed = data.options.scrollSpeed,
                easing = data.options.easing;
            if (data.currentIndex > 0) {
                var dataId = data.items.eq(data.currentIndex - 1).attr('data-id');
                var dataCount = data.items.eq(data.currentIndex - 1).attr('data-count');
                $this.timeline('goTo', dataId, dataCount);

                if (data.options.closeItemOnTransition)
                    $this.timeline('close', dataId);
            }
            else {
                data.iholder.stop(true).animate({marginLeft: data.margin + 50}, speed / 2, easing).animate({marginLeft: data.margin}, speed / 2, easing);
            }
            return $this;
        },
        // Go to item
        goTo: function (id, data_count, openElement) {
            var $this = this,
                data = $this.data('timeline'),
                speed = data.options.scrollSpeed,
                easing = data.options.easing,
                $items = data.items,
                timelineWidth = $this.find('.timeline_line').width(),
                count = -1,
                found = false;

            var j = 0;
            // Find item index
            $items.each(function (index) {
                if ($('.item').eq(index).css('display') == 'block') {
                    j -= 400;
                }
                if (id == $(this).attr('data-id')) {
                    if (!data_count || data_count == $(this).attr('data-count')) {
                        found = true;
                        count = index;
                        return false;
                    }
                }
            });

            // Move if fount
            if (found) {
                // Move lineView to current element
                var $nodes = $this.find('.t_line_node');
                $nodes.removeClass('active');
                var $goToNode = $nodes.parent().parent().find('[href="#' + id + '"]').addClass('active');
                data.lineMargin = -parseInt($goToNode.parent().parent().attr('data-id'), 10) * 100;

                // check if responsive width
                if ($this.find('.t_line_view:first').width() > $this.find('.timeline_line').width()) {
                    data.lineMargin *= 2;
                    if ($goToNode.parent().hasClass('right'))
                        data.lineMargin -= 100;
                }

                if (data.noAnimation) {
                    data.noAnimation = false;
                    $this.find('.t_line_wrapper').stop(true).css({marginLeft: data.lineMargin + '%'});
                } else {
                    $this.find('.t_line_wrapper').stop(true).animate({marginLeft: data.lineMargin + '%'}, speed, easing);
                }
                if (data.open) {
                    $this.timeline('close', data.open, id, data_count);
                } else if (openElement) {
                    $this.timeline('open', id, data_count);
                }
                // Trigger ScrollStart event
                $this.trigger('scrollStart.Timeline');
                // Scroll
                data.margin += (data.itemWidth + data.options.itemMargin) * (data.currentIndex - count);
                data.currentIndex = count;
                var multiply = (parseInt(data.iholder.css('margin-left')) - data.margin) / data.itemWidth;
                data.iholder.stop(true).animate({marginLeft: j}, speed + (speed / 5) * (Math.abs(multiply) - 1), easing, function () {
                    // Trigger ScrollStop event
                    $this.trigger('scrollStop.Timeline');
                });
            }
            return $this;
        },
        // move line to the left
        lineLeft: function () {
            var $this = this,
                data = $this.data('timeline'),
                speed = data.options.scrollSpeed,
                easing = data.options.easing;
            if (data.lineMargin != 0 && data.options.categories) {
                data.lineMargin += 100;
                $this.find('.t_line_wrapper').stop(true).animate({marginLeft: data.lineMargin + '%'}, speed, easing);
            }
        },
        // move line to the right
        lineRight: function () {
            var $this = this,
                data = $this.data('timeline'),
                speed = data.options.scrollSpeed,
                easing = data.options.easing;
            if ($this.find('.t_line_view:first').width() > $this.find('.timeline_line').width())
                var viewCount = data.lineViewCount * 2;
            else
                var viewCount = data.lineViewCount;

            if (data.lineMargin != -(viewCount - 1) * 100 && data.options.categories) {
                data.lineMargin -= 100;
                $this.find('.t_line_wrapper').stop(true).animate({marginLeft: data.lineMargin + '%'}, speed, easing);
            }

        },
        // Create timeline elements and css dependent properties
        createElements: function () {
            var $this = this,
                data = $this.data('timeline'),
                $items = data.items;

            var html = '\n' +
                '    <div class="timeline_line" style="text-align: left; position:relative; margin-left:auto; margin-right:auto;">\n' +
                '	 </div>\n';
            $this.prepend(html);
            var timelineWidth = $this.find('.timeline_line').width(),
                nodes = new Array(),
                months = [''].concat(data.options.categories);
            monthsDays = [0].concat(data.options.nuberOfSegments),
                minM = months.length,
                minY = 99999,
                maxM = 0,
                maxY = 0;
            if (!data.options.yearsOn)
                maxY = 99999;

            var yearsArr = {};
            if (!data.options.categories) {
                $items.each(function () {
                    var dataId = $(this).attr('data-id'),
                        dataArray = dataId.split('/'),
                        d = parseInt(dataArray[0], 10),
                        m = ($.inArray(dataArray[1], months) != -1) ? $.inArray(dataArray[1], months) : parseInt(dataArray[1], 10),
                        y = parseInt(dataArray[2], 10);
                    if (d < minY)
                        minY = d;
                    if (d > maxY)
                        maxY = d;
                });
                minY -= 10;
                maxY += 10;
            }
            // find timeline date range and make node elements
            $items.each(function (index) {
                var dataId = $(this).attr('data-id'),
                    nodeName = $(this).attr('data-name'),
                    dataDesc = $(this).attr('data-description'),
                    dataArray = dataId.split('/'),
                    d = parseInt(dataArray[0], 10),
                    m = ($.inArray(dataArray[1], months) != -1) ? $.inArray(dataArray[1], months) : parseInt(dataArray[1], 10),
                    y = parseInt(dataArray[2], 10);


                if (typeof yearsArr[y] == 'undefined')
                    yearsArr[y] = {};
                if (typeof yearsArr[y][m] == 'undefined')
                    yearsArr[y][m] = {};
                yearsArr[y][m][d] = dataId;
                var isActive = (index == data.currentIndex ? ' active' : '');
                if (data.options.categories) {
                    var leftPos = (100 / monthsDays[m]) * d;
                } else {
                    var leftPos = (100 / (maxY - minY)) * (d - minY);
                }
                var nName = ((typeof nodeName != 'undefined') ? nodeName : d);
                // Store node element
                nodes[dataId] = '<a href="#' + dataId + '" class="t_line_node' + isActive + '" style="left: ' + leftPos + '%; position:absolute; text-align:center;">' + nName;
                if (typeof dataDesc != 'undefined')
                    nodes[dataId] += '<span class="t_node_desc" style="white-space:nowrap; position:absolute; z-index: 1;"><span>' + dataDesc + '</span></span>';

                nodes[dataId] += '</a>\n';
            });
            // Make wrapper elements
            html = '\n' +
                '		<div id="t_line_left" style="position: absolute;"></div><div id="t_line_right" style="position: absolute;"></div>\n' +
                '		<div class="t_line_holder" style="position:relative; overflow: hidden; width:100%;">\n' +
                '			<div class="t_line_wrapper" style="white-space:nowrap;">\n';

            // Prepare for loop, every view has 2 months, we show both if first has nodes in it

            if (!data.options.categories) {
                html +=
                    '<div class="t_line_view" data-id="' + cnt + '" style="position:relative; display:inline-block; width:100%;">\n' +
                    '					<div class="t_line_m" style="width:100%; border:0; position:absolute; top:0;">\n';
                for (var x in nodes) {
                    html += nodes[x];
                }
                html += '</div>\n' +
                    '</div>';
            } else {
                var firstMonth = true;
                var cnt = 0;
                for (var yr in yearsArr) {
                    for (var mnth in yearsArr[yr]) {
                        if (firstMonth) {
                            firstMonth = !firstMonth;
                            html +=
                                '<div class="t_line_view" data-id="' + cnt + '" style="position:relative; display:inline-block;">\n' +
                                '					<div class="t_line_m" style="position:absolute; top:0;">\n' +
                                '						<h4 class="t_line_month" style="position:abolute; width:100% top:0; text-align:center;">' + months[mnth] + (data.options.yearsOn ? '<span class="t_line_month_year"> ' + (yr < 0 ? (-yr) + ' B.C.' : yr) + '</span>' : '') + '</h4>\n';

                            // Fill with nodes
                            for (dy in yearsArr[yr][mnth]) {
                                html += nodes[yearsArr[yr][mnth][dy]];

                            }
                            html +=
                                '					</div> <!-- KRAJ PRVOG -->\n';
                        }
                        else {
                            firstMonth = !firstMonth;
                            html +=
                                '					<div class="t_line_m right" style="position:absolute; top:0;">\n' +
                                '						<h4 class="t_line_month" style="position:abolute; width:100% top:0; text-align:center;">' + (typeof months[mnth] !== 'undefined' ? months[mnth] : '') + (data.options.yearsOn ? '<span class="t_line_month_year"> ' + yr + '</span>' : '') + '</h4>\n';

                            // Fill with nodes
                            for (dy in yearsArr[yr][mnth]) {
                                html += nodes[yearsArr[yr][mnth][dy]];

                            }
                            html +=
                                '					</div><!-- KRAJ DRUGOG -->\n' +
                                '					<div style="clear:both"></div>\n' +
                                '				</div>';
                            cnt++;

                        }
                    }
                }
                if (!firstMonth) {
                    html +=
                        '					<div class="t_line_m right" style="position:absolute; top:0;">\n' +
                        '						<h4 class="t_line_month" style="position:abolute; width:100% top:0; text-align:center;"></h4>\n' +
                        '					</div>\n' +
                        '					<div style="clear:both"></div>\n' +
                        '				</div>';
                    cnt++;
                }
            }
            html += '\n' +
                '				<div style="clear:both"></div>\n' +
                '			</div>\n' +
                '		</div>\n';

            // Set number of View elements
            data.lineViewCount = cnt;
            // Add generated html and set width & margin for dinamic timeline
            $this.find('.timeline_line:first').html(html);
            $this.find('.t_line_node').each(function () {
                var $thisNode = $(this);
                $(this).find('span').hide();
                $(this).hover(function () {
                    $items.each(function () {
                        if ($(this).attr('data-id') == $thisNode.attr('href').substr(1)) {
                            $(this).addClass('item_node_hover');
                        }
                    });
                    $(this).find('span').css('display', 'block');
                }, function () {
                    $(this).find('span').css('display', 'none');
                    $('.item_node_hover').removeClass('item_node_hover');
                });

                //Position lineView to selected item
                if ($(this).hasClass('active')) {
                    data.lineMargin = -parseInt($(this).parent().parent('.t_line_view').attr('data-id'), 10) * 100;
                    $this.find('.t_line_wrapper').css('margin-left', data.lineMargin + '%');
                }
                // Bind goTo function to click event
                $(this).click(function (e) {
                    e.preventDefault();
                    $this.find('.t_line_node').removeClass('active');
                    $(this).addClass('active');
                    $this.timeline('goTo', $(this).attr('href').substr(1));
                });
            });

            $this.find('#t_line_left').click(function () {
                $this.timeline('lineLeft');
            });

            $this.find('#t_line_right').click(function () {
                $this.timeline('lineRight');
            });

        }
    };
    // Initiate methods
    $.fn.timeline = function (method) {

        if (t_methods[method]) {
            return t_methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return t_methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.timeline');
        }
    };
})(jQuery);
