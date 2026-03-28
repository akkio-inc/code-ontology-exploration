# Code Ontology Explorer

Visualizing structural differences between human-authored and agent-authored codebases through git history analysis.

## Hypothesis

Agent-written code shows more decentralized, brave-refactoring patterns (broader commits, cleaner modules, lower burstiness) while human code shows branch-like, incremental patterns (focused commits, hub-and-spoke coupling, bursty activity).

## Specimens

| Name | Repo | Role | Description |
|------|------|------|-------------|
| `linux-fs` | `torvalds/linux` (fs/, 2018-01 to 2019-01) | Pure human | Linux kernel filesystem subsystem — mature, high-discipline human development |
| `openhands` | `All-Hands-AI/OpenHands` | Hybrid | AI coding agent platform — mix of human and agent-authored commits |
| `openclaw` | `openclaw/openclaw` | Agent-native | Agent-authored codebase — primarily written by AI agents |

## Architecture

```
src/code_ontology/
├── config.py          # Specimen definitions, paths
├── repo_loader.py     # Git clone (treeless for linux)
├── git_history.py     # Extract commits from git log
├── cochange_graph.py  # Build co-change network (NetworkX)
├── metrics.py         # Weekly timeline metrics
├── topology.py        # Structural topology: graph, commit shape, entropy, burstiness
└── server.py          # FastAPI serving JSON + static web

scripts/
├── run_pipeline.py    # Full pipeline: clone → extract → metrics → graph → topology
└── serve.py           # Start uvicorn (port 8765)

web/
├── index.html
└── static/
    ├── css/style.css
    └── js/
        ├── app.js       # Main: specimen selector, data loading, controls
        ├── timeline.js  # D3 area chart (weekly metrics)
        ├── graph.js     # D3 force-directed co-change graph
        ├── topology.js  # Topology dashboard: cards, histograms, chord diagram
        ├── compare.js   # Side-by-side specimen comparison + radar chart
        └── infopanel.js # Contextual info sidebar

data/
├── raw/               # {specimen}_commits.json (gitignored)
└── processed/         # {specimen}_timeline.json, _cochange.json, _topology.json (gitignored)
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

### Structural Topology
- **Graph:** Modularity (Louvain), communities, clustering coefficient, components, degree distribution, betweenness centrality
- **Commit shape:** Files-per-commit distribution, dirs-per-commit, creation ratio
- **Churn:** Gini coefficient, hotspot files, author entropy per file
- **Entropy:** Shannon entropy of co-change patterns
- **Burstiness:** Inter-event time distribution, global + per-file burstiness parameter
- **Directory coupling:** Chord diagram of cross-directory co-changes

### Co-Change Graph
Force-directed visualization with directory or Louvain community coloring, degree-based sizing, weight filtering.

### Comparison
Side-by-side table + radar chart (normalized 0–1) across all specimens.

## Stack

- **Analysis:** Python 3.11+, GitPython, NetworkX
- **Server:** FastAPI, uvicorn, orjson
- **Visualization:** D3.js v7 (vanilla JS, no build step)
