/**
 * Main application — loads specimens, wires up controls, fetches data.
 */

(async function main() {
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
  Graph.init(document.getElementById("graph-chart"));

  // Wire up controls
  document.getElementById("timeline-metric").addEventListener("change", e => {
    Timeline.updateMetric(e.target.value);
  });

  const edgeSlider = document.getElementById("edge-weight");
  const edgeVal = document.getElementById("edge-weight-val");
  edgeSlider.addEventListener("input", e => {
    edgeVal.textContent = e.target.value;
    Graph.updateThreshold(parseInt(e.target.value));
  });

  // Handle window resize
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      Timeline.init(document.getElementById("timeline-chart"));
      Graph.init(document.getElementById("graph-chart"));
      // Re-render current data
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
    Graph.init(graphEl);

    try {
      const [timelineData, graphData, topoData] = await Promise.all([
        fetch(`/api/timeline/${name}`).then(r => r.ok ? r.json() : null),
        fetch(`/api/cochange/${name}`).then(r => r.ok ? r.json() : null),
        fetch(`/api/topology/${name}`).then(r => r.ok ? r.json() : null),
      ]);

      const metric = document.getElementById("timeline-metric").value;
      Timeline.render(timelineData, metric);

      Topology.render(topoData);

      const threshold = parseInt(document.getElementById("edge-weight").value);
      Graph.render(graphData, threshold);
    } catch (err) {
      console.error("Failed to load specimen:", err);
    }
  }
})();
