# Metrics Roadmap

> Last updated: 2026-04-09

Categorized list of all metrics identified through research, organized by implementation difficulty and current status.

---

## Implemented (Easy)

These metrics are computationally cheap — derived from git log data without needing to parse source code.

| Metric | Source | Module | Notes |
|--------|--------|--------|-------|
| Author classification (3-layer) | Coderbuds YAML rules, Ghaleb MSR '26 | `author_classifier.py` | Email → commit message → [bot] heuristic |
| Multiline commit message ratio | Ghaleb MSR '26 (67.5% importance for Codex) | `topology.py` | Top discriminating feature |
| Conventional commit ratio | Ghaleb MSR '26 | `topology.py` | `feat:`, `fix:`, `chore:`, etc. |
| Co-author tag ratio | Ghaleb MSR '26, Coderbuds | `topology.py` | `Co-authored-by:` lines |
| Footer tag ratio | Ghaleb MSR '26, Coderbuds | `topology.py` | Any structured footer |
| Avg message line count | Ghaleb MSR '26 | `topology.py` | Proxy for verbosity |
| Hour-of-day by author type | Original | `topology.py` | Stacked bar: human/AI/bot |
| Per-author-type commit counts | Original | `authors.js` | Donut chart + metric cards |
| Churn by author type | Original | `authors.js` | Lines added/deleted per category |
| Files/commit by author type | Original | `authors.js` | Breadth of changes per category |
| Burstiness parameter | Goh & Barabási (2008) | `topology.py` | Inter-event time distribution |
| Change entropy (Shannon) | — | `topology.py` | Distribution of changes across files |
| Author entropy | — | `topology.py` | Concentration of authorship |
| Churn Gini coefficient | — | `topology.py` | Inequality of code ownership |
| Community detection (Louvain) | — | `topology.py` | Co-change graph modularity |

---

## Not Yet Implemented (Medium)

Require AST parsing or deeper analysis but are well-understood techniques.

| Metric | Source | Difficulty | Notes |
|--------|--------|-----------|-------|
| Comment-to-code ratio | Rahman et al. (2409.01382) — "sole universal discriminator" | Medium | Line-level parsing sufficient; no full AST needed |
| Conditional statement density | Ghaleb MSR '26 (27.2% importance for Claude Code) | Medium | Needs AST or regex-based counting |
| Cyclomatic complexity distribution | Classic software engineering | Medium | Per-function, compare distributions by author type |
| Function/method length distribution | Classic | Medium | LOC per function, compare by author type |
| Loop density | Classic | Medium | Loops per KLOC |
| Nesting depth distribution | Classic | Medium | Max/avg nesting per function |
| Halstead metrics | Halstead (1977) | Medium | Operands, operators, volume, difficulty — needs tokenizer |
| PR/commit size distribution | CodeRabbit blog | Medium | Lines changed per commit, by author type. Already have raw data, needs histogram |
| Message verbosity score | Coderbuds ("verbose with perfect grammar") | Medium | Word count, vocabulary richness, grammar score |
| Commit message sentiment | Original idea | Medium | Positive/negative/neutral — NLP library needed |
| File survival curves | Original | Medium | How long do files live before deletion, by author type? |
| Adjacency matrix visualization | Original | Medium | Dense co-change matrix view |

---

## Not Yet Implemented (Hard)

Require significant infrastructure (blame parsing, AST tools, graph algorithms).

| Metric | Source | Difficulty | Notes |
|--------|--------|-----------|-------|
| AST entropy | Tihanyi et al. (2510.10493) | Hard | Requires AST parsing per language; entropy of node type distribution |
| Dataflow graph similarity | Tihanyi et al. | Hard | "Strongest AI code signal" — requires IR/dataflow extraction |
| Co-editing networks | git2net (Gote et al., 1903.10180) | Hard | Who overwrites whose code — needs `git blame` per commit |
| Code churn decay rate | Original | Hard | How quickly does agent code get modified by humans? Needs blame |
| Function shape fingerprint | Tihanyi et al. | Hard | AST depth, branching factor, node type ratios per function |
| Cross-language structural comparison | Tihanyi et al. | Hard | Same metrics across Python, JS, Go, Rust |
| Effect size report (Cohen's d) | Standard statistics | Medium-Hard | Requires grouping specimens into categories and computing statistical significance |
| Normalized timeline overlay | Original | Medium-Hard | Per-commit rates on normalized 0–1 time axis for cross-repo comparison |

---

## Planned Phases

### Phase B: Category Aggregates
Group specimens by archetype (pure-human / hybrid / agent-native) and compute aggregate statistics across groups. Enables "human repos do X on average vs agent repos do Y" statements.

### Phase C: Visual Comparisons
Box plots comparing metric distributions across categories. Normalized timeline overlay for cross-repo temporal comparison.

### Phase D: Code-Level Metrics
Implement AST-based metrics (comment density, complexity, function lengths). Start with Python specimens since tree-sitter/ast module is readily available.

### Phase E: Statistical Rigor
Effect sizes (Cohen's d, rank-biserial correlation) for all metric comparisons. Confidence intervals. Multiple comparison correction.

### Phase F: Network Analysis
Co-editing networks via git blame. Who overwrites whose code? Do agents create code that humans modify more frequently?

---

## Key Insights from Research

1. **Commit message structure is the #1 discriminator** — multiline ratio alone has 67.5% feature importance for detecting Codex (Ghaleb MSR '26)

2. **Dataflow > surface features** — structural patterns in code survive obfuscation, comment removal, and variable renaming (Tihanyi et al.)

3. **Comment-to-code ratio is universal** — the only feature that works across all LLM models for detection (Rahman et al.)

4. **Granularity matters 8.6x more than model differences** — class-level detection is fundamentally different from function-level (Rahman et al.)

5. **75% of AI code is explicitly attributed** — but the remaining 25% requires structural pattern analysis (Coderbuds)

6. **AI code has 1.7x more issues** — and 75% more logic/correctness issues specifically (CodeRabbit)

7. **Our multi-specimen approach appears novel** — most papers study single repos or synthetic benchmarks; cross-repo structural comparison on the human→agent spectrum is an open area
