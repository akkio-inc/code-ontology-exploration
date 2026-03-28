# Code Ontology Explorer

<!-- PEEK: Type=research-project | Stack=Python+FastAPI+D3.js | Domain=software-engineering-metrics | Keywords: git history, co-change graph, structural metrics, human vs agent code, burstiness, modularity, Louvain, NetworkX, D3 force-directed | Preview: Analyzes git history of 3 codebases (human/hybrid/agent-native) to find structural signatures that distinguish human-written from AI-agent-written code -->

Visualizing structural differences between human-authored and agent-authored codebases through git history analysis.

## Hypothesis

Agent-written code shows more decentralized, brave-refactoring patterns (broader commits, cleaner modules, lower burstiness) while human code shows branch-like, incremental patterns (focused commits, hub-and-spoke coupling, bursty activity).

**Testable predictions:**

| Signal | Human code | Agent code |
|--------|-----------|------------|
| Files per commit | Low (focused edits) | High (broad refactors) |
| Modularity | Lower (organic coupling) | Higher (clean boundaries) |
| Burstiness | High (work in sprints) | Low (uniform activity) |
| Churn Gini | High (hotspot concentration) | Lower (distributed edits) |
| Degree distribution | Power-law (hub files) | More uniform |

## Specimens

Three codebases on the human → agent spectrum:

| Name | Repo | Role | Description |
|------|------|------|-------------|
| `linux-fs` | `torvalds/linux` (fs/, 2018-01 to 2019-01) | Pure human | Linux kernel filesystem subsystem — mature, high-discipline human development |
| `openhands` | `All-Hands-AI/OpenHands` | Hybrid | AI coding agent platform — mix of human and agent-authored commits |
| `openclaw` | `openclaw/openclaw` | Agent-native | Agent-authored codebase — primarily written by AI agents |

## Architecture

```
src/code_ontology/          # Python analysis pipeline
├── config.py               # Specimen definitions (name, url, subpath, time window)
├── repo_loader.py          # Git clone (treeless for large repos)
├── git_history.py          # Extract CommitRecord[] from git log → JSON
├── cochange_graph.py       # Build co-change network (NetworkX) + Louvain communities
├── metrics.py              # Weekly TimeSlice aggregation
├── topology.py             # All structural metrics (7 families)
└── server.py               # FastAPI serving pre-computed JSON + static web

scripts/
├── run_pipeline.py         # Full pipeline: clone → extract → metrics → graph → topology
└── serve.py                # Start uvicorn on port 8765

web/                        # D3.js visualization (no build step)
├── index.html              # App shell: specimen selector, chart containers, info sidebar
└── static/
    ├── css/style.css       # Dark theme (#0a0a0f background, #6366f1 accent)
    └── js/
        ├── app.js          # Main: data loading, control wiring, IntersectionObserver
        ├── timeline.js     # Area chart with metric switching + tooltips
        ├── graph.js        # Force-directed graph (directory/community coloring, zoom, drag)
        ├── topology.js     # Dashboard: summary cards, histograms, chord diagram, IET chart
        ├── compare.js      # Side-by-side comparison table + radar chart
        └── infopanel.js    # Contextual right sidebar (descriptions update on scroll/click)

data/                       # All gitignored — regenerate with run_pipeline.py
├── raw/                    # {specimen}_commits.json
└── processed/              # {specimen}_timeline.json, _cochange.json, _topology.json
```

## Setup

```bash
cd code-ontology-exploration
mise exec -- uv sync          # Install dependencies
```

## Usage

```bash
# Process a specimen (clone → extract → analyze)
mise exec -- python scripts/run_pipeline.py openhands

# Process all specimens
mise exec -- python scripts/run_pipeline.py

# Start the web visualization
mise exec -- python scripts/serve.py    # → http://localhost:8765
```

## Metrics

### Timeline (per-week)
Churn, commit count, files touched, unique authors, avg files/commit, file concentration.

### Structural Topology (7 metric families)
1. **Graph topology:** Modularity (Louvain), communities, clustering coefficient, components, degree distribution, betweenness centrality
2. **Commit shape:** Files-per-commit distribution, dirs-per-commit, creation ratio
3. **Churn hotspots:** Gini coefficient, top hotspot files, author entropy per file
4. **Change entropy:** Shannon entropy of co-change patterns
5. **Burstiness:** Inter-event time distribution, global + per-file burstiness parameter B = (σ−μ)/(σ+μ)
6. **Directory coupling:** Chord diagram of cross-directory co-changes
7. **Comparison:** Side-by-side table + radar chart (normalized 0–1) across all specimens

### Co-Change Graph
Force-directed visualization with directory or Louvain community coloring, degree-based sizing, weight filtering.

## Stack

- **Analysis:** Python 3.11+, GitPython, NetworkX
- **Server:** FastAPI, uvicorn, orjson
- **Visualization:** D3.js v7 (vanilla JS, no build step, CDN)

## Research Context

This project draws on network science applied to software repositories:

- **Co-change analysis** — files that change together in commits reveal coupling that isn't visible in import graphs
- **Louvain community detection** — finds natural clusters in the co-change network that may or may not align with directory structure
- **Burstiness parameter** (Goh & Barabási, 2008) — distinguishes bursty human activity patterns from uniform machine patterns
- **Gini coefficient** — measures inequality of churn distribution across files (borrowed from economics)
- **Shannon entropy** — quantifies predictability of co-change patterns (from information theory)
