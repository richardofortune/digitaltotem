function filterMe(){
var $btns = $('.btn').click(function() {
  if (this.id == 'all') {
    $('.js-filterItem').fadeIn(450);
    //  $('.js-filterItem').removeClass('hidden');
  }
  if (this.id == 'life') {
    // $('.js-filterItem').fadeIn(450);
    $('js-filterItem').not('.life').hide();
    //  $('.js-filterItem').removeClass('hidden');
  }

  if (this.id == 'pivotal') {
    $('.js-filterItem').fadeIn(450);


    //  $('.js-filterItem').removeClass('hidden');
  }

  if (this.id == 'work') {
    $('.js-filterItem').fadeIn(450);


    //  $('.js-filterItem').removeClass('hidden');
  }
  if (this.id == 'passion') {
    // $('.js-filterItem').fadeIn(450);
    $('.js-filterItem').not($el).hide();

    //  $('.js-filterItem').removeClass('hidden');
  }
  else {
    var $el = $('.' + this.id).fadeIn(450);
    $('.js-filterItem').not($el).hide();

   var $el = $('.' + this.id).removeClass('hidden');
   $('.js-filterItem').not($el).addClass('hidden');
  }
  $btns.removeClass('active');
  $(this).addClass('active');
})

};
