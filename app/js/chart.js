(function($, d3) {

  var BarChart = window.BarChart = function(id, data, label, metric, keepScale){
    this.data = data;
    this.id = id;
    this.label = label;
    this.metric = metric;
    this.keepScale = keepScale;
  };

  BarChart.prototype.render = function(){
    var convertedData = this.convertData();
    var $professions = $(this.id);
    var margin = {top: 10, right: 20, bottom: 20, left: 65},
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

    svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

    this.yAxisSvg = svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      //.attr("transform", "translate(" + width + ", 0)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end");

    svg.selectAll("line.y")
      .data(y.ticks(6))
      .enter().append("line")
      .attr("class", "y")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", y)
      .attr("y2", y)
      .style("stroke", "#f5f5f5");

    this.barData = svg.selectAll(".bar")
      .data(convertedData)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return x(d.x); })
      .attr("width", x.rangeBand())
      .attr("y", function(d) { return y(d.y); })
      .attr("height", function(d) { return height - y(d.y); });


  };

  BarChart.prototype.convertData = function(){
    return _.map(this.data, function(datum){
      return {x: datum[this.label], y: datum[this.metric]};
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
}($, window.d3));