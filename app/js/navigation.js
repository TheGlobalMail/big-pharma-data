(function($) {
  'use strict';

  $(setupWaypoints);

  function setupWaypoints(){
    var $nav = $('#nav');
    var $activeSection;

    $nav.find('a').click(function(e){
      console.error("got " + $(this).attr('href'));
      var href = $(this).attr('href');
      $.scrollTo(href, {duration: 'slow', onAfter: function(){
        var id = href.slice(1);
        // XXX should we update the hash?
        // window.location.hash = href;
        makeActive(id);
      }});
      e.preventDefault();
    });

    $('#section-container section').waypoint({
      handler: function(){
        console.error("got " + this.id);
        makeActive(this.id);
      }
      //offset: '75%'
    });

    function makeActive(id){
      if ($activeSection){
        $activeSection.removeClass('active');
      }
      $activeSection = $nav.find('#' + id + '-link');
      $activeSection.addClass('active');
    }

    // Scroll to initiall section
  }

}($));
