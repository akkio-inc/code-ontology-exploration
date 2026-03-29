/**
 * Lab — Comparative wall of charts across all specimens.
 * Each chart tests a different dimension of the human->agent hypothesis.
 */

const Lab = (() => {
  let container;

  const COLORS = {
    django:    "#10b981",
    openhands: "#6366f1",
    openclaw:  "#f43f5e",
  };
  const LABELS = {
    django:    "django (human)",
    openhands: "openhands (hybrid)",
    openclaw:  "openclaw (agent)",
  };

  function init(el) {
    container = el;
  }

  function color(name) {
    return COLORS[name] || "#888";
  }

  function legend(names) {
    const div = document.createElement("div");
    div.className = "lab-legend";
    names.forEach(n => {
      const item = document.createElement("span");
      item.className = "lab-legend-item";
      item.innerHTML = `<span class="lab-legend-dot" style="background:${color(n)}"></span>${LABELS[n] || n}`;
      div.appendChild(item);
    });
    return div;
  }

  function makeCard(title, subtitle) {
    const div = document.createElement("div");
    div.className = "lab-chart";
    const h = document.createElement("h4");
    h.textContent = title;
    div.appendChild(h);
    if (subtitle) {
      const sub = document.createElement("div");
      sub.className = "lab-subtitle";
      sub.textContent = subtitle;
      div.appendChild(sub);
    }
    return div;
  }

  async function loadAll() {
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading lab data...</div>';

    const specimens = await fetch("/api/specimens").then(r => r.json());
    const names = specimens.filter(s => s.has_topology).map(s => s.name);

    if (names.length < 2) {
      container.innerHTML = '<p style="color:#555">Need at least 2 specimens with data.</p>';
      return;
    }

    // Fetch all data in parallel
    const [topoMap, timelineMap, commitsMap] = await Promise.all([
      Promise.all(names.map(n => fetch(`/api/topology/${n}`).then(r => r.json()).then(d => [n, d]))).then(Object.fromEntries),
      Promise.all(names.map(n => fetch(`/api/timeline/${n}`).then(r => r.ok ? r.json() : null).then(d => [n, d]))).then(Object.fromEntries),
      Promise.all(names.map(n => fetch(`/api/commits/${n}`).then(r => r.ok ? r.json() : null).then(d => [n, d]))).then(Object.fromEntries),
    ]);

    container.innerHTML = "";
    container.appendChild(legend(names));

    // Render all charts
    renderOverlaidTimelines(names, timelineMap);
    renderCommitHeatmaps(names, topoMap);
    renderBoxPlotFiles(names, commitsMap);
    renderBoxPlotDirs(names, commitsMap);
    renderLorenzCurves(names, commitsMap);
    renderStackedScope(names, commitsMap);
    renderCumulativeChurn(names, timelineMap);
    renderParallelCoordinates(names, topoMap);
    renderMsgLengthDist(names, topoMap);
    renderDegreeOverlay(names, topoMap);
  }

  // ─── Chart 1: Overlaid Normalized Timelines ───────────────────
  function renderOverlaidTimelines(names, timelineMap) {
    const card = makeCard("Overlaid Normalized Timelines", "X = % of project lifespan, Y = churn per commit (normalized)");
    container.appendChild(card);
    card.appendChild(legend(names));

    const w = card.clientWidth - 32 || 500, h = 220;
    const margin = { top: 10, right: 20, bottom: 30, left: 50 };
    const iw = w - margin.left - margin.right, ih = h - margin.top - margin.bottom;

    const svg = d3.select(card).append("svg").attr("width", w).attr("height", h);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, 100]).range([0, iw]);
    const y = d3.scaleLinear().range([ih, 0]);

    // Compute normalized data per specimen
    let maxY = 0;
    const series = {};
    names.forEach(name => {
      const tl = timelineMap[name];
      if (!tl || !tl.length) return;
      const n = tl.length;
      const pts = tl.map((d, i) => {
        const pct = (i / (n - 1 || 1)) * 100;
        const churnPerCommit = d.num_commits > 0 ? d.churn / d.num_commits : 0;
        return { x: pct, y: churnPerCommit };
      });
      // Normalize to max=1
      const localMax = d3.max(pts, d => d.y) || 1;
      pts.forEach(p => p.y = p.y / localMax);
      series[name] = pts;
      maxY = Math.max(maxY, 1);
    });

    y.domain([0, maxY]);

    g.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).ticks(5).tickFormat(d => d + "%")).selectAll("text,line,path").attr("stroke", "#333").attr("fill", "#666");
    g.append("g").call(d3.axisLeft(y).ticks(4)).selectAll("text,line,path").attr("stroke", "#333").attr("fill", "#666");

    const line = d3.line().x(d => x(d.x)).y(d => y(d.y)).curve(d3.curveBasis);

    names.forEach(name => {
      if (!series[name]) return;
      g.append("path")
        .datum(series[name])
        .attr("fill", "none")
        .attr("stroke", color(name))
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.85)
        .attr("d", line);
    });
  }

  // ─── Chart 2: Commit Hour Heatmaps ────────────────────────────
  function renderCommitHeatmaps(names, topoMap) {
    const card = makeCard("Commit Hour Heatmaps", "X = hour of day, Y = day of week. Intensity = commit count.");
    container.appendChild(card);

    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const perSpecW = Math.floor((card.clientWidth - 32 - (names.length - 1) * 12) / names.length) || 160;
    const cellW = Math.floor(perSpecW / 24);
    const cellH = 14;
    const heatH = cellH * 7 + 30;

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display:flex;gap:12px;flex-wrap:wrap;";
    card.appendChild(wrapper);

    names.forEach(name => {
      const topo = topoMap[name];
      const tp = topo?.temporal_patterns;
      if (!tp || !tp.heatmap) return;

      const heatmap = tp.heatmap; // [hour][dow]
      const maxVal = Math.max(1, ...heatmap.flat());

      const div = document.createElement("div");
      div.style.cssText = "flex:1;min-width:140px;";
      const label = document.createElement("div");
      label.style.cssText = `font-size:0.7rem;color:${color(name)};margin-bottom:4px;font-weight:500;`;
      label.textContent = name;
      div.appendChild(label);

      const svgW = cellW * 24 + 28;
      const svg = d3.select(div).append("svg").attr("width", svgW).attr("height", heatH);
      const g = svg.append("g").attr("transform", "translate(28, 12)");

      // Day labels
      dayLabels.forEach((d, i) => {
        svg.append("text").attr("x", 24).attr("y", 12 + i * cellH + cellH / 2 + 3)
          .attr("text-anchor", "end").attr("fill", "#555").attr("font-size", "7px").text(d);
      });

      // Hour labels (every 6h)
      [0, 6, 12, 18].forEach(h => {
        g.append("text").attr("x", h * cellW + cellW / 2).attr("y", 7 * cellH + 12)
          .attr("text-anchor", "middle").attr("fill", "#555").attr("font-size", "7px").text(h + "h");
      });

      // Cells
      const colorScale = d3.scaleSequential(d3.interpolateInferno).domain([0, maxVal]);
      for (let hour = 0; hour < 24; hour++) {
        for (let dow = 0; dow < 7; dow++) {
          const val = heatmap[hour][dow];
          g.append("rect")
            .attr("x", hour * cellW).attr("y", dow * cellH)
            .attr("width", cellW - 1).attr("height", cellH - 1)
            .attr("rx", 1)
            .attr("fill", val > 0 ? colorScale(val) : "#111");
        }
      }

      wrapper.appendChild(div);
    });
  }

  // ─── Chart 3 & 4: Box Plots ───────────────────────────────────
  function computeBoxStats(values) {
    if (!values.length) return null;
    const sorted = values.slice().sort((a, b) => a - b);
    const n = sorted.length;
    const q1 = sorted[Math.floor(n * 0.25)];
    const median = sorted[Math.floor(n * 0.5)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const whiskerLo = Math.max(sorted[0], q1 - 1.5 * iqr);
    const whiskerHi = Math.min(sorted[n - 1], q3 + 1.5 * iqr);
    const outliers = sorted.filter(v => v < whiskerLo || v > whiskerHi);
    // sample outliers if too many
    const sampledOutliers = outliers.length > 30 ? outliers.filter((_, i) => i % Math.ceil(outliers.length / 30) === 0) : outliers;
    return { q1, median, q3, whiskerLo, whiskerHi, outliers: sampledOutliers, min: sorted[0], max: sorted[n - 1] };
  }

  function renderBoxPlot(names, dataMap, valueExtractor, title, subtitle, yLabel) {
    const card = makeCard(title, subtitle);
    container.appendChild(card);

    const w = card.clientWidth - 32 || 400, h = 220;
    const margin = { top: 10, right: 20, bottom: 30, left: 55 };
    const iw = w - margin.left - margin.right, ih = h - margin.top - margin.bottom;

    const svg = d3.select(card).append("svg").attr("width", w).attr("height", h);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const stats = {};
    let globalMax = 0;
    names.forEach(name => {
      const commits = dataMap[name];
      if (!commits) return;
      const vals = commits.map(valueExtractor).filter(v => v != null);
      const s = computeBoxStats(vals);
      if (s) {
        stats[name] = s;
        globalMax = Math.max(globalMax, s.whiskerHi, ...(s.outliers || []));
      }
    });

    // Cap globalMax for readability
    globalMax = Math.min(globalMax, d3.quantile(Object.values(stats).map(s => s.whiskerHi), 0.95) * 1.5 || globalMax);

    const x = d3.scaleBand().domain(names.filter(n => stats[n])).range([0, iw]).padding(0.4);
    const y = d3.scaleLinear().domain([0, globalMax]).range([ih, 0]).nice();

    g.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x)).selectAll("text").attr("fill", n => color(n.textContent || "")).attr("font-size", "9px");
    g.selectAll(".domain, .tick line").attr("stroke", "#333");
    g.append("g").call(d3.axisLeft(y).ticks(5)).selectAll("text,line,path").attr("stroke", "#333").attr("fill", "#666");

    names.forEach(name => {
      const s = stats[name];
      if (!s) return;
      const cx = x(name) + x.bandwidth() / 2;
      const bw = x.bandwidth();

      // Whisker line
      g.append("line").attr("x1", cx).attr("x2", cx).attr("y1", y(s.whiskerLo)).attr("y2", y(s.whiskerHi))
        .attr("stroke", color(name)).attr("stroke-width", 1);

      // Whisker caps
      [s.whiskerLo, s.whiskerHi].forEach(val => {
        g.append("line").attr("x1", cx - bw * 0.3).attr("x2", cx + bw * 0.3).attr("y1", y(val)).attr("y2", y(val))
          .attr("stroke", color(name)).attr("stroke-width", 1);
      });

      // Box
      g.append("rect")
        .attr("x", x(name)).attr("y", y(s.q3))
        .attr("width", bw).attr("height", Math.max(1, y(s.q1) - y(s.q3)))
        .attr("fill", color(name)).attr("fill-opacity", 0.2)
        .attr("stroke", color(name)).attr("stroke-width", 1);

      // Median line
      g.append("line").attr("x1", x(name)).attr("x2", x(name) + bw).attr("y1", y(s.median)).attr("y2", y(s.median))
        .attr("stroke", color(name)).attr("stroke-width", 2);

      // Outliers
      (s.outliers || []).forEach(v => {
        if (v <= globalMax) {
          g.append("circle").attr("cx", cx).attr("cy", y(v)).attr("r", 1.5)
            .attr("fill", color(name)).attr("opacity", 0.4);
        }
      });
    });
  }

  function renderBoxPlotFiles(names, commitsMap) {
    renderBoxPlot(names, commitsMap,
      c => c.files ? c.files.length : 0,
      "Box Plot: Files per Commit",
      "Median, quartiles, whiskers, outliers",
      "files"
    );
  }

  function renderBoxPlotDirs(names, commitsMap) {
    renderBoxPlot(names, commitsMap,
      c => {
        if (!c.files) return 0;
        const dirs = new Set(c.files.map(f => f.path.split("/")[0]));
        return dirs.size;
      },
      "Box Plot: Directories per Commit",
      "How cross-cutting are individual changes?",
      "dirs"
    );
  }

  // ─── Chart 5: Lorenz Curves ───────────────────────────────────
  function renderLorenzCurves(names, commitsMap) {
    const card = makeCard("Lorenz Curves (Churn Inequality)", "More bowed = more concentrated churn (higher Gini)");
    container.appendChild(card);
    card.appendChild(legend(names));

    const w = card.clientWidth - 32 || 400, h = 280;
    const margin = { top: 10, right: 20, bottom: 30, left: 50 };
    const iw = w - margin.left - margin.right, ih = h - margin.top - margin.bottom;

    const svg = d3.select(card).append("svg").attr("width", w).attr("height", h);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, 1]).range([0, iw]);
    const y = d3.scaleLinear().domain([0, 1]).range([ih, 0]);

    g.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".0%"))).selectAll("text,line,path").attr("stroke", "#333").attr("fill", "#666");
    g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%"))).selectAll("text,line,path").attr("stroke", "#333").attr("fill", "#666");

    // Equality line
    g.append("line").attr("x1", 0).attr("y1", ih).attr("x2", iw).attr("y2", 0)
      .attr("stroke", "#333").attr("stroke-dasharray", "4,4");

    names.forEach(name => {
      const commits = commitsMap[name];
      if (!commits) return;

      // Compute per-file churn
      const fileChurn = {};
      commits.forEach(c => {
        (c.files || []).forEach(f => {
          fileChurn[f.path] = (fileChurn[f.path] || 0) + (f.insertions || 0) + (f.deletions || 0);
        });
      });

      const churns = Object.values(fileChurn).sort((a, b) => a - b);
      if (!churns.length) return;
      const total = d3.sum(churns);
      if (total === 0) return;

      // Build Lorenz points
      const pts = [{ x: 0, y: 0 }];
      let cumChurn = 0;
      churns.forEach((v, i) => {
        cumChurn += v;
        pts.push({ x: (i + 1) / churns.length, y: cumChurn / total });
      });

      const line = d3.line().x(d => x(d.x)).y(d => y(d.y));
      g.append("path").datum(pts).attr("fill", "none")
        .attr("stroke", color(name)).attr("stroke-width", 1.5).attr("opacity", 0.85).attr("d", line);
    });
  }

  // ─── Chart 6: Stacked Bar — Commit Scope ──────────────────────
  function renderStackedScope(names, commitsMap) {
    const card = makeCard("Commit Scope Distribution", "% of commits by files touched: 1, 2-5, 6-10, 11+");
    container.appendChild(card);
    card.appendChild(legend(names));

    const bucketLabels = ["1 file", "2-5 files", "6-10 files", "11+ files"];
    const bucketColors = ["#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"];

    function bucketize(commits) {
      const counts = [0, 0, 0, 0];
      commits.forEach(c => {
        const n = c.files ? c.files.length : 0;
        if (n <= 1) counts[0]++;
        else if (n <= 5) counts[1]++;
        else if (n <= 10) counts[2]++;
        else counts[3]++;
      });
      const total = d3.sum(counts) || 1;
      return counts.map(c => c / total);
    }

    const w = card.clientWidth - 32 || 400, h = 140;
    const margin = { top: 10, right: 20, bottom: 10, left: 80 };
    const iw = w - margin.left - margin.right, ih = h - margin.top - margin.bottom;
    const barH = Math.min(24, ih / names.length - 4);

    const svg = d3.select(card).append("svg").attr("width", w).attr("height", h);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, 1]).range([0, iw]);

    names.forEach((name, i) => {
      const commits = commitsMap[name];
      if (!commits) return;
      const pcts = bucketize(commits);
      const cy = i * (barH + 6);

      // Label
      g.append("text").attr("x", -4).attr("y", cy + barH / 2 + 3)
        .attr("text-anchor", "end").attr("fill", color(name)).attr("font-size", "9px").text(name);

      let cumX = 0;
      pcts.forEach((p, j) => {
        g.append("rect")
          .attr("x", x(cumX)).attr("y", cy)
          .attr("width", Math.max(0, x(p))).attr("height", barH)
          .attr("fill", bucketColors[j]).attr("opacity", 0.8)
          .attr("rx", 2);
        if (p > 0.06) {
          g.append("text")
            .attr("x", x(cumX + p / 2)).attr("y", cy + barH / 2 + 3)
            .attr("text-anchor", "middle").attr("fill", "#000").attr("font-size", "7px")
            .text(Math.round(p * 100) + "%");
        }
        cumX += p;
      });
    });

    // Bucket legend
    const bleg = document.createElement("div");
    bleg.style.cssText = "display:flex;gap:12px;margin-top:8px;font-size:0.65rem;color:#888;";
    bucketLabels.forEach((l, i) => {
      bleg.innerHTML += `<span><span style="display:inline-block;width:8px;height:8px;background:${bucketColors[i]};border-radius:2px;margin-right:3px;"></span>${l}</span>`;
    });
    card.appendChild(bleg);
  }

  // ─── Chart 7: Cumulative Churn Growth ─────────────────────────
  function renderCumulativeChurn(names, timelineMap) {
    const card = makeCard("Cumulative Churn Growth", "X = % of lifespan, Y = cumulative total churn (normalized)");
    container.appendChild(card);
    card.appendChild(legend(names));

    const w = card.clientWidth - 32 || 500, h = 220;
    const margin = { top: 10, right: 20, bottom: 30, left: 50 };
    const iw = w - margin.left - margin.right, ih = h - margin.top - margin.bottom;

    const svg = d3.select(card).append("svg").attr("width", w).attr("height", h);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, 100]).range([0, iw]);
    const y = d3.scaleLinear().domain([0, 1]).range([ih, 0]);

    g.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).ticks(5).tickFormat(d => d + "%")).selectAll("text,line,path").attr("stroke", "#333").attr("fill", "#666");
    g.append("g").call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(".0%"))).selectAll("text,line,path").attr("stroke", "#333").attr("fill", "#666");

    names.forEach(name => {
      const tl = timelineMap[name];
      if (!tl || !tl.length) return;
      const n = tl.length;
      let cumChurn = 0;
      const totalChurn = d3.sum(tl, d => d.churn) || 1;
      const pts = tl.map((d, i) => {
        cumChurn += d.churn;
        return { x: (i / (n - 1 || 1)) * 100, y: cumChurn / totalChurn };
      });

      const line = d3.line().x(d => x(d.x)).y(d => y(d.y));
      g.append("path").datum(pts).attr("fill", "none")
        .attr("stroke", color(name)).attr("stroke-width", 1.5).attr("opacity", 0.85).attr("d", line);
    });
  }

  // ─── Chart 8: Parallel Coordinates ─────────────────────────────
  function renderParallelCoordinates(names, topoMap) {
    const card = makeCard("Parallel Coordinates", "Each axis = a metric (normalized 0-1). Each line = a specimen.");
    container.appendChild(card);
    card.appendChild(legend(names));

    const axes = [
      { label: "Modularity", get: d => d.graph.modularity },
      { label: "Clustering", get: d => d.graph.avg_clustering },
      { label: "Burstiness", get: d => ((d.burstiness?.global_burstiness ?? 0) + 1) / 2 },
      { label: "Gini", get: d => d.churn_hotspots.churn_gini },
      { label: "Files/Commit", get: d => Math.min(d.commit_shape.avg_files_per_commit / 20, 1) },
      { label: "Creation Ratio", get: d => d.commit_shape.creation_ratio },
      { label: "Change Entropy", get: d => Math.min(d.change_entropy.avg_change_entropy / 8, 1) },
    ];

    const w = card.clientWidth - 32 || 500, h = 220;
    const margin = { top: 20, right: 30, bottom: 20, left: 30 };
    const iw = w - margin.left - margin.right, ih = h - margin.top - margin.bottom;

    const svg = d3.select(card).append("svg").attr("width", w).attr("height", h);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scalePoint().domain(axes.map(a => a.label)).range([0, iw]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([ih, 0]);

    // Axes
    axes.forEach(a => {
      const ax = xScale(a.label);
      g.append("line").attr("x1", ax).attr("x2", ax).attr("y1", 0).attr("y2", ih)
        .attr("stroke", "#1a1a2e");
      g.append("text").attr("x", ax).attr("y", -8).attr("text-anchor", "middle")
        .attr("fill", "#666").attr("font-size", "7px").text(a.label);
      // Scale ticks
      [0, 0.5, 1].forEach(v => {
        g.append("text").attr("x", ax - 4).attr("y", yScale(v) + 3).attr("text-anchor", "end")
          .attr("fill", "#333").attr("font-size", "6px").text(v);
      });
    });

    // Specimen lines
    names.forEach(name => {
      const topo = topoMap[name];
      if (!topo) return;
      const pts = axes.map(a => ({
        x: xScale(a.label),
        y: yScale(Math.max(0, Math.min(1, a.get(topo)))),
      }));
      const line = d3.line().x(d => d.x).y(d => d.y);
      g.append("path").datum(pts).attr("fill", "none")
        .attr("stroke", color(name)).attr("stroke-width", 2).attr("opacity", 0.8).attr("d", line);
      // Dots at each axis
      pts.forEach(p => {
        g.append("circle").attr("cx", p.x).attr("cy", p.y).attr("r", 3)
          .attr("fill", color(name));
      });
    });
  }

  // ─── Chart 9: Commit Message Length Distribution ───────────────
  function renderMsgLengthDist(names, topoMap) {
    const card = makeCard("Commit Message Length Distribution", "Histogram of message character counts, overlaid");
    container.appendChild(card);
    card.appendChild(legend(names));

    const allBuckets = ["0-19", "20-49", "50-99", "100-199", "200-499", "500+"];

    const w = card.clientWidth - 32 || 400, h = 200;
    const margin = { top: 10, right: 20, bottom: 30, left: 50 };
    const iw = w - margin.left - margin.right, ih = h - margin.top - margin.bottom;

    const svg = d3.select(card).append("svg").attr("width", w).attr("height", h);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Collect data per specimen
    const seriesData = {};
    let maxPct = 0;
    names.forEach(name => {
      const tp = topoMap[name]?.temporal_patterns;
      if (!tp || !tp.msg_length_histogram) return;
      const hist = tp.msg_length_histogram;
      const total = d3.sum(hist, d => d.count) || 1;
      const bucketMap = {};
      hist.forEach(d => { bucketMap[d.bucket] = d.count / total; });
      seriesData[name] = allBuckets.map(b => bucketMap[b] || 0);
      maxPct = Math.max(maxPct, ...seriesData[name]);
    });

    const x = d3.scaleBand().domain(allBuckets).range([0, iw]).padding(0.15);
    const y = d3.scaleLinear().domain([0, maxPct]).range([ih, 0]).nice();

    g.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x)).selectAll("text").attr("fill", "#666").attr("font-size", "7px");
    g.selectAll(".domain, .tick line").attr("stroke", "#333");
    g.append("g").call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(".0%"))).selectAll("text,line,path").attr("stroke", "#333").attr("fill", "#666");

    const specimenList = names.filter(n => seriesData[n]);
    const barW = x.bandwidth() / specimenList.length;

    specimenList.forEach((name, si) => {
      seriesData[name].forEach((pct, bi) => {
        g.append("rect")
          .attr("x", x(allBuckets[bi]) + si * barW)
          .attr("y", y(pct))
          .attr("width", barW - 1)
          .attr("height", Math.max(0, ih - y(pct)))
          .attr("fill", color(name))
          .attr("opacity", 0.7)
          .attr("rx", 1);
      });
    });
  }

  // ─── Chart 10: Degree Distribution Overlay ─────────────────────
  function renderDegreeOverlay(names, topoMap) {
    const card = makeCard("Degree Distribution Overlay (log-log)", "All specimens on same axes. Different colors per specimen.");
    container.appendChild(card);
    card.appendChild(legend(names));

    const w = card.clientWidth - 32 || 400, h = 220;
    const margin = { top: 10, right: 20, bottom: 30, left: 50 };
    const iw = w - margin.left - margin.right, ih = h - margin.top - margin.bottom;

    const svg = d3.select(card).append("svg").attr("width", w).attr("height", h);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    let maxDeg = 1, maxCount = 1;
    const allPts = {};
    names.forEach(name => {
      const dd = topoMap[name]?.graph?.degree_distribution;
      if (!dd || !dd.length) return;
      allPts[name] = dd.filter(d => d.degree > 0 && d.count > 0);
      allPts[name].forEach(d => {
        maxDeg = Math.max(maxDeg, d.degree);
        maxCount = Math.max(maxCount, d.count);
      });
    });

    const x = d3.scaleLog().domain([1, maxDeg]).range([0, iw]).nice();
    const y = d3.scaleLog().domain([1, maxCount]).range([ih, 0]).nice();

    g.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).ticks(5, "~s")).selectAll("text,line,path").attr("stroke", "#333").attr("fill", "#666");
    g.append("g").call(d3.axisLeft(y).ticks(5, "~s")).selectAll("text,line,path").attr("stroke", "#333").attr("fill", "#666");

    names.forEach(name => {
      if (!allPts[name]) return;
      allPts[name].forEach(d => {
        g.append("circle")
          .attr("cx", x(d.degree)).attr("cy", y(d.count))
          .attr("r", 2.5)
          .attr("fill", color(name))
          .attr("opacity", 0.6);
      });
    });
  }

  return { init, loadAll };
})();
