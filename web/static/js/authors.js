/**
 * Authors dashboard — visualizes human/bot/agent classification for a specimen.
 * Shows a donut chart of commit proportions + per-category metric cards + top authors table.
 */

const Authors = (() => {
  let container;

  function init(el) {
    container = el;
  }

  function render(data) {
    if (!container || !data) {
      if (container) container.innerHTML = '<div class="loading">No author data available</div>';
      return;
    }
    container.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "authors-grid";

    // Row 1: donut chart + category cards
    const topRow = document.createElement("div");
    topRow.className = "authors-top-row";
    topRow.appendChild(renderDonut(data));
    topRow.appendChild(renderCategoryCards(data));
    wrap.appendChild(topRow);

    // Row 2: top agent/bot authors tables (only if they exist)
    if (data.top_agent_authors.length > 0 || data.top_bot_authors.length > 0) {
      const tableRow = document.createElement("div");
      tableRow.className = "topo-detail-row";
      if (data.top_agent_authors.length > 0) {
        tableRow.appendChild(renderAuthorTable("Top AI Agent Authors", data.top_agent_authors, "#a78bfa"));
      }
      if (data.top_bot_authors.length > 0) {
        tableRow.appendChild(renderAuthorTable("Top Automation Bot Authors", data.top_bot_authors, "#fb923c"));
      }
      wrap.appendChild(tableRow);
    }

    container.appendChild(wrap);
  }

  function renderDonut(data) {
    const div = document.createElement("div");
    div.className = "topo-chart authors-donut";

    const header = document.createElement("h4");
    header.textContent = "Commit Authorship Breakdown";
    div.appendChild(header);

    const cats = data.categories;
    const slices = [
      { label: "Human", value: cats.human.num_commits, color: "#22d3ee" },
      { label: "AI Agent", value: cats.ai_agent.num_commits, color: "#a78bfa" },
      { label: "Automation Bot", value: cats.automation_bot.num_commits, color: "#fb923c" },
    ].filter(s => s.value > 0);

    const size = 200;
    const radius = size / 2;
    const innerRadius = radius * 0.55;

    const svg = d3.select(div).append("svg")
      .attr("width", size)
      .attr("height", size)
      .append("g")
      .attr("transform", `translate(${radius},${radius})`);

    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius - 4);

    svg.selectAll("path")
      .data(pie(slices))
      .join("path")
      .attr("d", arc)
      .attr("fill", d => d.data.color)
      .attr("stroke", "#0a0a0f")
      .attr("stroke-width", 2);

    // Center label
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.2em")
      .attr("fill", "#fff")
      .attr("font-size", "1.2rem")
      .attr("font-weight", "600")
      .text(data.total_commits.toLocaleString());

    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.1em")
      .attr("fill", "#666")
      .attr("font-size", "0.65rem")
      .text("commits");

    // Legend
    const legend = document.createElement("div");
    legend.className = "authors-legend";
    slices.forEach(s => {
      const pct = data.total_commits > 0
        ? ((s.value / data.total_commits) * 100).toFixed(1)
        : "0";
      const item = document.createElement("div");
      item.className = "lab-legend-item";
      item.innerHTML = `
        <span class="lab-legend-dot" style="background:${s.color}"></span>
        ${s.label}: ${s.value.toLocaleString()} (${pct}%)
      `;
      legend.appendChild(item);
    });
    div.appendChild(legend);

    return div;
  }

  function renderCategoryCards(data) {
    const div = document.createElement("div");
    div.className = "authors-cards-wrap";

    const categories = [
      { key: "human", label: "Human", color: "#22d3ee" },
      { key: "ai_agent", label: "AI Agent", color: "#a78bfa" },
      { key: "automation_bot", label: "Automation Bot", color: "#fb923c" },
    ];

    categories.forEach(cat => {
      const info = data.categories[cat.key];
      const card = document.createElement("div");
      card.className = "authors-cat-card";
      card.style.borderTopColor = cat.color;

      const metrics = [
        { label: "Commits", value: info.num_commits.toLocaleString() },
        { label: "Authors", value: info.num_authors },
        { label: "Total Churn", value: info.total_churn.toLocaleString() },
        { label: "Avg Files/Commit", value: info.avg_files_per_commit },
        { label: "Avg Churn/Commit", value: info.avg_churn_per_commit.toLocaleString() },
        { label: "Unique Files", value: info.unique_files.toLocaleString() },
      ];

      card.innerHTML = `
        <div class="authors-cat-header" style="color:${cat.color}">${cat.label}</div>
        <div class="authors-cat-pct">${info.pct_commits}%</div>
        ${metrics.map(m => `
          <div class="authors-cat-row">
            <span class="authors-cat-metric-label">${m.label}</span>
            <span class="authors-cat-metric-value">${m.value}</span>
          </div>
        `).join("")}
      `;
      div.appendChild(card);
    });

    return div;
  }

  function renderAuthorTable(title, authors, color) {
    const div = document.createElement("div");
    div.className = "topo-table";

    div.innerHTML = `
      <h4 style="color:${color}">${title}</h4>
      <table>
        <thead><tr><th>Author</th><th>Commits</th></tr></thead>
        <tbody>
          ${authors.map(a => `
            <tr>
              <td>${escapeHtml(a.author)}</td>
              <td>${a.commits}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    return div;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  return { init, render };
})();
