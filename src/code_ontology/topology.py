"""Compute structural topology metrics for comparing specimen codebases.

Four metric families:
1. Graph topology — modularity, clustering, degree distribution, centrality
2. Commit shape — files-per-commit distribution, directory span per commit
3. File lifecycle — creation/modification ratio, churn hotspot concentration
4. Entropy — change predictability, author concentration per file
"""

from __future__ import annotations

import json
import math
from collections import Counter, defaultdict
from pathlib import Path

import networkx as nx
from networkx.algorithms.community import greedy_modularity_communities

from code_ontology.config import PROCESSED_DIR


def _gini(values: list[float]) -> float:
    """Compute Gini coefficient (0 = perfect equality, 1 = max inequality)."""
    if not values or all(v == 0 for v in values):
        return 0.0
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    cumsum = sum((i + 1) * v for i, v in enumerate(sorted_vals))
    total = sum(sorted_vals)
    return (2 * cumsum) / (n * total) - (n + 1) / n


def _entropy(counts: list[int]) -> float:
    """Shannon entropy in bits."""
    total = sum(counts)
    if total == 0:
        return 0.0
    probs = [c / total for c in counts if c > 0]
    return -sum(p * math.log2(p) for p in probs)


def _dir_of(path: str, depth: int = 1) -> str:
    """Extract the top-level directory from a file path."""
    parts = path.split("/")
    return "/".join(parts[:depth]) if len(parts) > depth else parts[0]


def compute_graph_topology(G: nx.Graph) -> dict:
    """Compute network-science metrics on the co-change graph."""
    if G.number_of_nodes() == 0:
        return {
            "modularity": 0,
            "num_communities": 0,
            "avg_clustering": 0,
            "num_components": 0,
            "largest_component_fraction": 0,
            "degree_distribution": [],
            "top_betweenness": [],
        }

    # Community detection + modularity
    communities = list(greedy_modularity_communities(G))
    modularity = nx.algorithms.community.modularity(G, communities)

    # Clustering coefficient
    avg_clustering = nx.average_clustering(G)

    # Connected components
    components = list(nx.connected_components(G))
    largest_frac = max(len(c) for c in components) / G.number_of_nodes() if components else 0

    # Degree distribution (histogram buckets)
    degrees = [d for _, d in G.degree()]
    degree_counts = Counter(degrees)
    degree_dist = sorted(degree_counts.items())  # [(degree, count), ...]

    # Betweenness centrality — top 15 bridge files
    betweenness = nx.betweenness_centrality(G)
    top_between = sorted(betweenness.items(), key=lambda x: -x[1])[:15]

    return {
        "modularity": round(modularity, 4),
        "num_communities": len(communities),
        "avg_clustering": round(avg_clustering, 4),
        "num_components": len(components),
        "largest_component_fraction": round(largest_frac, 4),
        "degree_distribution": [{"degree": d, "count": c} for d, c in degree_dist],
        "top_betweenness": [
            {"file": f, "centrality": round(c, 6)} for f, c in top_between
        ],
    }


def compute_commit_shape(commits: list[dict]) -> dict:
    """Analyze the shape of individual commits — breadth, scope, type."""
    files_per_commit: list[int] = []
    dirs_per_commit: list[int] = []
    created_files: set[str] = set()
    modified_files: set[str] = set()
    all_files_ever: set[str] = set()

    for c in commits:
        files = [f["path"] for f in c["files"]]
        if not files:
            continue

        files_per_commit.append(len(files))

        # Directory span
        dirs = set(_dir_of(f) for f in files)
        dirs_per_commit.append(len(dirs))

        for f_info in c["files"]:
            path = f_info["path"]
            ins = f_info.get("insertions", 0)
            dels = f_info.get("deletions", 0)
            # Heuristic: file is "created" if it has insertions but no deletions
            # and we haven't seen it before
            if path not in all_files_ever and dels == 0 and ins > 0:
                created_files.add(path)
            elif path in all_files_ever:
                modified_files.add(path)
            all_files_ever.add(path)

    # Build histograms
    fpc_counts = Counter(files_per_commit)
    fpc_hist = sorted(fpc_counts.items())

    dpc_counts = Counter(dirs_per_commit)
    dpc_hist = sorted(dpc_counts.items())

    total_files = len(all_files_ever) or 1
    creation_ratio = len(created_files) / total_files

    return {
        "files_per_commit_histogram": [
            {"files": f, "count": c} for f, c in fpc_hist
        ],
        "dirs_per_commit_histogram": [
            {"dirs": d, "count": c} for d, c in dpc_hist
        ],
        "avg_files_per_commit": round(
            sum(files_per_commit) / len(files_per_commit), 2
        ) if files_per_commit else 0,
        "median_files_per_commit": sorted(files_per_commit)[len(files_per_commit) // 2] if files_per_commit else 0,
        "avg_dirs_per_commit": round(
            sum(dirs_per_commit) / len(dirs_per_commit), 2
        ) if dirs_per_commit else 0,
        "median_dirs_per_commit": sorted(dirs_per_commit)[len(dirs_per_commit) // 2] if dirs_per_commit else 0,
        "creation_ratio": round(creation_ratio, 4),
        "total_unique_files": len(all_files_ever),
        "created_files": len(created_files),
    }


def compute_churn_hotspots(commits: list[dict]) -> dict:
    """Measure how concentrated churn is across files."""
    file_churn: dict[str, int] = defaultdict(int)
    file_authors: dict[str, set[str]] = defaultdict(set)

    for c in commits:
        author = c.get("author_email", "unknown")
        for f_info in c["files"]:
            path = f_info["path"]
            churn = f_info.get("insertions", 0) + f_info.get("deletions", 0)
            file_churn[path] += churn
            file_authors[path].add(author)

    if not file_churn:
        return {
            "churn_gini": 0,
            "top_hotspots": [],
            "author_entropy_per_file": [],
        }

    churn_values = list(file_churn.values())
    churn_gini = _gini(churn_values)

    # Top 20 churn hotspots
    top_files = sorted(file_churn.items(), key=lambda x: -x[1])[:20]
    total_churn = sum(churn_values)

    # Author entropy per file (top 20 most-touched files)
    author_entropies = []
    for path, authors in file_authors.items():
        if len(authors) < 2:
            continue
        # Count commits per author for this file
        author_commit_counts: dict[str, int] = defaultdict(int)
        for c in commits:
            if any(f["path"] == path for f in c["files"]):
                author_commit_counts[c.get("author_email", "unknown")] += 1
        ent = _entropy(list(author_commit_counts.values()))
        author_entropies.append({"file": path, "entropy": round(ent, 4), "num_authors": len(authors)})

    author_entropies.sort(key=lambda x: -x["entropy"])

    return {
        "churn_gini": round(churn_gini, 4),
        "top_hotspots": [
            {
                "file": f,
                "churn": ch,
                "pct_of_total": round(ch / total_churn * 100, 2),
            }
            for f, ch in top_files
        ],
        "avg_author_entropy": round(
            sum(e["entropy"] for e in author_entropies) / len(author_entropies), 4
        ) if author_entropies else 0,
        "author_entropy_top_files": author_entropies[:15],
    }


def compute_change_entropy(commits: list[dict]) -> dict:
    """How predictable is which files change together?

    High entropy = flexible coupling (many different co-change patterns).
    Low entropy = rigid coupling (same files always change together).
    """
    # For each file, count how often each other file co-changes with it
    file_cochange: dict[str, Counter] = defaultdict(Counter)
    for c in commits:
        files = [f["path"] for f in c["files"]]
        if len(files) < 2 or len(files) > 50:
            continue
        for f in files:
            for other in files:
                if f != other:
                    file_cochange[f][other] += 1

    if not file_cochange:
        return {"avg_change_entropy": 0, "per_file_entropy": []}

    per_file: list[dict] = []
    for f, neighbors in file_cochange.items():
        ent = _entropy(list(neighbors.values()))
        per_file.append({"file": f, "entropy": round(ent, 4), "num_neighbors": len(neighbors)})

    per_file.sort(key=lambda x: -x["entropy"])
    avg_ent = sum(e["entropy"] for e in per_file) / len(per_file)

    return {
        "avg_change_entropy": round(avg_ent, 4),
        "per_file_entropy_top": per_file[:15],
        "per_file_entropy_bottom": per_file[-15:] if len(per_file) > 15 else [],
    }


def compute_topology(commits: list[dict], graph: nx.Graph) -> dict:
    """Compute all topology metrics for a specimen."""
    return {
        "graph": compute_graph_topology(graph),
        "commit_shape": compute_commit_shape(commits),
        "churn_hotspots": compute_churn_hotspots(commits),
        "change_entropy": compute_change_entropy(commits),
    }


def save_topology(data: dict, specimen_name: str) -> Path:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    out_path = PROCESSED_DIR / f"{specimen_name}_topology.json"
    out_path.write_text(json.dumps(data, indent=2))
    print(f"  saved topology metrics → {out_path}")
    return out_path
