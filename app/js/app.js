(function($, loadingOverlay, stats) {
  'use strict';

  // Load the stats when the page is ready
  $(populateStats);

  // Render the stats into the html and dismiss loading overlay when done
  function populateStats(){
    loadingOverlay.dismiss();
  }


}($, window.loadingOverlay, window.stats));