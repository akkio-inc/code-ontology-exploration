/**
 * Co-change force-directed graph visualization.
 * Nodes = files, edges = files that change together, edge weight = frequency.
 */

const Graph = (() => {
  let svg, width, height, simulation;
  let currentData = null;
  let minWeight = 3;
  let colorMode = "directory"; // "directory" or "community"

  function init(container) {
    const rect = container.getBoundingClientRect();
    width = rect.width;
    height = rect.height;

    d3.select(container).selectAll("*").remove();

    svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    // Add zoom behavior
    const g = svg.append("g");
    svg.call(d3.zoom()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => g.attr("transform", event.transform))
    );

    svg = g; // draw into the zoomable group
  }

  function render(data, threshold = 3) {
    currentData = data;
    minWeight = threshold;
    if (!svg || !data) return;

    svg.selectAll("*").remove();

    // Filter edges by weight threshold
    const links = data.links.filter(l => l.weight >= threshold);
    const linkedNodes = new Set();
    links.forEach(l => {
      linkedNodes.add(l.source.id || l.source);
      linkedNodes.add(l.target.id || l.target);
    });
    const nodes = data.nodes.filter(n => linkedNodes.has(n.id));

    if (nodes.length === 0) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#555")
        .text("No edges at this threshold");
      return;
    }

    // Color by directory or community
    const colorKey = colorMode === "community" ? "community" : "group";
    const colorValues = [...new Set(nodes.map(n => n[colorKey]))];
    const color = d3.scaleOrdinal()
      .domain(colorValues)
      .range(colorMode === "community" ? d3.schemeCategory10 : d3.schemeTableau10);

    // Edge weight → thickness
    const maxWeight = d3.max(links, l => l.weight) || 1;
    const edgeScale = d3.scaleLinear().domain([threshold, maxWeight]).range([0.5, 3]);

    // Node size by degree
    const maxDegree = d3.max(nodes, n => n.degree) || 1;
    const nodeScale = d3.scaleSqrt().domain([1, maxDegree]).range([3, 12]);

    // Force simulation
    if (simulation) simulation.stop();

    simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(80).strength(l => l.weight / maxWeight * 0.3))
      .force("charge", d3.forceManyBody().strength(-50))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(d => nodeScale(d.degree) + 2));

    const tooltip = d3.select("body").selectAll(".tooltip").data([0]).join("div").attr("class", "tooltip").style("opacity", 0);

    // Draw edges
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#2a2a4e")
      .attr("stroke-width", d => edgeScale(d.weight))
      .attr("stroke-opacity", 0.6);

    // Draw nodes
    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", d => nodeScale(d.degree))
      .attr("fill", d => color(d[colorKey]))
      .attr("fill-opacity", 0.8)
      .attr("stroke", "#0a0a0f")
      .attr("stroke-width", 0.5)
      .call(drag(simulation))
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(100).style("opacity", 1);
        tooltip.html(`
          <strong>${d.id}</strong><br>
          group: ${d.group}<br>
          commits: ${d.commit_count}<br>
          connections: ${d.degree}
        `)
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 10) + "px");

        // Highlight connected edges
        link.attr("stroke-opacity", l =>
          (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1
        ).attr("stroke", l =>
          (l.source.id === d.id || l.target.id === d.id) ? "#6366f1" : "#2a2a4e"
        );
        node.attr("fill-opacity", n => {
          const connected = links.some(l =>
            (l.source.id === d.id && l.target.id === n.id) ||
            (l.target.id === d.id && l.source.id === n.id)
          );
          return (n.id === d.id || connected) ? 1 : 0.15;
        });
      })
      .on("mouseout", () => {
        tooltip.transition().duration(200).style("opacity", 0);
        link.attr("stroke-opacity", 0.6).attr("stroke", "#2a2a4e");
        node.attr("fill-opacity", 0.8);
      });

    // Labels for high-degree nodes
    const labelThreshold = d3.quantile(nodes.map(n => n.degree).sort(d3.ascending), 0.85) || 3;
    svg.append("g")
      .selectAll("text")
      .data(nodes.filter(n => n.degree >= labelThreshold))
      .join("text")
      .attr("class", "node-label")
      .text(d => d.id.split("/").pop())
      .attr("dx", d => nodeScale(d.degree) + 3)
      .attr("dy", 3);

    const labels = svg.selectAll(".node-label");

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
      labels
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    });
  }

  function updateThreshold(threshold) {
    if (currentData) render(currentData, threshold);
  }

  function drag(simulation) {
    return d3.drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x; d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
      });
  }

  function setColorMode(mode) {
    colorMode = mode;
    if (currentData) render(currentData, minWeight);
  }

  return { init, render, updateThreshold, setColorMode };
})();
