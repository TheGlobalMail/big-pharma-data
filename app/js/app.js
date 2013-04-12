(function($, loadingOverlay, stats, toDollars, niceNumber, d3, BarChart) {
  'use strict';

  // Load the stats when the page is ready
  $(populateStats);

  // Render the stats into the html and dismiss loading overlay when done
  function populateStats(){
    $('#total-cost').text(toDollars(stats.summary.cost));
    $('#per-year-estimate').text(toDollars(stats.summary.cost / (stats.summary.days / 365)));
    $('#attendees-per-year').text(niceNumber(stats.summary.attendees / (stats.summary.days / 365)));
    $('#total-events').text(niceNumber(stats.summary.events));
    $('#total-attendees').text(niceNumber(stats.summary.attendees));

    populateCompanies();

    populateConditions();

    var alcoholPercentage = Math.round((stats.summary.alcohol / stats.summary.events) * 100);
    $('#total-alcohol-percentage').text(alcoholPercentage);
    $('#perperson').text(toDollars(stats.summary.cost / stats.summary.attendees));
    $('#events-per-day').text(niceNumber(stats.summary.eventsPerDay));

    popPills();

    populateStatesMap();

    populateQuickPerPerson();

    if (d3){
      populatePerPerson();
      populateProfessions();
      populateWorld();
    }else{
      disableD3Elements();
    }

    loadingOverlay.dismiss();

    if (window.location.hash){
      loadCompany(window.location.hash.replace(/#*profile-/, ''));
    }

    // Check what sections are in the viewport, and set it to recheck
    // after scroll events
    var checkVisibility = checkVisibilityFactory();
    checkVisibility();
    $(document).scroll(checkVisibility);
  }

  // Render the companies table. Order it by total $
  function populateCompanies(){
    var companies = _.sortBy(stats.companies, 'events').reverse();
    var companiesHtml = _.map(companies, function(company){
      // TODO: add incomplete and percentage classes
      var row = '<tr style="display:none">';
      row += '<td class="company">' + '<a data-company="' + company.company;
      row += '" href="/profiles/' + company.company + '">';
      row += (company.name || company.company).replace(/ pty ltd/i, '')  + '</a>' + '</td>';
      row += '  <td class="dollars">' + toDollars(company.cost) + '</td>';
      row += '  <td class="attendees">' + niceNumber(company.attendees) + '</td>';
      row += '  <td class="events">' + niceNumber(company.events) + '</td>';
      row += '  <td class="data">' + company.completed + '/' + (company.completed + (company.incomplete || 0)) + '</td>';
      row += '</tr>';
      return row;
    });
    $('#top5 tbody')
      .html(companiesHtml.join(''))
      .find('tbody tr:first').addClass('shadow');
    $('#top5 tbody')
      .find('tr:lt(5)').show();

    // Handle displaying of profile
    $('a[data-company]').click(function(e){
      e.preventDefault();
      var companyName = $(this).data('company');
      loadCompany(companyName);
    });

    // Handle displaying of profile
    $('#full-list').click(function(e){
      var altText = $(this).data('alt-text');
      e.preventDefault();
      if ($(this).data('full-list') === 'true'){
        $('#top5').find('tr:gt(5)').fadeOut();
        $(this).data('full-list', 'false');
        $.scrollTo('#status');
      }else{
        $('#top5').find('tr:gt(5)').fadeIn();
        $(this).data('full-list', 'true');
      }
      $(this).data('alt-text', $(this).text());
      $(this).text(altText);
    });
  }

  function loadCompany(companyName){
    var company = _.detect(stats.companies, function(c){ return c.company === companyName; });
    if (!company){
      return;
    }
    window.company = company;
    $('#company-name').text(company.name || company.company);
    $('#company-products').text(niceNumber(company.products));
    $('#company-total-cost').text(toDollars(company.cost));
    $('#company-summary').text(_.escape(company.summary));
    $('#company-blurb').text(_.escape(company.blurb));
    $('#company-pbs2012').text(_.escape(company.pbs2012));
    $('#company-revenueAu').text(_.escape(company.revenueAu));
    $('#company-revenueGlobal').text(_.escape(company.revenueGlobal));
    $('#company-total-events').text(niceNumber(company.events));
    companyList('#company-top-professions', company.professions, 'profession');
    companyList('#company-top-conditions', company.conditions, 'condition');
    var bins = extractBins(company.perheadBins);
    $('#company-perperson strong[data-perperson=under-10-person]').text(bins[0]);
    $('#company-perperson strong[data-perperson=under-20-person]').text(bins[1]);
    $('#company-perperson strong[data-perperson=under-50-person]').text(bins[2]);
    $('#company-perperson strong[data-perperson=over-50-person]').text(bins[3]);
    _.each(['description', 'venue', 'hospitality', 'hospitalitycost', 'cost', 'attendees', 'hospitality_spendratio'], function(metric){
      var value = company.mostExpensive[metric];
      var text;
      if (metric.match(/cost|spend/)){
        text = toDollars(value);
      }else if (metric.match(/attendees/)){
        text = niceNumber(value);
      }else{
        text = value && value.replace(/;/gm, ',');
      }
      $('#company-expensive-event-' + metric).text(text);
    });
    $('#profile').modal();
  }

  function companyList(id, list, name){
    var top3 = _.sortBy(list, 'events').reverse().slice(0, 3);
    $(id).html(_.map(top3, function(item){
      var itemName = item[name] === 'gp' ? 'General Practioners' : item[name];
      return '<li>' + _.string.humanize(itemName) + ' <span>' + niceNumber(item.events) + ' events</span></li>';
    }).join(''));
  }

  // Render the companies table. Order it by total $
  function populateConditions(){
    var conditions = _.sortBy(stats.conditions, 'cost').reverse().slice(0, 5);
    var $conditions = $('#conditions');
    var maxCost = conditions[0].cost;
    var html = _.map(conditions, function(condition){
      var id = condition.condition;
      var name = id.replace(/_/, ' ');
      var li = '<li id="condition-' + id + '"><strong>' + name + '</strong>';
      li += '<span>' + toDollars(condition.cost) + '</span></li>';
      return li;
    }).join("\n");

    // Add the html
    $conditions.html(html);

    // Calculate the offsets of the background that work like bar graphs
    var width = $conditions.find('li:first').width();
    _.each(conditions.slice(1), function(condition){
      var adjustRatio = (maxCost - condition.cost) / maxCost;
      var adjust = width * adjustRatio * -1 - (1200 - width); // 600 is the width of the background image
      $conditions.find('#condition-' + condition.condition).css('background-position', adjust + "px 0");
    });
  }

  // Work out how many of those little pills need to be displayed
  function popPills(){
    $('#pills').html(
        _.map(_.range(stats.summary.eventsPerDay), function(){
          return '<li><div class="pill top"></div><div class="pill"></div></li>';
        }).join('\n')
    );
  }

  // Setup map of states
  function populateStatesMap(){
    // Match the order of the map
    var mapOrder = ['nt', 'qld', 'nsw', 'act', 'vic', 'tas', 'sa', 'wa'];
    var states = _.map(mapOrder, function(state){
      return _.detect(stats.states, function(stateData){
        return stateData.state === state;
      });
    });
    var $states = $('#states');
    var html = _.map(states, function(state){
      var li = '<li id="state-' + state.state + '">' + state.state.toUpperCase();
      li += '<span>' + niceNumber(state.events) + '</span></li>';
      return li;
    }).join("\n");

    // Add the html
    $states.html(html);
  }

  function populateQuickPerPerson(){
    var bins = extractBins(stats.perheadBins);
    $('#under-10-person').text(bins[0]);
    $('#under-20-person').text(bins[1]);
    $('#under-50-person').text(bins[2]);
    $('#over-50-person').text(bins[3]);
  }

  function extractBins(bins){
    var rest = _.inject(stats.perheadBins.slice(3), function(sum, datum){
      return sum + datum.hospitalitycount;
    }, 0);
    return [
      niceNumber(bins[0].hospitalitycount),
      niceNumber(bins[1].hospitalitycount),
      niceNumber(bins[2].hospitalitycount),
      niceNumber(rest)
    ];
  }

  function populatePerPerson(){
    var data = stats.perheadBins;
    _.each(data, function(datum){
      datum.bin = toDollars(datum.bin, "remove-cents");
    });
    _.each(data.slice(0, data.length - 1), function(datum, index){
      var previousBin = data[index - 1] ? data[index - 1].bin : 0;
      datum.binLabel = previousBin + '-' + datum.bin;
    });
    _.last(data).binLabel = 'Over ' + _.last(data).bin;
    var chart = new BarChart({
      id: "#perperson-chart",
      data: stats.perheadBins,
      label: 'binLabel',
      metric: 'hospitalitycount',
      keepScale: !!'keepScale',
      yAxisLabel: 'Number of attendees',
      barInfoText: ['Medical professionals attended events costing <%= xAxis %> pp']
    });
    chart.render();
    bindButtons('#perperson-chart button', chart);
  }

  function populateProfessions(){
    var topProfessions = _.sortBy(stats.professions, 'events').reverse().slice(0, 8);
    _.each(topProfessions, function(prof){
      if (prof.profession === 'gp'){
        prof.label = "G.P.'s";
      }else{
        prof.label = prof.profession + 's';
      }
    });
    var chart = new BarChart({
      id: '#professions',
      data: topProfessions,
      label: 'label',
      metric: 'events',
      keepScale: !'keepScale',
      yAxisLabels: ['TBC', '$', '$'],
      barInfoText: ['<%= xAxis %>s attended education events']
    });
    chart.render();
    bindButtons('#attendees button', chart);
  }

  function populateWorld(){
    var maxCountries = 3;
    var columns = ['country', 'events', 'cost'];
    var countries = d3.select('#world #countries');
    countries.selectAll("li")
      .data(stats.countries.slice(0, maxCountries))
      .enter()
      .append("li")
      .attr('class', function(row){ return row.country.toLowerCase().replace(/ /g, '-'); })
      .append("dl")
      .html(function(row){
        return _.map(columns, function(column){
          var html = "<dt>" + column + "</dt>";
          var value = row[column];
          html += "<dd>" + (column === 'cost' ? toDollars(value) : value) + "</dd>";
          return html;
        }).join('');
      });
  }

  function disableD3Elements(){
    $('.datavis').addClass('no-ie');
  }

  function bindButtons(buttons, chart){
    var $buttons = $(buttons);
    $buttons.click(function(){
      var $button = $(this);
      chart.updateMetric($button.data('metric'));
      chart.updateYAxisLabel($button.index());
      chart.updateBarInfoText();
      $buttons.removeClass('active');
      $button.addClass('active');
    });
  }

  function scrollY() {
    // x-browser scrollY wrapper
    return (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;
  }

  function checkVisibilityFactory() {
    // Add a `is-visible` class to each element once it has entered the viewport.

    // Constructing the closure so we can hoist the elements
    // to the handler and reduce the DOM load for each scroll event
    var elements = $('.subsection');
    return function() {
      var windowScrollY = scrollY();
      elements.each(function() {
        var element = $(this);
        if (element.offset().top < (windowScrollY + window.innerHeight - 300)) {
          element.addClass('is-visible');
        }
        if (element.offset().top > (windowScrollY + window.innerHeight)) {
          element.removeClass('is-visible');
        }
      })
    }
  }

  $.fn.modal.defaults.modalOverflow = true;

}($, window.loadingOverlay, window.stats, window.toDollars, window.niceNumber, window.d3, window.BarChart));
