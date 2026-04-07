/**
 * Main application — loads specimens, wires up controls, fetches data.
 */

(async function main() {
  // Initialize info panel
  InfoPanel.init();

  // Fetch available specimens
  const specimens = await fetch("/api/specimens").then(r => r.json());

  // Render specimen selector buttons
  const selector = document.getElementById("specimen-selector");
  specimens.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "specimen-btn";
    btn.textContent = s.name;
    btn.dataset.name = s.name;
    if (!s.has_timeline && !s.has_cochange) {
      btn.classList.add("disabled");
      btn.title = "No data yet — run the pipeline first";
    }
    btn.addEventListener("click", () => {
      if (btn.classList.contains("disabled")) return;
      document.querySelectorAll(".specimen-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadSpecimen(s.name);
    });
    selector.appendChild(btn);
  });

  // Auto-select first specimen with data
  const first = specimens.find(s => s.has_timeline || s.has_cochange);
  if (first) {
    document.querySelector(`[data-name="${first.name}"]`).click();
  }

  // Initialize charts
  Timeline.init(document.getElementById("timeline-chart"));
  Topology.init(document.getElementById("topology-dashboard"));
  Authors.init(document.getElementById("authors-dashboard"));
  Graph.init(document.getElementById("graph-chart"));
  Compare.init(document.getElementById("compare-dashboard"));
  Compare.loadAll();

  Lab.init(document.getElementById("lab-dashboard"));
  Lab.loadAll();

  // Wire up controls — timeline metric dropdown
  document.getElementById("timeline-metric").addEventListener("change", e => {
    Timeline.updateMetric(e.target.value);
    InfoPanel.show("metric_" + e.target.value);
  });

  // Wire up controls — edge weight slider
  const edgeSlider = document.getElementById("edge-weight");
  const edgeVal = document.getElementById("edge-weight-val");
  edgeSlider.addEventListener("input", e => {
    edgeVal.textContent = e.target.value;
    Graph.updateThreshold(parseInt(e.target.value));
  });

  // Wire up controls — graph color mode
  document.getElementById("graph-color-mode").addEventListener("change", e => {
    Graph.setColorMode(e.target.value);
    InfoPanel.show(e.target.value === "community" ? "color_community" : "color_directory");
  });

  // --- Info panel: section hover/scroll detection ---
  // Pick the section closest to the top of the viewport
  const sections = document.querySelectorAll("section[data-info]");
  const observer = new IntersectionObserver(() => {
    let best = null;
    let bestDist = Infinity;
    sections.forEach(s => {
      const rect = s.getBoundingClientRect();
      // Section must be at least partially visible
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        const dist = Math.abs(rect.top);
        if (dist < bestDist) {
          bestDist = dist;
          best = s;
        }
      }
    });
    if (best) {
      InfoPanel.show(best.dataset.info);
      sections.forEach(s => s.classList.remove("info-active"));
      best.classList.add("info-active");
    }
  }, { threshold: [0, 0.1, 0.3, 0.5, 0.7, 1.0] });
  sections.forEach(s => observer.observe(s));

  // --- Info panel: topology card clicks ---
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".topo-card");
    if (card) {
      const label = card.querySelector(".topo-card-label")?.textContent.trim().toLowerCase();
      const keyMap = {
        "modularity": "card_modularity",
        "communities": "card_communities",
        "clustering coeff": "card_clustering",
        "components": "card_components",
        "avg files/commit": "card_avg_files_commit",
        "avg dirs/commit": "card_avg_dirs_commit",
        "creation ratio": "card_creation_ratio",
        "churn gini": "card_churn_gini",
        "change entropy": "card_change_entropy",
        "author entropy": "card_author_entropy",
        "burstiness": "card_burstiness",
        "file burstiness": "card_file_burstiness",
      };
      const infoKey = keyMap[label];
      if (infoKey) {
        InfoPanel.show(infoKey);
        // Visual feedback
        document.querySelectorAll(".topo-card").forEach(c => c.classList.remove("info-selected"));
        card.classList.add("info-selected");
      }
    }

    // Topology chart clicks
    const chart = e.target.closest(".topo-chart");
    if (chart) {
      const title = chart.querySelector("h4")?.textContent.trim();
      const chartMap = {
        "Files per Commit": "hist_files_per_commit",
        "Directories per Commit": "hist_dirs_per_commit",
        "Degree Distribution (log-log)": "hist_degree",
        "Inter-Event Time Distribution": "hist_iet",
        "Directory Coupling (Chord)": "chord_dirs",
        "Structural Fingerprint (Radar)": "compare",
      };
      const infoKey = chartMap[title];
      if (infoKey) InfoPanel.show(infoKey);
    }

    // Topology table clicks
    const table = e.target.closest(".topo-table");
    if (table) {
      const title = table.querySelector("h4")?.textContent.trim();
      if (title?.includes("Hotspot")) InfoPanel.show("table_hotspots");
      if (title?.includes("Bridge")) InfoPanel.show("table_bridges");
    }
  });

  // Handle window resize
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      Timeline.init(document.getElementById("timeline-chart"));
      Graph.init(document.getElementById("graph-chart"));
      const activeBtn = document.querySelector(".specimen-btn.active");
      if (activeBtn) loadSpecimen(activeBtn.dataset.name);
    }, 250);
  });

  async function loadSpecimen(name) {
    const timelineEl = document.getElementById("timeline-chart");
    const graphEl = document.getElementById("graph-chart");

    // Show loading state
    timelineEl.innerHTML = '<div class="loading">Loading timeline...</div>';
    graphEl.innerHTML = '<div class="loading">Loading graph...</div>';

    // Re-init after clearing
    Timeline.init(timelineEl);
    Topology.init(document.getElementById("topology-dashboard"));
    Authors.init(document.getElementById("authors-dashboard"));
    Graph.init(graphEl);

    try {
      const [timelineData, graphData, topoData, authorsData] = await Promise.all([
        fetch(`/api/timeline/${name}`).then(r => r.ok ? r.json() : null),
        fetch(`/api/cochange/${name}`).then(r => r.ok ? r.json() : null),
        fetch(`/api/topology/${name}`).then(r => r.ok ? r.json() : null),
        fetch(`/api/authors/${name}`).then(r => r.ok ? r.json() : null),
      ]);

      const metric = document.getElementById("timeline-metric").value;
      Timeline.render(timelineData, metric);
      InfoPanel.show("metric_" + metric);

      Topology.render(topoData);
      Authors.render(authorsData);

      const threshold = parseInt(document.getElementById("edge-weight").value);
      Graph.render(graphData, threshold);
    } catch (err) {
      console.error("Failed to load specimen:", err);
    }
  }
})();
