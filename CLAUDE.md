# Code Ontology Explorer — Claude Instructions

<!-- PEEK: Type=project-root | Stack=Python+FastAPI+D3.js | Topics: git history analysis, co-change graphs, structural metrics, human vs agent code | Preview: Research project comparing structural signatures of human-written vs AI-agent-written codebases through git history topology -->

## Overview

Personal research project exploring whether human-written and AI-agent-written code have detectably different structural signatures when analyzed through git history. This is **not** an Akkio product — it's a standalone repo under `akkio-inc`.

**Core hypothesis:** Agent-written code shows broader commits, cleaner module separation, lower temporal burstiness, and more uniform churn distribution than human-written code.

## Environment

- Python 3.11+ via mise
- All commands must be prefixed with `mise exec --`
- Server runs on port 8765 with hot reload
- Data files are gitignored (regenerate with `run_pipeline.py`)
- This repo lives inside port-louis but has its own `.git` — do NOT mix with port-louis git operations

## Key Commands

```bash
# Process a specimen (clone → extract → metrics → graph → topology)
mise exec -- python scripts/run_pipeline.py <specimen-name>

# Start visualization server (hot reloads on Python changes)
mise exec -- python scripts/serve.py

# Process all specimens
mise exec -- python scripts/run_pipeline.py
```

## Specimens

Three codebases on the human → agent spectrum:

| Name | Source | Role | Notes |
|------|--------|------|-------|
| `linux-fs` | torvalds/linux fs/ (2018-01 to 2019-01) | Pure human | Treeless clone; pipeline takes 10-30 min |
| `openhands` | All-Hands-AI/OpenHands | Hybrid (human + agent) | 6,359 commits, 107 weekly slices |
| `openclaw` | openclaw/openclaw | Agent-native | 22,179 commits, 18 weekly slices |

Specimen config: `src/code_ontology/config.py` — `Specimen` dataclass with `name`, `url`, `subpath`, `since`, `until`.

---

## Architecture

**Pipeline flow:** `clone repo → extract git history → compute timeline metrics → build co-change graph → compute topology → save JSON`

**Web flow:** FastAPI serves pre-computed JSON + static D3.js visualization.

### Backend Modules (src/code_ontology/)

<!-- LLM NOTE: When adding a new metric, you'll touch topology.py (computation), server.py (endpoint if needed), and the frontend JS modules. The pipeline in scripts/run_pipeline.py already calls compute_topology() which returns all metric families. -->

| Module | Purpose | Key functions |
|--------|---------|---------------|
| `config.py` | Specimen definitions, directory paths | `SPECIMENS`, `get_specimen(name)` |
| `repo_loader.py` | Clone repos (treeless for linux) | `ensure_repo(specimen) → Repo` |
| `git_history.py` | Extract CommitRecord from git log | `extract_history()`, `save_history()`, `load_history()` |
| `cochange_graph.py` | Build NetworkX co-change graph + Louvain communities | `build_cochange_graph()`, `graph_to_json()` |
| `metrics.py` | Weekly TimeSlice aggregation | `compute_timeline_metrics()`, `save_timeline()` |
| `topology.py` | All structural metrics (see Metric Families below) | `compute_topology()`, `save_topology()` |
| `server.py` | FastAPI endpoints + static file serving | See API Endpoints below |

### Frontend Modules (web/static/js/)

<!-- LLM NOTE: All JS modules use the revealing module pattern (IIFE returning public API). No build step, no imports — modules communicate through global variables. Add new visualizations by creating a new module file, adding a <script> tag in index.html, and wiring it up in app.js. -->

| Module | Purpose | Public API |
|--------|---------|------------|
| `app.js` | Main app: specimen selector, data fetching, control wiring | `loadSpecimen(name)` |
| `timeline.js` | D3 area chart with metric switching | `Timeline.init(el)`, `.render(data, metric)`, `.updateMetric(metric)` |
| `graph.js` | D3 force-directed graph (directory + community coloring) | `Graph.init(el)`, `.render(data, threshold)`, `.updateThreshold(n)`, `.setColorMode(mode)` |
| `topology.js` | Topology dashboard: cards, histograms, chord diagram, IET chart | `Topology.init(el)`, `.render(data)` |
| `compare.js` | Side-by-side comparison table + radar chart | `Compare.init(el)`, `.loadAll()` |
| `infopanel.js` | Right sidebar with contextual metric descriptions | `InfoPanel.init()`, `.show(key)` |

### API Endpoints

| Endpoint | Returns | Source file |
|----------|---------|-------------|
| `GET /api/specimens` | List of specimens with `has_timeline`, `has_cochange`, `has_topology` flags | `data/processed/` existence check |
| `GET /api/timeline/{name}` | `TimeSlice[]` — weekly metrics | `{name}_timeline.json` |
| `GET /api/cochange/{name}` | `{nodes, links, num_communities}` — graph + Louvain labels | `{name}_cochange.json` |
| `GET /api/topology/{name}` | `{graph, commit_shape, churn_hotspots, change_entropy, burstiness, directory_coupling}` | `{name}_topology.json` |

---

## Metric Families

<!-- LLM NOTE: This is the conceptual map of what we measure and why. When adding new metrics, place them in the appropriate family or create a new one. Each family answers a different question about the codebase's structure. -->

### 1. Timeline (per-week aggregation)
**Question:** How does activity change over time?
- Churn (lines changed), commit count, files touched, unique authors
- Avg files/commit, file concentration (Gini of per-week file distribution)
- **File:** `metrics.py` → `TimeSlice` dataclass

### 2. Graph Topology (NetworkX on co-change graph)
**Question:** What is the shape of the coupling network?
- Modularity (Louvain), community count, clustering coefficient, connected components
- Degree distribution (log-log), betweenness centrality (bridge files)
- **File:** `topology.py` → `compute_graph_topology()`

### 3. Commit Shape (per-commit analysis)
**Question:** How broad are individual changes?
- Files-per-commit distribution, dirs-per-commit distribution
- Creation ratio (new files vs modifications)
- **File:** `topology.py` → `compute_commit_shape()`

### 4. Churn Hotspots (per-file aggregation)
**Question:** How concentrated is the work?
- Churn Gini coefficient, top hotspot files, author entropy per file
- **File:** `topology.py` → `compute_churn_hotspots()`

### 5. Entropy (information-theoretic)
**Question:** How predictable are coupling patterns?
- Change entropy: Shannon entropy of co-change partners per file
- **File:** `topology.py` → `compute_change_entropy()`

### 6. Burstiness (temporal dynamics)
**Question:** How bursty vs uniform is the commit rhythm?
- Global burstiness B = (σ - μ) / (σ + μ) of inter-event times
- Per-file burstiness, inter-event time histogram
- **File:** `topology.py` → `compute_burstiness()`

### 7. Directory Coupling (cross-module flow)
**Question:** Which parts of the codebase are coupled?
- Directory-to-directory co-change matrix (chord diagram)
- **File:** `topology.py` → `compute_directory_coupling()`

---

## Adding New Features — Decision Tree

```
Want to add a new metric?
├── Backend computation only?
│   └── Add function in topology.py → call it from compute_topology() → rerun pipeline
├── New visualization?
│   └── Create web/static/js/{name}.js → add <script> in index.html → wire in app.js
├── New API endpoint?
│   └── Add route in server.py → add JSON file in pipeline
└── New specimen?
    └── Add Specimen() to config.py → run pipeline → data appears in UI automatically
```

## Development Patterns

- **No build step** for frontend — vanilla JS + D3.js loaded from CDN
- **Pre-computed JSON** — pipeline writes to `data/processed/`, server reads it
- **Revealing module pattern** — all JS modules are IIFEs returning a public API object
- **Hot reload** — uvicorn watches for Python changes; browser refresh for JS changes
- **Large repos** — linux kernel uses treeless clone (`--filter=blob:none`)
- **Single-pass topology** — `topology.py` computes all metric families in `compute_topology()`

## Data Flow

```
Git repo (on disk)
  ↓ extract_history()
CommitRecord[] (data/raw/{name}_commits.json)
  ↓ compute_timeline_metrics()
  ↓ build_cochange_graph()
  ↓ compute_topology()
TimeSlice[], Graph JSON, Topology JSON (data/processed/)
  ↓ FastAPI serves as JSON
D3.js renders in browser
```

## Known Issues & Gotchas

<!-- LLM NOTE: These are things that have bitten us before. Check this list before debugging. -->

- **Linux kernel pipeline takes 10-30 minutes** — treeless clone is fast but diffstat extraction over thousands of commits is slow. Run in background.
- **OpenClaw has 22k commits but only ~18 weekly time slices** — all development happened in a compressed time window. This is real signal, not a bug.
- **Port-louis pre-commit hook intercepts `git commit` in Claude Code** — the hook pattern-matches on "git commit" in bash commands and runs port-louis TypeScript linters. Workaround: use `GIT_ACTION=commit && git $GIT_ACTION` to avoid the pattern match, or commit from outside Claude Code.
- **Server background tasks show "completed" in Claude Code** — but uvicorn is actually still running. The task wrapper exits after initial output flush. Verify with `curl -s -o /dev/null -w "%{http_code}" http://localhost:8765/`.
- **Reprocessing after code changes** — if you change topology.py, you must rerun `run_pipeline.py --skip-clone --skip-extract` (or pass `skip_extract=True`) to regenerate the processed JSON. The server reads static files, not live computations.
- **D3 chord diagram needs d3.chord()** — this is in d3.v7.min.js (the full bundle), not in modular d3 builds. We use the full bundle via CDN.
- **Community detection is expensive** — `greedy_modularity_communities()` runs in both `cochange_graph.py` (for node labels) and `topology.py` (for modularity score). On large graphs (8k+ nodes) this can take 30+ seconds.
