(function($, d3) {
  'use strict';

  var _this;

  var BarChart = window.BarChart = function(options){

    this.data = options.data;
    this.id = options.id;
    this.label = options.label;
    this.metric = options.metric;
    this.keepScale = options.keepScale;

    var defaultOptions = {
      yAxisLabel: null,
      yAxisLabels: null,
      // Cause y axis scales to be contracted, eg: 1000 becomes 1k
      contractYAxisScales: true,
      barInfoBoxPadding: 10,
      boxInnerWidth: 110,
      prependToYAxisScales: null
    };

    this.options = _.extend(defaultOptions, options);

    _this = this;
  };

  BarChart.prototype.render = function(){
    var convertedData = this.convertedData = this.convertData();
    var $container = $(this.id);
    var margin = {top: 10, right: 20, bottom: 80, left: 65},
        width = $container.width() - margin.left - margin.right;
    var height = this.height = 390 - margin.top - margin.bottom;
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

    this.contractYAxisScales();

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
      .style("stroke", "none");

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
        .on("mouseover", this.activateBar)
        .on("mouseout", this.deactivateBar);

    // Bar info boxes
    this.barInfo = svg.selectAll(".bar-group")
      .append("g")
      .classed("bar-info", true)
      .on("mouseout", this.barInfoOnMouseOut)
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
      var padding = _this.options.barInfoBoxPadding;
      title.attr("x", padding);
      text.attr({
        // Wrap the text at the title's width
        "width": title.width(),
        // The height of the foreignObject's body element
        "height": text.find('p').height(),
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
    });

    // TODO: super hacky, the update/render cycles should be rolled into
    // one, rather than faking an update to get around legacy specifications
    this.updateBarInfoText()
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
    var convertedData = this.convertedData = this.convertData();
    if (!this.keepScale){
      yScale.domain([0, d3.max(convertedData, function(d) { return d.y; })]);
      this.yAxis.scale(yScale);
      this.chart.select(".y").transition().duration(10).call(this.yAxis);
      this.contractYAxisScales();
    }
    this.barData.data(convertedData)
      .transition().duration(500).delay(50)
      .attr("y", function(d) { return yScale(d.y); })
      .attr("height", function(d) { return height - yScale(d.y); });
    this.updateBarInfoText();
  };

  BarChart.prototype.contractYAxisScales = function() {
    if (_this.options.contractYAxisScales) {
      _this.yAxisSvg.selectAll('.tick')
        .each(function(d, i) {
          d3.select(this).select('text').text(function() {
            var value = _this.contractScale(d);
            if (_this.options.prependToYAxisScales) {
              value += ''; // coerce to string
              value = _this.options.prependToYAxisScales + value;
            }
            return value;
          });
        });
    }
  };

  BarChart.prototype.contractScale = function(scale) {
    var scaleTransforms = [
      {
        divisibleBy: 1000,
        append: "k"
      },
      {
        divisibleBy: 1000000,
        append: "m"
      },
      {
        divisibleBy: 1000000000,
        append: "b"
      }
    ];
    var transformedScale = null;
    _.each(scaleTransforms, function(obj) {
      var scaled = scale / obj.divisibleBy;
      if (Math.abs(scaled) > 1) {
        transformedScale = scaled + obj.append;
      }
    });
    return transformedScale || scale
  };

  BarChart.prototype.renderYAxisLabel = function() {
    var labelText = this.getYAxisText();
    if (labelText) {
      // Add the label
      var label = this.yAxisSvg.append("text")
        .classed("y-axis-label", true)
        .attr("transform", "rotate(-90)")
        .style("text-anchor", "end")
        .text(labelText);
      this._positionTheYAxisLabel(label);
    }
  };

  BarChart.prototype.updateYAxisLabel = function(yAxisLabelIndex) {
    var labelText = this.getYAxisText(yAxisLabelIndex);
    if (labelText) {
      var _this = this;
      // Hack: delaying to let d3 finish the rendering of the y-axis
      // scale text. TODO: have this fired by the y-axis generator
      setTimeout(function() {
        var label = _this.yAxisSvg.select(".y-axis-label")
          .text(labelText);
        _this._positionTheYAxisLabel(label);
      }, 50)
    }
  };

  BarChart.prototype.getYAxisText = function(yAxisLabelIndex) {
    if (this.options.yAxisLabels) {
      return this.options.yAxisLabels[yAxisLabelIndex || 0];
    } else {
      return this.options.yAxisLabel;
    }
  };

  BarChart.prototype._positionTheYAxisLabel = function(label) {
    var labelNode = label.node();
    var maxLeftOffset = _.max(
      _.map(
        $(this.yAxisSvg.selectAll('.tick text')[0]),
        function(el) {
          var bBox = el.getBBox();
          return Math.abs(bBox.y) + bBox.width;
        }
      )
    );
    var xPos = -((this.height - labelNode.getBBox().width) / 2);
    // Position the y axis label slightly offset from
    // the left-most tick value
    var yPos = -maxLeftOffset - labelNode.getBBox().height;
    label.attr({
      "x": xPos,
      "y": yPos
    });
  };

  BarChart.prototype.activateBar = function() {
    d3.select(this)
      // Denote the current bar as active
      .classed("active", true)
      // Bring the active bar group to the front
      .each(function() {
        var barGroup = this.parentNode;
        barGroup.parentNode.appendChild(barGroup);
      });
    // Add `inactive` classes to the other bars
    _this.chart.selectAll(".bar")
      .filter(":not(.active)")
      .classed("inactive", true);
  };

  BarChart.prototype.deactivateBar = function(){
    // Deactivate the bar if the new target is not a
    // sibling or sibling's child.
    if (!$(this.parentNode).has(d3.event.toElement).length) {
      _this._deactivateBar(this);
    }
  };

  BarChart.prototype._deactivateBar = function(barElement){
    // Deactivate the bar
    d3.select(barElement).classed("active", false);
    // Remove `inactive` classes from the other bars
    _this.chart.selectAll(".bar")
      .filter(":not(.active)")
      .classed("inactive", false);
  };

  BarChart.prototype.barInfoOnMouseOut = function() {
    var clientX = d3.event.clientX;
    var clientY = d3.event.clientY;
    var offset = $(this).offset();
    var bBox = this.getBBox();
    var top = offset.top - scrollY();
    var bottom = top + bBox.height;
    var left = offset.left;
    var right = left + bBox.width;
    if (
      clientX < left || clientX > right ||
      clientY < top || clientY > bottom
    ) {
      var bar = d3.select(this.parentNode).select('.bar').node();
      _this._deactivateBar(bar);
    }
  };

  function scrollY() {
    // x-browser scrollY wrapper
    return (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;
  }

  BarChart.prototype.updateBarInfoText = function() {
    // Update each title
    this.barInfo
      .each(function(d, i) {
        var value = Math.floor(_this.convertedData[i].y);
        var formattedValue = d3.format("0,000")(value);
        var $title = $(d3.select(this).select('.title').node());
        $title.text(formattedValue);
      });

    // Update each text
    this.barInfo.selectAll('.text p')
      .text(function(d) {
        if (_this.options.barInfoText) {
          var template = _this.options.barInfoText[0];
          return _.template(template, {xAxis: d.x});
        } else {
          return d.x;
        }
      });

    // Resize and position each ba
    this.barInfo.each(function() {
      // Reset the visibility state
      var barInfo = d3.select(this)
        .classed("post-render", false);

      var background = barInfo.select('.background');
      var title = barInfo.select('.title');
      var boxInnerWidth = _.max([title.node().getBBox().width, _this.options.boxInnerWidth]);
      var text = barInfo.select('.text');
      var foreignObject = $(text.node()).find('foreignObject');
      var oldHeight = foreignObject.height();
      foreignObject.attr("width", boxInnerWidth);
      var newHeight = foreignObject.find('p').height();
      foreignObject.attr("height", newHeight);

      // Scale the background for the new size
      var backgroundHeight = parseInt(background.attr('height'));
      background.attr({
        "width": boxInnerWidth + (_this.options.barInfoBoxPadding * 2),
        "height": backgroundHeight + (newHeight - oldHeight)
      });

      // Hide the barInfo
      barInfo.classed("post-render", true);
    })
  }

}($, window.d3));