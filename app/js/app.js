(function($, loadingOverlay, stats, toDollars, niceNumber, d3) {
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

    loadingOverlay.dismiss();
  }

  // Render the companies table. Order it by total $
  function populateCompanies(){
    var companies = _.sortBy(stats.companies, 'cost').reverse();
    var html = _.map(companies, function(company){
      // TODO: add incomplete and percentage classes
      var row = '<tr>';
      row += '<td class="company">' + company.company + '</td>';
      row += '  <td class="dollars">' + toDollars(company.cost) + '</td>';
      row += '  <td class="attendees">' + niceNumber(company.attendees) + '</td>';
      row += '  <td class="events">' + niceNumber(company.events) + '</td>';
      row += '  <td class="data">' + company.completed + '/?</td>';
      row += '  <td class="site"><a href="#">Company Info</a></td>';
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
    barChart("#perperson-chart", stats.perheadBins, 'bin', 'hospitalitycount');
  }

  function populateProfessions(){
    barChart('#professions', stats.professions, 'profession', 'cost');
    barChart('#professions-attendees', stats.professions, 'profession', 'attendees');
    barChart('#professions-perperson', stats.professions, 'profession', 'perperson');
  }

  function barChart(id, data, label, metric){
    var $professions = $(id);
    var margin = {top: 10, right: 20, bottom: 20, left: 60},
        width = $professions.width() - margin.left - margin.right,
        height = 320 - margin.top - margin.bottom;
    var x = d3.scale.ordinal()
      .rangeRoundBands([0, width], 0.4);
    var y = d3.scale.linear()
      .range([height, 0]);
    var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");
    var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");
    var svg = d3.select(id).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(_.map(data, function(d) { return d[label]; }));
    y.domain([0, d3.max(data, function(d) { return d[metric]; })]);

    svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text(metric);

    svg.selectAll(".bar")
      .data(data)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return x(d[label]); })
      .attr("width", x.rangeBand())
      .attr("y", function(d) { return y(d[metric]); })
      .attr("height", function(d) { return height - y(d[metric]); });
  }

  function disableD3Elements(){
    $('.attendees, #perperson-chart').addClass('no-ie');
  }

}($, window.loadingOverlay, window.stats, window.toDollars, window.niceNumber, window.d3));