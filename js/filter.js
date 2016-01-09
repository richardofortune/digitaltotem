function filterMe() {
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
		$('.tl1').timeline('goTo', '01/01/1970');
		$('.tl1').timeline('right');
	});
};
