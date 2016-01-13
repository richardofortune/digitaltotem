(function ($) {
	var isMobile = false;
	var scrollTopVal = 0;
	// device detection
	if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
			|| /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0, 4)))
		isMobile = true;
	$.filterMe = function () {
		var $btns = $('.btn').click(function () {
			if (this.id == 'all') {
				$('.js-filterItem').fadeIn(450);
				$('.js-filter').fadeIn(450);
			} else {
				var $el = $('.' + this.id);
				$('.js-filterItem, .js-filter').not($el).hide();
				$el.fadeIn(450);
			}
			$btns.removeClass('active');
			$(this).addClass('active');
			if (!isMobile) {
				$('.tl1').timeline('goTo', '01/01/1970');
				$('.tl1').timeline('right');
				$('.tl1').timeline('right');
			}
		});
//		if (isMobile) {
//			$('.tl1').timeline('destroy');
//		}
	};
	$.readMore = function (dataid) {
		$('.item_open').hide();
		$('.item_open').each(function () {
			if ($(this).data('id') == dataid) {
				var $newThis = $(this);
				// Open content and move margin
				$(this).stop(true).show().animate({width: '100%', marginLeft: 2.5, marginRight: 2.5}, 500, 'easeOutSine');
				if (typeof $(this).attr('data-access') != 'undefined' && $(this).attr('data-access') != '') {
					var action = $(this).attr('data-access');
					$.get(action, function (data) {
						$('body').append('<div class="ajax_preloading_holder" style="display:none"></div>');
						$('.ajax_preloading_holder').html(data);
						$newThis.find('.item_open_cwrapper').css({'width': '96%'});
						if ($('.ajax_preloading_holder img').length > 0) {
							$('.ajax_preloading_holder img').load(function () {
								$newThis.find('.item_open_content').html(data);
								$('.ajax_preloading_holder').remove();
								$(this).attr('data-access', '');
								/* trigger */
								var event = jQuery.Event('ajaxLoaded.timeline');
								event.element = $newThis.find('.item_open_content');
								$("body").trigger(event);
							});
						} else {
							$newThis.find('.item_open_content').html(data);
							$('.ajax_preloading_holder').remove();
							$(this).attr('data-access', '');

							/* trigger */
							var event = jQuery.Event('ajaxLoaded.timeline');
							event.element = $newThis.find('.item_open_content');
							$("body").trigger(event);
						}
					}, 'text').fail(function () {
						data = '<div class="timeline_open_content"><h2 class="no-marg-top">Ajax request has failed.</h2></div>';
						$newThis.find('.item_open_content').html(data);
						$('.ajax_preloading_holder').remove();
						/* trigger */
						var event = jQuery.Event('ajaxLoaded.timeline');
						event.element = $newThis.find('.item_open_content');
						$("body").trigger(event);
					});
					$(document, document.body).scrollTop(scrollTopVal);
				}
			}
		});
	};
	$(function () {
		// light
		if (!isMobile) {
			$('.tl1').timeline({
				openTriggerClass: '.read_more',
				startItem: '11/08/1978',
				closeText: 'x',
				ajaxFailMessage: "Oops, something has gone wrong. I apologise, but hopefully you saw enough to want to chat more? Drop me a line richard.fortune@gmail.com and I'll make it right "
			});
			$('.tl1').on('ajaxLoaded.timeline', function (e) {
				var height = e.element.height() - 60 - e.element.find('h2').height();
				e.element.find('.timeline_open_content span').css('max-height', height).mCustomScrollbar({
					autoHideScrollbar: true,
					theme: "light-thin"
				});
			});
			$('.tl1').timeline('right');
			$('.btn').css({
				'margin-top': '10px'
			});
			$('.navbar-nav').css({
				'margin-left': '26%'
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
				$(this).prepend('<div class="t_close" data-count="' + $(this).attr('data-count') + '" data-id="' + $(this).attr('data-id') + '">X</div>');
				$(this).wrapInner('<div class="item_open_cwrapper"  />').find('div:first').css({position: 'relative'});
				$(this).css({width: 0, padding: 0, margin: 0, float: 'left', display: 'none', position: 'relative', overflow: 'hidden'});
			});
			$('.item_open').hide();
			$('.read_more').click(function () {
				var dataid = $(this).data('id');
				$.readMore(dataid);
			});
			$('.t_close').click(function(){
				$('.item_open').fadeOut();
			});
		}
		$.filterMe();
		
		$(document, document.body).scroll(function () {
			var navtop = $(this).scrollTop() * 1 - $('.navbar').offset().top;
			scrollTopVal = $(this).scrollTop();
			if (navtop >= 0 && $(this).scrollTop() > 0) {
				$('.navbar').addClass('navbar-fixed-top').css({
					'box-shadow': '#585555 0 0 15px 0',
					'-moz-box-shadow': '#585555 0 0 15px 0',
					'-webkit-box-shadow': '#585555 0 0 15px 0',
					'padding-top': '0.5%',
					'padding-bottom': '0.5%'
				});
				$('.navbar-header').css({
					'margin-top': '20px'
				});
			} else {
				$('.navbar').css({
					'box-shadow': 'none',
					'-moz-box-shadow': 'none',
					'-webkit-box-shadow': 'none',
					'padding-top': '1%',
					'padding-bottom': '1%'
				});
				$('.navbar-header').css({
					'margin-top': '0px'
				});
				$('.navbar').removeClass('navbar-fixed-top');
			}
		});
	});
})(jQuery);

