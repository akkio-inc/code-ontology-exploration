/**
 * Info panel — contextual descriptions that update as you interact.
 * Each section, metric, and card has plain-language explanations.
 */

const InfoPanel = (() => {
  let titleEl, bodyEl;

  function init() {
    titleEl = document.getElementById("info-title");
    bodyEl = document.getElementById("info-body");
  }

  function show(key, context) {
    const entry = DESCRIPTIONS[key];
    if (!entry) return;
    titleEl.textContent = entry.title;
    let html = `<p>${entry.desc}</p>`;
    if (entry.math) html += `<div class="info-math">${entry.math}</div>`;
    if (entry.insight) html += `<p class="info-insight">${entry.insight}</p>`;
    if (context) html += `<p class="info-context">${context}</p>`;
    bodyEl.innerHTML = html;
  }

  // All the descriptions, keyed by section/metric/card
  const DESCRIPTIONS = {

    // --- Sections ---
    timeline: {
      title: "Timeline Chart",
      desc: "Shows how a codebase's activity changes week by week. Each point is one week of commits. Use the dropdown to switch between different ways of measuring activity.",
      insight: "Look for patterns: steady lines suggest disciplined development, spikes suggest big refactors or releases, and declining trends may signal a maturing or abandoned project."
    },
    topology: {
      title: "Structural Topology",
      desc: "A dashboard of metrics that describe the <em>shape</em> of this codebase — how clustered it is, how broad commits are, and how concentrated the work is. These are the metrics that should differ most between human and agent code.",
      insight: "Compare these numbers across specimens. Differences here are the structural fingerprint of how code was written."
    },
    graph: {
      title: "Co-Change Graph",
      desc: "A network where each dot is a file and lines connect files that change in the same commit. Thicker lines mean those files changed together more often. Colors group files by directory.",
      math: "If files A and B both appear in 5 commits, the edge weight between them is 5. The slider filters out weak connections.",
      insight: "Tight clusters reveal modules that are tightly coupled. Long bridges between clusters reveal files that connect otherwise-separate parts of the codebase."
    },

    // --- Timeline metrics ---
    metric_churn: {
      title: "Churn (Lines Changed)",
      desc: "Total lines added + deleted across all commits that week. This is the raw volume of change — how much code was touched.",
      math: "Churn = Σ (insertions + deletions) for all commits in the week.",
      insight: "High churn weeks often correspond to major refactors, new features, or migrations. Agent code might show more uniform churn (constant refactoring) while human code shows spikes around deadlines."
    },
    metric_num_commits: {
      title: "Commit Count",
      desc: "How many commits landed that week. More commits can mean more granular work, or more contributors active.",
      insight: "Agents tend to produce many small commits. Humans batch work into fewer, larger commits. Compare the commit count against churn to see average commit size."
    },
    metric_unique_files_touched: {
      title: "Files Touched",
      desc: "How many distinct files were modified that week across all commits. A high number means changes are spread across the codebase.",
      insight: "Agent code may touch more files per week because agents are less hesitant about cross-cutting changes."
    },
    metric_unique_authors: {
      title: "Unique Authors",
      desc: "How many different people (or bots) committed code that week. Measures the breadth of active contribution.",
      insight: "A project with many authors has distributed knowledge. A project with few authors is more centrally controlled. Agent-heavy projects may show fewer unique authors (just the agents + a few humans)."
    },
    metric_avg_files_per_commit: {
      title: "Avg Files per Commit",
      desc: "The average number of files changed in each commit that week. Measures how broad each individual change is.",
      math: "avg_files = (total files across all commits) / (number of commits)",
      insight: "This is a key hypothesis metric: agents supposedly make braver, wider-reaching changes (higher files/commit) while humans make more focused, surgical edits."
    },
    metric_file_concentration: {
      title: "File Concentration",
      desc: "How concentrated the week's changes are. A value near 0 means most commits touch unique files (spread out). A value near 1 means every commit touches the same files (concentrated).",
      math: "concentration = avg_files_per_commit / unique_files_touched. If 10 commits each touch 3 files, but there are 30 unique files, concentration = 3/30 = 0.1 (spread out).",
      insight: "Low concentration = diverse work across the codebase. High concentration = repeated edits to the same hotspot files."
    },

    // --- Topology cards ---
    card_modularity: {
      title: "Modularity Score",
      desc: "Measures how cleanly the codebase splits into separate groups of files that change together. Ranges from -0.5 to 1.0.",
      math: "Uses the Louvain/greedy modularity algorithm on the co-change graph. It finds natural communities and scores how much stronger within-group edges are vs. between-group edges. Higher = cleaner separation.",
      insight: "High modularity means the codebase has well-defined modules that don't bleed into each other. Agent code that refactors aggressively might produce cleaner module boundaries."
    },
    card_communities: {
      title: "Number of Communities",
      desc: "How many natural clusters the algorithm found in the co-change graph. Each community is a group of files that tend to change together.",
      insight: "More communities means more distinct functional areas. A small project might have 3-5, a large one could have 100+. Compare this relative to codebase size."
    },
    card_clustering: {
      title: "Clustering Coefficient",
      desc: "If file A co-changes with B and C, do B and C also co-change with each other? This measures how \"cliquish\" the neighborhoods are. Ranges 0 to 1.",
      math: "For each node, look at all its neighbors. What fraction of those neighbor-pairs are also connected? Average that across all nodes.",
      insight: "High clustering = tight-knit groups where files always change as a pack. Low clustering = more hub-and-spoke patterns where a central file connects otherwise unrelated files."
    },
    card_components: {
      title: "Connected Components",
      desc: "How many completely disconnected subgraphs exist. If components = 1, every file is reachable from every other file through co-change links.",
      insight: "Many components means the codebase has isolated pockets that never interact. This could be good (independent modules) or bad (forgotten code)."
    },
    card_avg_files_commit: {
      title: "Avg Files per Commit",
      desc: "Across the entire history, how many files does each commit typically touch? This is one of the strongest signals for human vs. agent code.",
      insight: "Hypothesis: agents touch more files per commit because they're willing to do broad refactors. Humans make more focused changes. Compare this across specimens."
    },
    card_avg_dirs_commit: {
      title: "Avg Directories per Commit",
      desc: "How many different top-level directories does each commit span? This measures how cross-cutting each change is.",
      insight: "A commit touching 3 directories is doing something that crosses module boundaries — a refactoring, a feature that spans layers, or a coordinated API change. Agents may do this more freely."
    },
    card_creation_ratio: {
      title: "Creation Ratio",
      desc: "What percentage of all files ever seen were newly created (vs. modifications to existing files)? Measures how much of the codebase is \"new\" vs. \"evolved.\"",
      math: "creation_ratio = (files first seen with only insertions, no deletions) / (total unique files ever). This is a heuristic — the first time we see a file with adds but no deletes, we count it as \"created.\"",
      insight: "Agent-heavy projects might have higher creation ratios because agents are more willing to create new files rather than patch existing ones. Conversely, mature human projects accumulate changes to existing files."
    },
    card_churn_gini: {
      title: "Churn Gini Coefficient",
      desc: "How unequally distributed is the total code churn across files? 0 = every file gets equal churn, 1 = all churn is in one file.",
      math: "The Gini coefficient measures inequality. Sort all files by their churn, then calculate how far the distribution is from perfectly equal. It's the same formula used to measure income inequality in economics.",
      insight: "Most codebases have high Gini (0.7-0.9) because a few \"hot\" files get most of the changes. The question is whether agent code distributes churn more evenly through refactoring."
    },
    card_change_entropy: {
      title: "Change Entropy",
      desc: "How predictable is it which files change together? Measured in bits. If file A changes, how surprised are you by which other files also change?",
      math: "For each file, count how often every other file co-changes with it. Compute Shannon entropy: H = -Σ p·log₂(p) where p is the fraction of co-changes with each neighbor. Higher entropy = more varied co-change partners.",
      insight: "Low entropy = rigid coupling (same files always change as a group). High entropy = flexible coupling (files have diverse co-change partners). Agent code might show higher entropy if it refactors coupling patterns."
    },
    card_author_entropy: {
      title: "Author Entropy",
      desc: "How evenly distributed are the contributors across files? Measured in bits. Low = strong file ownership (one person owns each file), High = shared ownership.",
      math: "For each file, count commits per author. Shannon entropy: H = -Σ p·log₂(p). A file with 1 author has 0 bits. A file with 4 equally-active authors has 2 bits.",
      insight: "Human teams often develop implicit file ownership. Agent-authored code should show more uniform distribution since the agent has no ownership preferences."
    },

    // --- Histograms ---
    hist_files_per_commit: {
      title: "Files per Commit Distribution",
      desc: "A histogram showing how many commits touched 1 file, 2 files, 3 files, etc. The shape of this distribution reveals the project's commit style.",
      insight: "A left-skewed distribution (most commits touch 1-2 files) suggests focused, surgical changes. A flatter distribution suggests broader, cross-cutting changes. Compare shapes across specimens."
    },
    hist_dirs_per_commit: {
      title: "Directories per Commit Distribution",
      desc: "How many different directories does each commit span? Most commits touch 1 directory, but the tail of this distribution shows cross-cutting changes.",
      insight: "A long right tail means many commits span multiple directories — a sign of brave refactoring or tightly-coupled architecture."
    },
    hist_degree: {
      title: "Degree Distribution (Log-Log)",
      desc: "Each file has a \"degree\" — how many other files it co-changes with. This plot shows how many files have each degree, on logarithmic axes.",
      math: "A straight line on log-log axes means the distribution follows a power law: a few hub files with very high degree, and many leaf files with low degree. This is typical of most real networks.",
      insight: "A power-law tail means the codebase has \"hub\" files that everything depends on. A steeper slope means more extreme concentration around hubs."
    },

    // --- Burstiness cards ---
    card_burstiness: {
      title: "Burstiness Parameter",
      desc: "Measures how bursty (clustered in time) the commit activity is. Ranges from -1 (perfectly periodic, like a metronome) to +1 (maximally bursty, like earthquake aftershocks). B=0 means random (Poisson process).",
      math: "B = (σ - μ) / (σ + μ) where σ is the standard deviation and μ is the mean of inter-event times (hours between consecutive commits).",
      insight: "Human projects often show high burstiness (work in sprints/bursts). Agent-authored code might be more uniform (lower burstiness) since agents don't have lunch breaks, weekends, or focus shifts."
    },
    card_file_burstiness: {
      title: "File Burstiness (Average)",
      desc: "Same burstiness formula but applied per-file: how bursty is the edit pattern for individual files? Averaged across the top 50 most-touched files.",
      insight: "High file burstiness means files get edited in bursts then go quiet. Low means steady, distributed edits. Agent code might show lower per-file burstiness if it touches files more uniformly over time."
    },

    // --- New charts ---
    hist_iet: {
      title: "Inter-Event Time Distribution",
      desc: "A histogram of time gaps between consecutive commits, bucketed into human-readable intervals. Shows the temporal rhythm of development.",
      insight: "Human projects typically show clear daily/weekly patterns (gaps at nights/weekends). Agent-authored projects might have more uniform distributions or very short inter-event times."
    },
    chord_dirs: {
      title: "Directory Coupling (Chord Diagram)",
      desc: "Shows which top-level directories change together in the same commits. Thicker ribbons mean more cross-directory coupling. The arc size shows each directory's total commit activity.",
      insight: "Strong coupling between directories means changes in one area often require changes in another. Well-modularized code has thin ribbons (each directory changes independently)."
    },

    // --- Color modes ---
    color_community: {
      title: "Community Coloring (Louvain)",
      desc: "Nodes are colored by their detected community, not their file directory. The Louvain algorithm finds groups of files that change together more often than you'd expect by chance.",
      insight: "If community colors align with directory colors, the codebase is well-organized. If they don't, there's a mismatch between the file system structure and the actual change patterns."
    },
    color_directory: {
      title: "Directory Coloring",
      desc: "Nodes are colored by their top-level directory. This shows the file system organization of the codebase.",
      insight: "Compare with community coloring to see if the directory structure matches the actual coupling patterns."
    },

    // --- Lab ---
    lab: {
      title: "Comparative Lab",
      desc: "A wall of charts comparing all three specimens side by side. Each chart tests a different dimension of the human\u2192agent hypothesis. Look for consistent patterns across multiple chart types.",
      insight: "If the specimens truly have different structural signatures, the differences should be visible across many independent metrics, not just one or two."
    },

    // --- Commit message fingerprint ---
    card_multiline_ratio: {
      title: "Multiline Commit Ratio",
      desc: "Percentage of commits with a body (more than one line). <em>AI coding agents often produce single-line commits, while human developers write longer commit messages with explanatory bodies.</em>",
      math: "Multiline ratio = (commits with >1 line) / total commits",
      insight: "The MSR 2026 Fingerprinting paper found multiline commit ratio was the #1 discriminating feature (67.5% importance) for identifying OpenAI Codex."
    },
    card_conventional: {
      title: "Conventional Commits",
      desc: "Percentage following Conventional Commits spec (feat:, fix:, chore:, etc.). Indicates whether the project enforces commit message standards.",
      insight: "AI agents and well-configured CI often produce conventional commits. A high ratio suggests either strong contributor guidelines or automated commit generation."
    },
    card_coauthor: {
      title: "Co-Author Tags",
      desc: "Commits containing 'Co-Authored-By:' headers. These reveal AI agent involvement even when the primary author email is human.",
      insight: "Claude Code, Copilot, and Aider all add Co-Authored-By tags. This is the most reliable commit-message signal for AI-assisted code."
    },

    // --- Authors ---
    authors: {
      title: "Author Classification",
      desc: "Each commit is classified as <em>human</em>, <em>AI agent</em> (Claude, Copilot, Devin, Jules), or <em>automation bot</em> (dependabot, renovate, pre-commit-ci) using three detection layers: author email patterns, commit message footers (Co-Authored-By, Agent-Logs-Url, Generated by), and heuristic [bot] detection.",
      math: "Detection priority: 1) Known AI email patterns, 2) Known bot email patterns, 3) Commit message AI footers, 4) [bot] heuristic, 5) Default human.",
      insight: "Commit message detection catches agents that use human developer emails. In our data, this increased AI detection by 10-60x in repos like claude-code-action and clawteam-openclaw."
    },

    // --- Comparison ---
    compare: {
      title: "Specimen Comparison",
      desc: "Side-by-side comparison of all specimens with processed data. The table shows raw metrics, and the radar chart normalizes them to a 0-1 scale for visual comparison.",
      insight: "This is the core output: if human and agent code have detectably different structural signatures, they'll show different shapes on the radar chart."
    },

    // --- Tables ---
    table_hotspots: {
      title: "Churn Hotspots",
      desc: "The files that received the most total churn (insertions + deletions) across the entire history. These are the most actively modified parts of the codebase.",
      insight: "Hotspots often include config files (package.json, lock files), core modules, or files undergoing active development. If a single file has >20% of all churn, that's a strong code smell."
    },
    table_bridges: {
      title: "Bridge Files (Betweenness Centrality)",
      desc: "Files that sit between communities in the co-change graph. If you removed these files, the graph would break into more disconnected pieces.",
      math: "Betweenness centrality counts how many shortest paths between all pairs of nodes pass through this file. Higher = more \"bridge-like\" — this file connects otherwise-separate parts of the codebase.",
      insight: "Bridge files are architectural chokepoints. Changes to them ripple across multiple modules. In human codebases, these are often config or routing files. In agent code, they might be more evenly distributed."
    },
  };

  return { init, show, DESCRIPTIONS };
})();
