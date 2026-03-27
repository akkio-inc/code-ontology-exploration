"""Build co-change graphs: files that change together in commits form edges."""

from __future__ import annotations

import json
from collections import defaultdict
from itertools import combinations
from pathlib import Path

import networkx as nx

from code_ontology.config import PROCESSED_DIR


def build_cochange_graph(
    commits: list[dict],
    min_cochanges: int = 2,
    max_files_per_commit: int = 50,
) -> nx.Graph:
    """
    Build an undirected graph where:
    - Nodes = file paths
    - Edges = files that appeared in the same commit
    - Edge weight = number of co-occurrences

    Commits touching more than max_files_per_commit files are skipped
    (they're usually bulk renames/reformats, not structural signal).
    """
    pair_counts: dict[tuple[str, str], int] = defaultdict(int)
    file_commit_counts: dict[str, int] = defaultdict(int)

    for commit in commits:
        files = [f["path"] for f in commit["files"]]
        if len(files) > max_files_per_commit or len(files) < 2:
            continue

        for f in files:
            file_commit_counts[f] += 1

        for a, b in combinations(sorted(files), 2):
            pair_counts[(a, b)] += 1

    G = nx.Graph()

    # Add all files as nodes with their commit count
    for f, count in file_commit_counts.items():
        G.add_node(f, commit_count=count)

    # Add edges above threshold
    for (a, b), weight in pair_counts.items():
        if weight >= min_cochanges:
            G.add_edge(a, b, weight=weight)

    # Remove isolated nodes (files that never co-changed above threshold)
    isolates = list(nx.isolates(G))
    G.remove_nodes_from(isolates)

    print(f"  co-change graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
    return G


def graph_to_json(G: nx.Graph) -> dict:
    """Convert networkx graph to a D3-friendly JSON structure."""
    nodes = []
    for node_id, data in G.nodes(data=True):
        # Extract directory for grouping
        parts = node_id.split("/")
        group = "/".join(parts[:2]) if len(parts) > 1 else parts[0]
        nodes.append({
            "id": node_id,
            "group": group,
            "commit_count": data.get("commit_count", 0),
            "degree": G.degree(node_id),
        })

    links = []
    for a, b, data in G.edges(data=True):
        links.append({
            "source": a,
            "target": b,
            "weight": data.get("weight", 1),
        })

    return {"nodes": nodes, "links": links}


def save_cochange_graph(G: nx.Graph, specimen_name: str) -> Path:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    out_path = PROCESSED_DIR / f"{specimen_name}_cochange.json"
    data = graph_to_json(G)
    out_path.write_text(json.dumps(data))
    print(f"  saved co-change graph → {out_path}")
    return out_path
