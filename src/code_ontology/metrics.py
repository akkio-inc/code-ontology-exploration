"""Compute structural metrics from commit history for timeline visualization."""

from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass, asdict
from pathlib import Path

from code_ontology.config import PROCESSED_DIR


@dataclass
class TimeSlice:
    """Metrics for a time bucket (e.g., one week)."""
    period: str  # ISO date of bucket start
    num_commits: int
    total_insertions: int
    total_deletions: int
    total_lines_changed: int
    unique_files_touched: int
    unique_authors: int
    avg_files_per_commit: float
    avg_lines_per_commit: float
    # "Mass" of the period — how much raw change happened
    churn: int  # insertions + deletions
    # Spread — are changes concentrated or distributed?
    file_concentration: float  # avg files per commit / unique files (0=concentrated, 1=spread)


def bucket_commits_by_week(commits: list[dict]) -> dict[str, list[dict]]:
    """Group commits into ISO week buckets."""
    from datetime import datetime, timedelta

    buckets: dict[str, list[dict]] = defaultdict(list)
    for c in commits:
        ts = datetime.fromisoformat(c["timestamp"])
        # Start of the ISO week (Monday)
        week_start = ts - timedelta(days=ts.weekday())
        key = week_start.strftime("%Y-%m-%d")
        buckets[key].append(c)
    return dict(sorted(buckets.items()))


def compute_timeline_metrics(commits: list[dict]) -> list[TimeSlice]:
    """Compute per-week structural metrics."""
    buckets = bucket_commits_by_week(commits)
    slices: list[TimeSlice] = []

    for period, bucket_commits in buckets.items():
        n = len(bucket_commits)
        total_ins = sum(c["total_insertions"] for c in bucket_commits)
        total_del = sum(c["total_deletions"] for c in bucket_commits)
        total_changed = total_ins + total_del

        all_files: set[str] = set()
        all_authors: set[str] = set()
        file_counts: list[int] = []

        for c in bucket_commits:
            files = [f["path"] for f in c["files"]]
            all_files.update(files)
            all_authors.add(c["author_email"])
            file_counts.append(len(files))

        avg_files = sum(file_counts) / n if n else 0
        unique_files = len(all_files)

        slices.append(TimeSlice(
            period=period,
            num_commits=n,
            total_insertions=total_ins,
            total_deletions=total_del,
            total_lines_changed=total_changed,
            unique_files_touched=unique_files,
            unique_authors=len(all_authors),
            avg_files_per_commit=round(avg_files, 2),
            avg_lines_per_commit=round(total_changed / n, 2) if n else 0,
            churn=total_changed,
            file_concentration=round(avg_files / unique_files, 4) if unique_files else 0,
        ))

    return slices


def save_timeline(slices: list[TimeSlice], specimen_name: str) -> Path:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    out_path = PROCESSED_DIR / f"{specimen_name}_timeline.json"
    data = [asdict(s) for s in slices]
    out_path.write_text(json.dumps(data, indent=2))
    print(f"  saved {len(slices)} time slices → {out_path}")
    return out_path
