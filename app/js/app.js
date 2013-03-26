(function($, loadingOverlay, stats, toDollars, niceNumber, d3, BarChart) {
  'use strict';

  // Load the stats when the page is ready
  $(populateStats);

  // Render the stats into the html and dismiss loading overlay when done
  function populateStats(){
    $('#total-cost').text(toDollars(stats.summary.cost));
    $('#total-events').text(niceNumber(stats.summary.events));

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
    }else{
      disableD3Elements();
    }

    populateWorld();

    loadingOverlay.dismiss();
  }

  // Render the companies table. Order it by total $
  function populateCompanies(){
    var companies = _.sortBy(stats.companies, 'cost').reverse();
    var html = _.map(companies, function(company){
      // TODO: add incomplete and percentage classes
      var row = '<tr>';
      row += '<td class="company">' + '<a href="#">' + company.company + '</a>' + '</td>';
      row += '  <td class="dollars">' + toDollars(company.cost) + '</td>';
      row += '  <td class="attendees">' + niceNumber(company.attendees) + '</td>';
      row += '  <td class="events">' + niceNumber(company.events) + '</td>';
      row += '  <td class="data">' + company.completed + '/?</td>';
      row += '</tr>';
      return row;
    }).join("\n");
    $('#companies tbody').html(html).find('tbody tr:first').addClass('shadow');
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
      var adjust = width * adjustRatio * -1 - (600 - width); // 600 is the width of the background image
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
    $('#under-10-person').text(
        niceNumber(stats.perheadBins[0].hospitalitycount + stats.perheadBins[1].count)
    );
    $('#under-20-person').text(
        niceNumber(stats.perheadBins[2].hospitalitycount)
    );
    $('#under-50-person').text(
        niceNumber(stats.perheadBins[3].hospitalitycount)
    );
    var rest = _.inject(stats.perheadBins.slice(3), function(sum, datum){
      return sum + datum.hospitalitycount;
    }, 0);
    $('#over-50-person').text(niceNumber(rest));
  }

  function populatePerPerson(){
    var data = stats.perheadBins;
    data[0].bin = 'No cost!?';
    _.each(data.slice(1, data.length), function(datum){
      datum.bin = toDollars(datum.bin, "remove-cents");
    });
    _.each(data.slice(1, data.length - 1), function(datum){
      datum.bin = "Up to " + datum.bin;
    });
    _.last(data).bin = 'Over ' + _.last(data).bin;
    var chart = new BarChart("#perperson-chart", stats.perheadBins, 'bin', 'hospitalitycount', !!'keepScale');
    chart.render();
    bindButtons('#perperson-chart button', chart);
  }

  function populateProfessions(){
    var chart = new BarChart('#professions', stats.professions, 'profession', 'attendees', !'keepScale');
    chart.render();
    bindButtons('#attendees button', chart);
  }

  function populateWorld(){
    var maxCountries = 20;
    var columns = ['country', 'events', 'attendees', 'cost'];
    var tbody = d3.select('#world tbody');
    var rows = tbody.selectAll("tr")
      .data(stats.countries.slice(0, maxCountries))
      .enter()
      .append("tr");
    rows.selectAll("td")
      .data(function(row){
        return columns.map(function(column){
          return {column: column, value: row[column]};
        });
      })
      .enter()
      .append("td")
      .text(function(d){
        if (d.column === 'cost'){
          return toDollars(d.value);
        }else{
          return d.value;
        }
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
      $buttons.removeClass('active');
      $button.addClass('active');
    });
  }

}($, window.loadingOverlay, window.stats, window.toDollars, window.niceNumber, window.d3, window.BarChart));
