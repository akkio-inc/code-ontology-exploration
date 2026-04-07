"""Configuration for specimen repositories and analysis parameters."""

from pathlib import Path
from dataclasses import dataclass


ROOT = Path(__file__).resolve().parents[2]
REPOS_DIR = ROOT / "repos"
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
DERIVED_DIR = DATA_DIR / "derived"


@dataclass(frozen=True)
class Specimen:
    name: str
    url: str
    # Which subdirectory to analyze (None = whole repo)
    subpath: str | None = None
    # Git log time window
    since: str | None = None
    until: str | None = None


# Specimens on the human → agent spectrum
# Categories: human (pre-2022, no AI), hybrid (human + agent), agent-native
SPECIMENS: list[Specimen] = [
    # ── Human-written (pre-2022, no AI contamination) ──────────────────
    Specimen(
        name="django",
        url="https://github.com/django/django",
        since="2020-01-01",
        until="2021-01-31",
    ),
    Specimen(
        name="flask",
        url="https://github.com/pallets/flask",
        since="2019-01-01",
        until="2021-12-31",
    ),
    Specimen(
        name="redis",
        url="https://github.com/redis/redis",
        since="2019-01-01",
        until="2021-12-31",
    ),
    Specimen(
        name="golang-std",
        url="https://github.com/golang/go",
        subpath="src/",
        since="2020-01-01",
        until="2021-06-30",
    ),
    Specimen(
        name="rust-compiler",
        url="https://github.com/rust-lang/rust",
        subpath="compiler/",
        since="2020-06-01",
        until="2021-06-30",
    ),
    Specimen(
        name="kubernetes-pkg",
        url="https://github.com/kubernetes/kubernetes",
        subpath="pkg/",
        since="2020-06-01",
        until="2021-06-30",
    ),

    # ── Hybrid (human + agent contributions, post-2023) ────────────────
    Specimen(
        name="openhands",
        url="https://github.com/All-Hands-AI/OpenHands",
    ),
    Specimen(
        name="langchain",
        url="https://github.com/langchain-ai/langchain",
        since="2024-01-01",
        until="2025-06-30",
    ),
    Specimen(
        name="nextjs",
        url="https://github.com/vercel/next.js",
        since="2024-06-01",
        until="2025-06-30",
    ),
    Specimen(
        name="anthropic-cookbook",
        url="https://github.com/anthropics/anthropic-cookbook",
    ),
    Specimen(
        name="spec-kit",
        url="https://github.com/github/spec-kit",
    ),
    Specimen(
        name="claude-code-action",
        url="https://github.com/anthropics/claude-code-action",
    ),

    # ── Agent-native (primarily AI-authored) ───────────────────────────
    Specimen(
        name="openclaw",
        url="https://github.com/openclaw/openclaw",
    ),
    Specimen(
        name="claudeos",
        url="https://github.com/ssochi/ClaudeOS",
    ),
    Specimen(
        name="awesome-agent-skills",
        url="https://github.com/VoltAgent/awesome-agent-skills",
    ),
    Specimen(
        name="openclaw-agents",
        url="https://github.com/shenhao-stu/openclaw-agents",
    ),
    Specimen(
        name="clawteam-openclaw",
        url="https://github.com/win4r/ClawTeam-OpenClaw",
    ),
    Specimen(
        name="awesome-openclaw-agents",
        url="https://github.com/mergisi/awesome-openclaw-agents",
    ),
]


def get_specimen(name: str) -> Specimen:
    for s in SPECIMENS:
        if s.name == name:
            return s
    raise ValueError(f"Unknown specimen: {name}. Known: {[s.name for s in SPECIMENS]}")
