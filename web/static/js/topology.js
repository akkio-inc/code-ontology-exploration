/**
 * Topology dashboard — structural metrics for comparing specimen codebases.
 * Renders summary cards + histograms for graph, commit shape, churn, entropy.
 */

const Topology = (() => {
  let container;

  function init(el) {
    container = el;
  }

  function render(data) {
    if (!container || !data) return;
    container.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "topo-grid";

    // Summary cards row
    wrap.appendChild(renderSummaryCards(data));

    // Histograms row
    const histRow = document.createElement("div");
    histRow.className = "topo-hist-row";
    histRow.appendChild(renderHistogram(
      data.commit_shape.files_per_commit_histogram,
      "files", "count",
      "Files per Commit",
      "#6366f1"
    ));
    histRow.appendChild(renderHistogram(
      data.commit_shape.dirs_per_commit_histogram,
      "dirs", "count",
      "Directories per Commit",
      "#22d3ee"
    ));
    histRow.appendChild(renderDegreeDistribution(
      data.graph.degree_distribution
    ));
    wrap.appendChild(histRow);

    // Burstiness + IET histogram row
    if (data.burstiness) {
      const burstRow = document.createElement("div");
      burstRow.className = "topo-hist-row";
      burstRow.appendChild(renderIETHistogram(data.burstiness.iet_histogram));
      if (data.directory_coupling) {
        burstRow.appendChild(renderChordDiagram(data.directory_coupling));
      }
      wrap.appendChild(burstRow);
    }

    // Hotspots + bridge files
    const detailRow = document.createElement("div");
    detailRow.className = "topo-detail-row";
    detailRow.appendChild(renderTable(
      "Churn Hotspots (top files)",
      ["File", "Churn", "% Total"],
      data.churn_hotspots.top_hotspots.slice(0, 10).map(h => [
        shortPath(h.file), h.churn.toLocaleString(), h.pct_of_total + "%"
      ])
    ));
    detailRow.appendChild(renderTable(
      "Bridge Files (betweenness centrality)",
      ["File", "Centrality"],
      data.graph.top_betweenness.slice(0, 10).map(b => [
        shortPath(b.file), b.centrality.toFixed(4)
      ])
    ));
    wrap.appendChild(detailRow);

    container.appendChild(wrap);
  }

  function renderSummaryCards(data) {
    const g = data.graph;
    const cs = data.commit_shape;
    const ch = data.churn_hotspots;
    const ce = data.change_entropy;

    const bu = data.burstiness || {};
    const cards = [
      { label: "Modularity", value: g.modularity.toFixed(3), desc: "Higher = cleaner clusters" },
      { label: "Communities", value: g.num_communities, desc: "Detected groups" },
      { label: "Clustering Coeff", value: g.avg_clustering.toFixed(3), desc: "Neighborhood density" },
      { label: "Components", value: g.num_components, desc: "Disconnected subgraphs" },
      { label: "Avg Files/Commit", value: cs.avg_files_per_commit, desc: `Median: ${cs.median_files_per_commit}` },
      { label: "Avg Dirs/Commit", value: cs.avg_dirs_per_commit, desc: `Median: ${cs.median_dirs_per_commit}` },
      { label: "Creation Ratio", value: (cs.creation_ratio * 100).toFixed(1) + "%", desc: `${cs.created_files} of ${cs.total_unique_files} files` },
      { label: "Churn Gini", value: ch.churn_gini.toFixed(3), desc: "0=equal, 1=concentrated" },
      { label: "Change Entropy", value: ce.avg_change_entropy.toFixed(2) + " bits", desc: "Higher = flexible coupling" },
      { label: "Author Entropy", value: ch.avg_author_entropy.toFixed(2) + " bits", desc: "Higher = shared ownership" },
      { label: "Burstiness", value: bu.global_burstiness != null ? bu.global_burstiness.toFixed(3) : "N/A", desc: "-1=periodic, 0=random, +1=bursty" },
      { label: "File Burstiness", value: bu.avg_file_burstiness != null ? bu.avg_file_burstiness.toFixed(3) : "N/A", desc: "Avg per-file temporal pattern" },
    ];

    const row = document.createElement("div");
    row.className = "topo-cards";
    cards.forEach(c => {
      const card = document.createElement("div");
      card.className = "topo-card";
      card.innerHTML = `
        <div class="topo-card-value">${c.value}</div>
        <div class="topo-card-label">${c.label}</div>
        <div class="topo-card-desc">${c.desc}</div>
      `;
      row.appendChild(card);
    });
    return row;
  }

  function renderHistogram(data, xKey, yKey, title, color) {
    const div = document.createElement("div");
    div.className = "topo-chart";

    const header = document.createElement("h4");
    header.textContent = title;
    div.appendChild(header);

    const chartW = 320, chartH = 180;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };
    const w = chartW - margin.left - margin.right;
    const h = chartH - margin.top - margin.bottom;

    // Bin into buckets for readability (cap at 30 bars)
    let binned = data;
    if (data.length > 30) {
      const maxX = data[data.length - 1][xKey];
      const binSize = Math.ceil(maxX / 25);
      const buckets = {};
      data.forEach(d => {
        const bin = Math.floor(d[xKey] / binSize) * binSize;
        buckets[bin] = (buckets[bin] || 0) + d[yKey];
      });
      binned = Object.entries(buckets)
        .map(([k, v]) => ({ [xKey]: +k, [yKey]: v }))
        .sort((a, b) => a[xKey] - b[xKey]);
    }

    const svg = d3.select(div).append("svg")
      .attr("width", chartW).attr("height", chartH)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(binned.map(d => d[xKey]))
      .range([0, w]).padding(0.15);

    const y = d3.scaleLinear()
      .domain([0, d3.max(binned, d => d[yKey]) || 1])
      .range([h, 0]).nice();

    // Bars
    svg.selectAll("rect").data(binned).join("rect")
      .attr("x", d => x(d[xKey]))
      .attr("y", d => y(d[yKey]))
      .attr("width", x.bandwidth())
      .attr("height", d => h - y(d[yKey]))
      .attr("fill", color)
      .attr("fill-opacity", 0.7);

    // Axes
    const xAxis = svg.append("g").attr("transform", `translate(0,${h})`);
    const ticks = binned.length > 15
      ? binned.filter((_, i) => i % Math.ceil(binned.length / 10) === 0).map(d => d[xKey])
      : binned.map(d => d[xKey]);
    xAxis.call(d3.axisBottom(x).tickValues(ticks).tickFormat(d => d))
      .selectAll("text").attr("fill", "#666").attr("font-size", "8px");

    svg.append("g").call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(".0s")))
      .selectAll("text").attr("fill", "#666").attr("font-size", "8px");

    svg.selectAll(".domain, .tick line").attr("stroke", "#2a2a3e");

    return div;
  }

  function renderDegreeDistribution(data) {
    const div = document.createElement("div");
    div.className = "topo-chart";

    const header = document.createElement("h4");
    header.textContent = "Degree Distribution (log-log)";
    div.appendChild(header);

    const chartW = 320, chartH = 180;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };
    const w = chartW - margin.left - margin.right;
    const h = chartH - margin.top - margin.bottom;

    const filtered = data.filter(d => d.degree > 0 && d.count > 0);
    if (filtered.length === 0) return div;

    const svg = d3.select(div).append("svg")
      .attr("width", chartW).attr("height", chartH)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLog()
      .domain([d3.min(filtered, d => d.degree), d3.max(filtered, d => d.degree)])
      .range([0, w]).nice();

    const y = d3.scaleLog()
      .domain([1, d3.max(filtered, d => d.count)])
      .range([h, 0]).nice();

    // Points
    svg.selectAll("circle").data(filtered).join("circle")
      .attr("cx", d => x(d.degree))
      .attr("cy", d => y(d.count))
      .attr("r", 2.5)
      .attr("fill", "#f472b6")
      .attr("fill-opacity", 0.8);

    svg.append("g").attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(4, ".0f"))
      .selectAll("text").attr("fill", "#666").attr("font-size", "8px");

    svg.append("g").call(d3.axisLeft(y).ticks(4, ".0f"))
      .selectAll("text").attr("fill", "#666").attr("font-size", "8px");

    svg.selectAll(".domain, .tick line").attr("stroke", "#2a2a3e");

    return div;
  }

  function renderTable(title, headers, rows) {
    const div = document.createElement("div");
    div.className = "topo-table";

    const h4 = document.createElement("h4");
    h4.textContent = title;
    div.appendChild(h4);

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tr = document.createElement("tr");
    headers.forEach(h => {
      const th = document.createElement("th");
      th.textContent = h;
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    rows.forEach(row => {
      const tr = document.createElement("tr");
      row.forEach(cell => {
        const td = document.createElement("td");
        td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    div.appendChild(table);
    return div;
  }

  function renderIETHistogram(data) {
    const div = document.createElement("div");
    div.className = "topo-chart";
    div.setAttribute("data-info-key", "hist_iet");

    const header = document.createElement("h4");
    header.textContent = "Inter-Event Time Distribution";
    div.appendChild(header);

    if (!data || data.length === 0) {
      div.innerHTML += '<p style="color:#555;font-size:0.7rem">No data</p>';
      return div;
    }

    const chartW = 320, chartH = 180;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };
    const w = chartW - margin.left - margin.right;
    const h = chartH - margin.top - margin.bottom;

    // Fixed order for buckets
    const order = ["<1h", "1-4h", "4-8h", "8-24h", "1-3d", "3-7d", ">7d"];
    const ordered = order.map(b => {
      const found = data.find(d => d.bucket === b);
      return { bucket: b, count: found ? found.count : 0 };
    }).filter(d => d.count > 0);

    const svg = d3.select(div).append("svg")
      .attr("width", chartW).attr("height", chartH)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(ordered.map(d => d.bucket))
      .range([0, w]).padding(0.15);

    const y = d3.scaleLinear()
      .domain([0, d3.max(ordered, d => d.count) || 1])
      .range([h, 0]).nice();

    svg.selectAll("rect").data(ordered).join("rect")
      .attr("x", d => x(d.bucket))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => h - y(d.count))
      .attr("fill", "#f59e0b")
      .attr("fill-opacity", 0.7);

    svg.append("g").attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x))
      .selectAll("text").attr("fill", "#666").attr("font-size", "7px")
      .attr("transform", "rotate(-30)").attr("text-anchor", "end");

    svg.append("g").call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(".0s")))
      .selectAll("text").attr("fill", "#666").attr("font-size", "8px");

    svg.selectAll(".domain, .tick line").attr("stroke", "#2a2a3e");

    return div;
  }

  function renderChordDiagram(data) {
    const div = document.createElement("div");
    div.className = "topo-chart";
    div.setAttribute("data-info-key", "chord_dirs");

    const header = document.createElement("h4");
    header.textContent = "Directory Coupling (Chord)";
    div.appendChild(header);

    if (!data || !data.directories || data.directories.length < 2) {
      div.innerHTML += '<p style="color:#555;font-size:0.7rem">Not enough directories</p>';
      return div;
    }

    const size = 320;
    const outerRadius = size / 2 - 30;
    const innerRadius = outerRadius - 15;

    const svg = d3.select(div).append("svg")
      .attr("width", size).attr("height", size)
      .append("g").attr("transform", `translate(${size / 2},${size / 2})`);

    const chord = d3.chord().padAngle(0.05).sortSubgroups(d3.descending);
    const chords = chord(data.matrix);

    const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
    const ribbon = d3.ribbon().radius(innerRadius);

    const color = d3.scaleOrdinal()
      .domain(d3.range(data.directories.length))
      .range(d3.schemeTableau10);

    // Groups (arcs)
    const group = svg.append("g")
      .selectAll("g")
      .data(chords.groups)
      .join("g");

    group.append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.index))
      .attr("stroke", "#0a0a0f");

    group.append("text")
      .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
      .attr("dy", "0.35em")
      .attr("transform", d =>
        `rotate(${(d.angle * 180 / Math.PI - 90)})` +
        `translate(${outerRadius + 5})` +
        (d.angle > Math.PI ? "rotate(180)" : "")
      )
      .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
      .attr("fill", "#888")
      .attr("font-size", "7px")
      .text(d => {
        const name = data.directories[d.index];
        return name.length > 12 ? name.slice(0, 12) + "…" : name;
      });

    // Ribbons
    svg.append("g")
      .attr("fill-opacity", 0.5)
      .selectAll("path")
      .data(chords)
      .join("path")
      .attr("d", ribbon)
      .attr("fill", d => color(d.source.index))
      .attr("stroke", "#0a0a0f")
      .attr("stroke-width", 0.5)
      .on("mouseover", function() { d3.select(this).attr("fill-opacity", 0.8); })
      .on("mouseout", function() { d3.select(this).attr("fill-opacity", 0.5); });

    return div;
  }

  function shortPath(p) {
    const parts = p.split("/");
    return parts.length > 2 ? "…/" + parts.slice(-2).join("/") : p;
  }

  return { init, render };
})();
