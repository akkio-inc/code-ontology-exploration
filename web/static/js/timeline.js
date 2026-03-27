/**
 * Timeline chart — stacked area / bar chart of commit metrics over time.
 */

const Timeline = (() => {
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  let svg, width, height;
  let currentData = null;

  function init(container) {
    const rect = container.getBoundingClientRect();
    width = rect.width - margin.left - margin.right;
    height = rect.height - margin.top - margin.bottom;

    d3.select(container).selectAll("*").remove();

    svg = d3.select(container)
      .append("svg")
      .attr("width", rect.width)
      .attr("height", rect.height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  }

  function render(data, metric = "churn") {
    currentData = data;
    if (!svg) return;

    svg.selectAll("*").remove();

    if (!data || data.length === 0) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#555")
        .text("No data available");
      return;
    }

    const parseDate = d3.timeParse("%Y-%m-%d");
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => parseDate(d.period)))
      .range([0, width]);

    const maxVal = d3.max(data, d => d[metric]) || 1;
    const y = d3.scaleLinear()
      .domain([0, maxVal])
      .range([height, 0])
      .nice();

    // X axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(d3.timeMonth.every(3)).tickFormat(d3.timeFormat("%b %Y")))
      .selectAll("text")
      .attr("fill", "#666")
      .attr("font-size", "9px");

    svg.selectAll(".domain, .tick line").attr("stroke", "#2a2a3e");

    // Y axis
    svg.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".2s")))
      .selectAll("text")
      .attr("fill", "#666")
      .attr("font-size", "9px");

    // Area
    const area = d3.area()
      .x(d => x(parseDate(d.period)))
      .y0(height)
      .y1(d => y(d[metric]))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(data)
      .attr("fill", "#6366f1")
      .attr("fill-opacity", 0.3)
      .attr("d", area);

    // Line
    const line = d3.line()
      .x(d => x(parseDate(d.period)))
      .y(d => y(d[metric]))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#6366f1")
      .attr("stroke-width", 1.5)
      .attr("d", line);

    // Dots + tooltip
    const tooltip = d3.select("body").selectAll(".tooltip").data([0]).join("div").attr("class", "tooltip").style("opacity", 0);

    svg.selectAll(".dot")
      .data(data)
      .join("circle")
      .attr("class", "dot")
      .attr("cx", d => x(parseDate(d.period)))
      .attr("cy", d => y(d[metric]))
      .attr("r", 3)
      .attr("fill", "#6366f1")
      .attr("stroke", "#0a0a0f")
      .attr("stroke-width", 1)
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(100).style("opacity", 1);
        tooltip.html(`
          <strong>${d.period}</strong><br>
          ${metric}: ${d[metric].toLocaleString()}<br>
          commits: ${d.num_commits}<br>
          authors: ${d.unique_authors}<br>
          files: ${d.unique_files_touched}
        `)
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(200).style("opacity", 0);
      });
  }

  function updateMetric(metric) {
    if (currentData) render(currentData, metric);
  }

  return { init, render, updateMetric };
})();
