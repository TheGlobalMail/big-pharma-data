(function($, d3) {
  'use strict';

  var BarChart = window.BarChart = function(options){

    this.data = options.data;
    this.id = options.id;
    this.label = options.label;
    this.metric = options.metric;
    this.keepScale = options.keepScale;

    var defaultOptions = {
      yAxisLabel: null
    };

    this.options = _.extend(defaultOptions, options);
  };

  BarChart.prototype.render = function(){
    var convertedData = this.convertData();
    var $professions = $(this.id);
    var margin = {top: 10, right: 20, bottom: 80, left: 65},
        width = $professions.width() - margin.left - margin.right;
    var height = this.height = 260 - margin.top - margin.bottom;
    var x = d3.scale.ordinal()
      .rangeRoundBands([0, width], 0.4);
    var y = this.yScale = d3.scale.linear()
      .range([height, 0]);
    var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");
    var yAxis = this.yAxis = d3.svg.axis()
      .scale(y)
      .ticks(6)
      .orient("left");
    var svg = this.chart = d3.select(this.id).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(_.map(convertedData, function(d) { return d.x; }));
    y.domain([0, d3.max(convertedData, function(d) { return d.y; })]);

    // Insert the X axis
    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-5px")
            .attr("dy", "15px")
            .attr("transform", function(d) {
                return "rotate(-45)"
                });

    // Insert the Y axis
    this.yAxisSvg = svg.append("g")
      .attr("class", "y axis")
      .call(yAxis);

    this.renderYAxisLabel();

    // Y axis lines
    svg.selectAll("line.y")
      .data(y.ticks(6))
      .enter().append("line")
      .attr("class", "y")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", y)
      .attr("y2", y)
      .style("stroke", "#f5f5f5");

    // Bars
    this.barData = svg.selectAll(".bar")
      .data(convertedData)
      .enter().append("g")
      .classed("bar-group", true)
        .append("rect")
        .classed("bar", true)
        .attr("x", function(d) { return x(d.x); })
        .attr("width", x.rangeBand())
        .attr("y", function(d) { return y(d.y); })
        .attr("height", function(d) { return height - y(d.y); })
        .on("mouseover", function() {
          d3.select(this)
            // Denote the current bar as active
            .classed("active", true)
            // Bring the active bar group to the front
            .each(function() {
              var barGroup = this.parentNode;
              barGroup.parentNode.appendChild(barGroup);
            });
          // Add `inactive` classes to the other bars
          svg.selectAll(".bar")
            .filter(":not(.active)")
            .classed("inactive", true);
        })
        .on("mouseout", function() {
          // Remove `inactive` classes from the other bars
          d3.select(this).classed("active", false);
          svg.selectAll(".bar")
            .filter(":not(.active)")
            .classed("inactive", false);
        });

    // Bar info boxes
    this.barInfo = svg.selectAll(".bar-group")
      .append("g")
      .classed("bar-info", true)
      .attr("transform", function(d) {
        // Position them next to the associated bar
        var xPos = x(d.x) - (x.rangeBand() / 2) - 7;
        var yPos = y(d.y);
        // If there is enough space, move the info box down
        if ((height - yPos) >= 40) {
          yPos += 40;
        }
        // If not enough space, move the info box up
        if ((height - yPos) <= 40) {
          yPos -= 40;
        }
        return "translate(" + xPos + "," + yPos + ")";
      });
    // Background
    this.barInfo.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .classed("background", true);
    // Title
    this.barInfo.append("text")
      .classed("title", true)
      .text(function(d) { return d3.format("0,000")(d.y); });
    // Textual content
    this.barInfo.append("g")
      .classed("text", true)
      .append("foreignObject")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 100)
        .attr("height", 100)
          .append("xhtml:body")
            .classed("svg-foreign-object bar-chart", true)
            .append("p")
              .text(function(d) { return d.x; });

    // Position and size the bar info box's elements
    this.barInfo.each(function() {
      var barInfo = d3.select(this);
      var background = $(barInfo.select('.background')[0]);
      var title = $(barInfo.select('.title')[0]);
      var text = $(barInfo.select('.text')[0]).children('foreignObject');
      var padding = 10;
      title.attr("x", padding);
      text.attr({
        // Wrap the text at the title's width
        "width": title.width(),
        // The height of the foreignObject's body element
        "height": text.children().height(),
        // Left margin
        "x": padding,
        // Spacing between the title and the text
        "y": 2
      });
      background.attr({
        // Sum of the elements' height
        "height": text.offset().top - title.offset().top + text.height() + padding,
        // Widest element + padding
        "width": title.width() + (padding * 2),
        // Top margin
        "y": -title.height() + (padding - 2)
      });
      barInfo.classed("post-render", true);
    })
  };

  BarChart.prototype.convertData = function(){
    return _.map(this.data, function(datum){
      return {x: _.string.capitalize(datum[this.label]), y: datum[this.metric]};
    }, this);
  };

  BarChart.prototype.updateMetric = function(metric){
    this.metric = metric;
    var height = this.height;
    var yScale = this.yScale;
    var convertedData = this.convertData();
    if (!this.keepScale){
      yScale.domain([0, d3.max(convertedData, function(d) { return d.y; })]);
      this.yAxis.scale(yScale);
      this.chart.select(".y").transition().duration(10).call(this.yAxis);
    }
    this.barData.data(convertedData)
      .transition().duration(500).delay(50)
      .attr("y", function(d) { return yScale(d.y); })
      .attr("height", function(d) { return height - yScale(d.y); });
  };

  BarChart.prototype.renderYAxisLabel = function() {
    if (this.options.yAxisLabel) {
      // Add the label
      var $yAxisSvg = $(this.yAxisSvg[0]);
      var label = this.yAxisSvg.append("text")
        .classed("y-axis-label", true)
        .attr("transform", "rotate(-90)")
        .style("text-anchor", "end")
        .text(this.options.yAxisLabel);

      // Position the label
      var $label = $(label[0]);
      var smallestLeftOffset = _.min(
        _.map(
          $(this.yAxisSvg.selectAll('.tick text')[0]),
          function(el) {
            return $(el).offset().left;
          }
        )
      );
      label.attr({
        "x": -((this.height - $label.width()) / 2),
        // Position the y axis label slightly offset from
        // the left-most tick value
        "y": -($label.offset().left - smallestLeftOffset) - $label.height() - 9 // magical constant
      });
    }
  };

}($, window.d3));