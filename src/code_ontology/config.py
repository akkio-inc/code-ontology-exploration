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


# The three specimens on the human → agent spectrum
SPECIMENS: list[Specimen] = [
    Specimen(
        name="django",
        url="https://github.com/django/django",
        since="2020-01-01",
        until="2021-01-31",
    ),
    Specimen(
        name="openhands",
        url="https://github.com/All-Hands-AI/OpenHands",
    ),
    Specimen(
        name="openclaw",
        url="https://github.com/openclaw/openclaw",
    ),
]


def get_specimen(name: str) -> Specimen:
    for s in SPECIMENS:
        if s.name == name:
            return s
    raise ValueError(f"Unknown specimen: {name}. Known: {[s.name for s in SPECIMENS]}")
