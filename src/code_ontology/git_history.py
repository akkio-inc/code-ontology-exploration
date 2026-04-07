"""Extract commit history from a git repo into structured records."""

from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path

from git import Repo

from code_ontology.config import Specimen, RAW_DIR


@dataclass
class FileChange:
    path: str
    insertions: int
    deletions: int
    lines_changed: int


@dataclass
class CommitRecord:
    sha: str
    author_name: str
    author_email: str
    timestamp: str  # ISO format
    message: str
    files: list[FileChange]
    total_insertions: int
    total_deletions: int
    total_files: int


def extract_history(repo: Repo, specimen: Specimen) -> list[CommitRecord]:
    """Walk git log and extract commit records, optionally filtered by subpath and time."""
    records: list[CommitRecord] = []

    log_args: dict = {"no_merges": True}
    if specimen.since:
        log_args["since"] = specimen.since
    if specimen.until:
        log_args["until"] = specimen.until

    # If subpath filter, pass as positional paths arg
    paths = [specimen.subpath] if specimen.subpath else []

    print(f"  extracting history for {specimen.name}...")
    count = 0
    for commit in repo.iter_commits("HEAD", paths=paths, **log_args):
        files: list[FileChange] = []
        try:
            stats = commit.stats.files
        except Exception:
            stats = {}

        for filepath, stat in stats.items():
            # If subpath filter, skip files outside it
            if specimen.subpath and not filepath.startswith(specimen.subpath):
                continue
            fc = FileChange(
                path=filepath,
                insertions=stat.get("insertions", 0),
                deletions=stat.get("deletions", 0),
                lines_changed=stat.get("insertions", 0) + stat.get("deletions", 0),
            )
            files.append(fc)

        if not files and specimen.subpath:
            # Commit didn't touch our subpath after filtering
            continue

        ts = datetime.fromtimestamp(commit.committed_date, tz=timezone.utc).isoformat()

        total_ins = sum(f.insertions for f in files)
        total_del = sum(f.deletions for f in files)

        rec = CommitRecord(
            sha=commit.hexsha[:12],
            author_name=commit.author.name or "",
            author_email=commit.author.email or "",
            timestamp=ts,
            message=commit.message.strip()[:2000],
            files=files,
            total_insertions=total_ins,
            total_deletions=total_del,
            total_files=len(files),
        )
        records.append(rec)
        count += 1
        if count % 500 == 0:
            print(f"    ... {count} commits extracted")

    print(f"  done: {count} commits total")
    # Chronological order (oldest first)
    records.reverse()
    return records


def save_history(records: list[CommitRecord], specimen: Specimen) -> Path:
    """Serialize commit records to JSON."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    out_path = RAW_DIR / f"{specimen.name}_commits.json"
    data = [asdict(r) for r in records]
    out_path.write_text(json.dumps(data, indent=2))
    print(f"  saved {len(records)} commits → {out_path}")
    return out_path


def load_history(specimen_name: str) -> list[dict]:
    """Load previously saved commit history."""
    path = RAW_DIR / f"{specimen_name}_commits.json"
    return json.loads(path.read_text())
