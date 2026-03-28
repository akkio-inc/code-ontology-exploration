/**
 * Comparison dashboard — side-by-side specimen metrics.
 * Fetches topology data for all specimens with data and renders a comparison table.
 */

const Compare = (() => {
  let container;

  function init(el) {
    container = el;
  }

  async function loadAll() {
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading comparison data...</div>';

    const specimens = await fetch("/api/specimens").then(r => r.json());
    const withTopo = specimens.filter(s => s.has_topology);

    if (withTopo.length < 2) {
      container.innerHTML = '<p style="color:#555">Need at least 2 specimens with data to compare.</p>';
      return;
    }

    const allTopo = await Promise.all(
      withTopo.map(s =>
        fetch(`/api/topology/${s.name}`).then(r => r.json()).then(d => ({ name: s.name, data: d }))
      )
    );

    container.innerHTML = "";
    container.appendChild(renderComparisonTable(allTopo));
    container.appendChild(renderRadarChart(allTopo));
  }

  function renderComparisonTable(allTopo) {
    const div = document.createElement("div");
    div.className = "topo-table compare-table";

    const h4 = document.createElement("h4");
    h4.textContent = "Metric Comparison";
    div.appendChild(h4);

    const metrics = [
      { label: "Modularity", get: d => d.graph.modularity.toFixed(3) },
      { label: "Communities", get: d => d.graph.num_communities },
      { label: "Clustering Coeff", get: d => d.graph.avg_clustering.toFixed(3) },
      { label: "Components", get: d => d.graph.num_components },
      { label: "Avg Files/Commit", get: d => d.commit_shape.avg_files_per_commit },
      { label: "Avg Dirs/Commit", get: d => d.commit_shape.avg_dirs_per_commit },
      { label: "Creation Ratio", get: d => (d.commit_shape.creation_ratio * 100).toFixed(1) + "%" },
      { label: "Churn Gini", get: d => d.churn_hotspots.churn_gini.toFixed(3) },
      { label: "Change Entropy", get: d => d.change_entropy.avg_change_entropy.toFixed(2) },
      { label: "Author Entropy", get: d => d.churn_hotspots.avg_author_entropy.toFixed(2) },
      { label: "Burstiness", get: d => d.burstiness?.global_burstiness?.toFixed(3) ?? "N/A" },
      { label: "File Burstiness", get: d => d.burstiness?.avg_file_burstiness?.toFixed(3) ?? "N/A" },
    ];

    const table = document.createElement("table");
    // Header
    const thead = document.createElement("thead");
    const hrow = document.createElement("tr");
    hrow.innerHTML = "<th>Metric</th>" + allTopo.map(s =>
      `<th>${s.name}</th>`
    ).join("");
    thead.appendChild(hrow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement("tbody");
    metrics.forEach(m => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td style="color:#888">${m.label}</td>` +
        allTopo.map(s => {
          const val = m.get(s.data);
          return `<td>${val}</td>`;
        }).join("");
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    div.appendChild(table);
    return div;
  }

  function renderRadarChart(allTopo) {
    const div = document.createElement("div");
    div.className = "topo-chart";
    div.style.minHeight = "350px";

    const header = document.createElement("h4");
    header.textContent = "Structural Fingerprint (Radar)";
    div.appendChild(header);

    const size = 340;
    const cx = size / 2, cy = size / 2;
    const maxR = size / 2 - 50;

    // Axes: normalized metrics (0-1 scale)
    const axes = [
      { label: "Modularity", get: d => d.graph.modularity, min: 0, max: 1 },
      { label: "Clustering", get: d => d.graph.avg_clustering, min: 0, max: 1 },
      { label: "Files/Commit", get: d => Math.min(d.commit_shape.avg_files_per_commit / 20, 1), min: 0, max: 1 },
      { label: "Dirs/Commit", get: d => Math.min(d.commit_shape.avg_dirs_per_commit / 10, 1), min: 0, max: 1 },
      { label: "Creation Ratio", get: d => d.commit_shape.creation_ratio, min: 0, max: 1 },
      { label: "Churn Gini", get: d => d.churn_hotspots.churn_gini, min: 0, max: 1 },
      { label: "Change Entropy", get: d => Math.min(d.change_entropy.avg_change_entropy / 8, 1), min: 0, max: 1 },
      { label: "Burstiness", get: d => ((d.burstiness?.global_burstiness ?? 0) + 1) / 2, min: 0, max: 1 },
    ];

    const n = axes.length;
    const angleSlice = (2 * Math.PI) / n;

    const svg = d3.select(div).append("svg")
      .attr("width", size).attr("height", size);

    // Grid circles
    [0.25, 0.5, 0.75, 1].forEach(level => {
      svg.append("circle")
        .attr("cx", cx).attr("cy", cy)
        .attr("r", maxR * level)
        .attr("fill", "none")
        .attr("stroke", "#1a1a2e")
        .attr("stroke-width", 0.5);
    });

    // Axis lines + labels
    axes.forEach((a, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x2 = cx + maxR * Math.cos(angle);
      const y2 = cy + maxR * Math.sin(angle);
      svg.append("line")
        .attr("x1", cx).attr("y1", cy)
        .attr("x2", x2).attr("y2", y2)
        .attr("stroke", "#1a1a2e");

      const lx = cx + (maxR + 15) * Math.cos(angle);
      const ly = cy + (maxR + 15) * Math.sin(angle);
      svg.append("text")
        .attr("x", lx).attr("y", ly)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", "#666")
        .attr("font-size", "7px")
        .text(a.label);
    });

    // Specimen polygons
    const colors = d3.schemeTableau10;
    allTopo.forEach((spec, si) => {
      const points = axes.map((a, i) => {
        const val = a.get(spec.data);
        const r = maxR * Math.max(0, Math.min(1, val));
        const angle = angleSlice * i - Math.PI / 2;
        return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
      });

      svg.append("polygon")
        .attr("points", points.map(p => p.join(",")).join(" "))
        .attr("fill", colors[si % colors.length])
        .attr("fill-opacity", 0.15)
        .attr("stroke", colors[si % colors.length])
        .attr("stroke-width", 1.5);

      // Dots at vertices
      points.forEach(([px, py]) => {
        svg.append("circle")
          .attr("cx", px).attr("cy", py).attr("r", 2.5)
          .attr("fill", colors[si % colors.length]);
      });
    });

    // Legend
    const legend = svg.append("g").attr("transform", `translate(10, ${size - 20 * allTopo.length})`);
    allTopo.forEach((spec, i) => {
      const g = legend.append("g").attr("transform", `translate(0, ${i * 16})`);
      g.append("rect").attr("width", 10).attr("height", 10)
        .attr("fill", colors[i % colors.length]).attr("rx", 2);
      g.append("text").attr("x", 14).attr("y", 8)
        .attr("fill", "#aaa").attr("font-size", "9px")
        .text(spec.name);
    });

    return div;
  }

  return { init, loadAll };
})();
