# Code Ontology Explorer — Claude Instructions

## Overview

Personal research project exploring whether human-written and AI-agent-written code have detectably different structural signatures when analyzed through git history. This is **not** an Akkio product — it's a standalone repo under `akkio-inc`.

## Environment

- Python 3.11+ via mise
- All commands must be prefixed with `mise exec --`
- Server runs on port 8765 with hot reload
- Data files are gitignored (regenerate with `run_pipeline.py`)

## Key Commands

```bash
# Process a specimen
mise exec -- python scripts/run_pipeline.py <specimen-name>

# Start visualization server
mise exec -- python scripts/serve.py

# Process all specimens
mise exec -- python scripts/run_pipeline.py
```

## Specimens

Three codebases on the human → agent spectrum:

| Name | Source | Role |
|------|--------|------|
| `linux-fs` | torvalds/linux fs/ (2018-01 to 2019-01) | Pure human |
| `openhands` | All-Hands-AI/OpenHands | Hybrid (human + agent) |
| `openclaw` | openclaw/openclaw | Agent-native |

Specimen config lives in `src/code_ontology/config.py`.

## Architecture

**Pipeline flow:** `clone repo → extract git history → compute timeline metrics → build co-change graph → compute topology → save JSON`

**Web flow:** FastAPI serves pre-computed JSON + static D3.js visualization.

### Backend Modules (src/code_ontology/)

| Module | Purpose |
|--------|---------|
| `config.py` | Specimen definitions, directory paths |
| `repo_loader.py` | Clone repos (treeless for linux) |
| `git_history.py` | Extract CommitRecord from git log |
| `cochange_graph.py` | Build NetworkX co-change graph + Louvain communities |
| `metrics.py` | Weekly TimeSlice aggregation |
| `topology.py` | All structural metrics: graph topology, commit shape, entropy, burstiness, directory coupling |
| `server.py` | FastAPI endpoints + static file serving |

### Frontend Modules (web/static/js/)

| Module | Purpose |
|--------|---------|
| `app.js` | Main app: specimen selector, data fetching, control wiring |
| `timeline.js` | D3 area chart with metric switching |
| `graph.js` | D3 force-directed graph (directory + community coloring) |
| `topology.js` | Topology dashboard: summary cards, histograms, chord diagram, IET chart |
| `compare.js` | Side-by-side comparison table + radar chart |
| `infopanel.js` | Right sidebar with contextual metric descriptions |

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/specimens` | List specimens and data availability |
| `GET /api/timeline/{name}` | Weekly timeline metrics |
| `GET /api/cochange/{name}` | Co-change graph (nodes + links + communities) |
| `GET /api/topology/{name}` | Structural topology metrics |

## Development Patterns

- **No build step** for frontend — vanilla JS + D3.js loaded from CDN
- **Pre-computed JSON** — pipeline writes to `data/processed/`, server reads it
- **Hot reload** — uvicorn watches for Python changes, browser refresh for JS
- **Large repos** — linux kernel uses treeless clone (`--filter=blob:none`)
- **Commit shape** — topology.py computes all structural metrics in one pass

## Known Issues

- Linux kernel pipeline takes 10-30 minutes (large repo + diffstat extraction)
- OpenClaw has 22k commits but only ~18 weekly time slices (compressed recent history)
- Port-louis pre-commit hook intercepts `git commit` in Claude Code — use git plumbing or commit outside Claude
- Server background tasks show "completed" in Claude Code but uvicorn is still running — verify with `curl localhost:8765`
