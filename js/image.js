$(window).on('load', function() {
	connectImage();
});

function connectImage(){

	$('.image_rollover_top').off('mouseenter mouseleave').conRollover('top');
	$('.image_rollover_right').off('mouseenter mouseleave').conRollover('right');
	$('.image_rollover_bottom').off('mouseenter mouseleave').conRollover('bottom');
	$('.image_rollover_left').off('mouseenter mouseleave').conRollover('left');

}


$.fn.conRollover = function(type) {

	var lstart,lend;
	var tstart,tend;

	$(this).append('\n<div class="image_roll_glass"></div><div class="image_roll_zoom"></div>');


	switch (type)
	{
		case 'top' : lstart='0'; lend='0'; tstart='-100%'; tend='0'; break;
		case 'right' : lstart='100%'; lend='0'; tstart='0'; tend='0'; break;
		case 'bottom' : lstart='0'; lend='0'; tstart='100%'; tend='0'; break;
		case 'left' : lstart='-100%'; lend='0'; tstart='0'; tend='0'; break;
	}
	$(this).find('.image_roll_zoom').css({left:lstart, top:tstart});
	$(this).hover(function(){
		$(this).find('.image_roll_zoom').stop(true, true).animate({left: lend, top:tend},200);
		$(this).find('.image_roll_glass').stop(true, true).fadeIn(200);
},function() {
		$(this).find('.image_roll_zoom').stop(true).animate({left:lstart, top:tstart},200);
		$(this).find('.image_roll_glass').stop(true, true).fadeOut(200);
	});




} 

