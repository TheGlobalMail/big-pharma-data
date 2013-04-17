(function($, d3) {
  'use strict';

  var _this;

  var BarChart = window.BarChart = function(options){

    this.data = options.data;
    this.id = options.id;
    this.label = options.label;
    this.metric = options.metric;
    this.keepScale = options.keepScale;
    this.buttonIndex = 0;

    var defaultOptions = {
      "yAxisLabel": null,
      "yAxisLabels": null,
      // Cause y axis scales to be contracted, eg: 1000 becomes 1k
      "contractYAxisScales": true,
      "barInfoBoxPadding": 10,
      "boxInnerWidth": 104,
      "prependToYAxisScales": null
    };

    this.options = _.extend(defaultOptions, options);

    _this = this;
  };

  BarChart.prototype.render = function(){
    var convertedData = this.convertedData = this.convertData();
    var $container = this.$container = $(this.id);
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
    this.xAxisSvg = svg.append("g")
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
    this.barContainer = svg.append("g")
      .classed("bar-container", true);

    this.barGroup = this.barContainer.selectAll(".bar")
      .data(convertedData)
      .enter().append("g")
      .classed("bar-group", true)
      .on("mouseenter", this.activateBar);

    this.barData = this.barGroup.append("rect")
      .classed("bar", true)
      .attr("x", function(d) { return x(d.x); })
      .attr("width", x.rangeBand())
      .attr("y", function(d) { return y(d.y); })
      .attr("height", function(d) { return height - y(d.y); });

    // Bar hit areas
    this.barHitArea = this.barGroup
      .append("rect")
      .data(convertedData)
      .classed("bar-hit-area", true)
      .attr("x", function(d) { return x(d.x); })
      .attr("width", x.rangeBand())
      .attr("y", 0)
      .attr("height", function(d) { return height; })

    // Bar info boxes
    this.barInfo = this.barGroup
      .append("g")
      .classed("bar-info", true)
      .attr("transform", function(d) {
        // Position them with the related bar
        var xPos = x(d.x) - (x.rangeBand() / 2) - 6;
        var yPos = (height / 2) - 25;
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
    });

    // TODO: super hacky, the update/render cycles should be rolled into
    // one, rather than faking an update to get around legacy specifications
    this.updateBarInfoText();

    this.bindResetBarStates();

    this.postRenderCleanup();
  };

  BarChart.prototype.convertData = function(){
    return _.map(this.data, function(datum){
      return {x: _.string.capitalize(datum[this.label]), y: datum[this.metric]};
    }, this);
  };

  BarChart.prototype.updateMetric = function(metric, index){
    if (index) {
      this.buttonIndex = index;
    }
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

  BarChart.prototype.resetYAxisFromZero = function() {
    this.updateMetric(this.metric);
  };

  BarChart.prototype.setYAxisToZero = function() {
    var yScale = this.yScale;
    this.barData
      .transition().duration(500).delay(50)
      .attr("y", function(d) { return yScale(0); })
      .attr("height", function(d) { return 0; });
  };

  BarChart.prototype.contractYAxisScales = function() {
    if (_this.options.contractYAxisScales) {
      _this.yAxisSvg.selectAll('.tick')
        .each(function(d, i) {
          d3.select(this).select('text').text(function() {
            var value = _this.contractScale(d);
            if (_this.options.prependToYAxisScales) {
              value = '' + _this.options.prependToYAxisScales + value;
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
    var barGroup = this;
    // Denote the other bars as inactive
    _this.chart.selectAll(".bar-group")
      .classed("active", false)
      .classed("inactive", true);
    // Denote the current bar as active
    d3.select(barGroup)
      .classed("active", true)
      .classed("inactive", false);
    // Bring the active bar group to the front
    barGroup.parentElement.appendChild(barGroup);
  };

  BarChart.prototype.resetBarStates = function(){
    _this.chart.selectAll(".bar-group")
      .classed("active", false)
      .classed("inactive", false);
  };

  BarChart.prototype.bindResetBarStates = function() {
    this.barContainer.on("mouseleave", this.resetBarStates);
    // FF hacks
    this.$container.on("mouseleave", this.resetBarStates);
    this.xAxisSvg.on("mouseenter", this.resetBarStates);
    this.yAxisSvg.on("mouseenter", this.resetBarStates);
  };

  function scrollY() {
    // x-browser scrollY wrapper
    return (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;
  }

  BarChart.prototype.findParentWithClass = function(element, className, maxDepth) {
    // Walk up the document looking for an element with the class matching `classname`.
    // `maxDepth` denotes the point at which the traversal will cut short, defaults to 150.
    var depthRemaining = maxDepth || 150;
    var elementName = element.nodeName.toLowerCase();
    while (elementName && elementName != 'html' && depthRemaining > 0) {
      if (element.classList.contains(className)) {
        return element;
      }
      element = element.parentElement;
      elementName = element.nodeName.toLowerCase();
      depthRemaining--;
    }
  };

  BarChart.prototype.updateBarInfoText = function() {
    // Update each title
    this.barInfo.each(function(d, i) {
      var value = Math.floor(_this.convertedData[i].y);
      var formattedValue = d3.format("0,000")(value);
      var $title = $(d3.select(this).select('.title').node());
      if (_this.options.prependToYAxisScales) {
        formattedValue = '' + _this.options.prependToYAxisScales + value;
      }
      $title.text(formattedValue);
    });

    // Update each text
    this.barInfo.selectAll('.text p')
      .text(function(d) {
        if (_this.options.barInfoText) {
          var template = _this.options.barInfoText[_this.buttonIndex];
          var xAxis, yAxis;
          if (isNaN(d.x)) {
            xAxis = d.x;
            if (_.last(xAxis) === 's') {
              xAxis = xAxis.slice(0, xAxis.length-1);
            }
          } else {
            xAxis = Math.floor(d.x);
          }
          if (isNaN(d.y)) {
            yAxis = d.y;
            if (yAxis[yAxis.length-1] === 's') {
              yAxis = yAxis.slice(0, yAxis.length-1);
            }
          } else {
            yAxis = Math.floor(d.y);
          }
          return _.template(template, {xAxis: xAxis, yAxis: yAxis});
        } else {
          return d.x;
        }
      });

    // Resize and position each
    this.barInfo.each(function(){
      var barInfoNode = this;
      // Delaying to ensure the bars have been positioned
      setTimeout(function() {
        // Reset the visibility state
        var barInfo = d3.select(barInfoNode);

        var background = barInfo.select('.background');
        var title = barInfo.select('.title');
        // Left offset difference between the first two bars
        var boxInnerWidth = _.max([
          title.node().getBBox().width,
          $(_this.barData[0][1]).offset().left - $(_this.barData[0][0]).offset().left + 9
        ]);
        var text = barInfo.select('.text');
        var $foreignObject = $(text.node()).find('foreignObject');
        var foreignObject = $foreignObject.get(0);
        var oldHeight = foreignObject.getBBox().height;
        $foreignObject.attr("width", boxInnerWidth);
        var $foreignObjectPara = $foreignObject.find('p');
        // Sum of the paragraph's height & padding-top
        var newHeight = $foreignObjectPara.height() + parseInt($foreignObjectPara.css('padding-top')) + 3;
        $foreignObject.attr("height", newHeight);

        // Scale the background for the new size
        var backgroundHeight = parseInt(background.attr('height'));
        background.attr({
          "width": boxInnerWidth + (_this.options.barInfoBoxPadding * 2),
          "height": backgroundHeight + (newHeight - oldHeight)
        });
      }, 200);
    })
  };

  BarChart.prototype.postRenderCleanup = function() {
    // X-browser fixes and whatnot
    this.barInfo.each(function() {
      // Fixing a FF bug where the background appears below the title.
      var barInfo = d3.select(this);
      var titleBBox = barInfo.select('.title').node().getBBox();
      var background = barInfo.select('.background');
      var backgroundBBox = background.node().getBBox();
      if (titleBBox.y < backgroundBBox.y) {
        background.attr("y", -titleBBox.height);
      }
    });
  }

}($, window.d3));