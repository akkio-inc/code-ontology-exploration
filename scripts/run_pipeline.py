#!/usr/bin/env python3
"""Run the full pipeline for one or all specimens."""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from code_ontology.config import SPECIMENS, get_specimen
from code_ontology.repo_loader import ensure_repo
from code_ontology.git_history import extract_history, save_history, load_history
from code_ontology.cochange_graph import build_cochange_graph, save_cochange_graph
from code_ontology.metrics import compute_timeline_metrics, save_timeline


def run_specimen(name: str, skip_clone: bool = False, skip_extract: bool = False):
    specimen = get_specimen(name)
    print(f"\n{'='*60}")
    print(f"Processing: {specimen.name}")
    print(f"{'='*60}")

    if not skip_clone:
        print("\n[1/4] Cloning repo...")
        ensure_repo(specimen)

    if not skip_extract:
        print("\n[2/4] Extracting git history...")
        repo = ensure_repo(specimen)
        records = extract_history(repo, specimen)
        save_history(records, specimen)
    else:
        print("\n[2/4] Loading cached history...")

    print("\n[3/4] Computing timeline metrics...")
    commits = load_history(specimen.name)
    slices = compute_timeline_metrics(commits)
    save_timeline(slices, specimen.name)

    print("\n[4/4] Building co-change graph...")
    graph = build_cochange_graph(commits)
    save_cochange_graph(graph, specimen.name)

    print(f"\nDone: {specimen.name}")


if __name__ == "__main__":
    names = sys.argv[1:] if len(sys.argv) > 1 else [s.name for s in SPECIMENS]
    for name in names:
        run_specimen(name)
