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

    # ── Human-written (small, concentrated activity) ────────────────────
    Specimen(
        name="diagrams",
        url="https://github.com/mingrammer/diagrams",
        since="2020-02-01",
        until="2021-03-31",
    ),
    Specimen(
        name="zoxide",
        url="https://github.com/ajeetdsouza/zoxide",
        since="2020-03-01",
        until="2021-06-30",
    ),
    Specimen(
        name="psst",
        url="https://github.com/jpochyla/psst",
        since="2020-05-01",
        until="2021-06-30",
    ),
    Specimen(
        name="grex",
        url="https://github.com/pemistahl/grex",
        since="2019-10-01",
        until="2020-12-31",
    ),
    Specimen(
        name="acwj",
        url="https://github.com/DoctorWkt/acwj",
        since="2019-10-01",
        until="2020-10-31",
    ),
    Specimen(
        name="termshark",
        url="https://github.com/gcla/termshark",
        since="2019-04-01",
        until="2020-06-30",
    ),
    Specimen(
        name="bubbles",
        url="https://github.com/charmbracelet/bubbles",
        since="2020-01-01",
        until="2021-06-30",
    ),
    Specimen(
        name="explorerpatcher",
        url="https://github.com/valinet/ExplorerPatcher",
        since="2021-08-01",
        until="2022-08-31",
    ),
    Specimen(
        name="pgvector",
        url="https://github.com/pgvector/pgvector",
        since="2021-04-01",
        until="2022-06-30",
    ),
    Specimen(
        name="npkill",
        url="https://github.com/voidcosmos/npkill",
        since="2019-06-01",
        until="2020-12-31",
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
    Specimen(
        name="ruff",
        url="https://github.com/astral-sh/ruff",
        since="2024-06-01",
        until="2025-06-30",
    ),
    Specimen(
        name="uv",
        url="https://github.com/astral-sh/uv",
        since="2024-06-01",
        until="2025-06-30",
    ),
    Specimen(
        name="pydantic",
        url="https://github.com/pydantic/pydantic",
        since="2024-01-01",
        until="2025-06-30",
    ),
    Specimen(
        name="shadcn-ui",
        url="https://github.com/shadcn-ui/ui",
    ),
    Specimen(
        name="dagger",
        url="https://github.com/dagger/dagger",
        since="2024-06-01",
        until="2025-06-30",
    ),
    Specimen(
        name="fresh",
        url="https://github.com/denoland/fresh",
        since="2024-01-01",
        until="2025-06-30",
    ),
    Specimen(
        name="hono",
        url="https://github.com/honojs/hono",
        since="2024-01-01",
        until="2025-06-30",
    ),
    Specimen(
        name="drizzle-orm",
        url="https://github.com/drizzle-team/drizzle-orm",
        since="2024-01-01",
        until="2025-06-30",
    ),
    Specimen(
        name="electric",
        url="https://github.com/electric-sql/electric",
        since="2024-01-01",
        until="2025-06-30",
    ),
    Specimen(
        name="effect",
        url="https://github.com/Effect-TS/effect",
        since="2024-06-01",
        until="2025-06-30",
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
    Specimen(
        name="mempalace",
        url="https://github.com/milla-jovovich/mempalace",
    ),

    # ── More agent-native (the slop collection) ──────────────────────────
    Specimen(
        name="deutsia-radio",
        url="https://github.com/deutsia/deutsia-radio",
    ),
    Specimen(
        name="agents-wshobson",
        url="https://github.com/wshobson/agents",
    ),
    Specimen(
        name="career-ops",
        url="https://github.com/santifer/career-ops",
    ),
    Specimen(
        name="dataset-viewer",
        url="https://github.com/stardustai/dataset-viewer",
    ),
    Specimen(
        name="vibesdk",
        url="https://github.com/cloudflare/vibesdk",
    ),
    Specimen(
        name="autobe",
        url="https://github.com/wrtnlabs/autobe",
    ),
    Specimen(
        name="ai-slop-detector",
        url="https://github.com/flamehaven01/AI-SLOP-Detector",
    ),
    Specimen(
        name="ruflo",
        url="https://github.com/ruvnet/ruflo",
    ),
    Specimen(
        name="opencti-mcp",
        url="https://github.com/CooperCyberCoffee/opencti_mcp_server",
    ),
    Specimen(
        name="aqua-agents",
        url="https://github.com/vignesh07/aqua",
    ),
]


def get_specimen(name: str) -> Specimen:
    for s in SPECIMENS:
        if s.name == name:
            return s
    raise ValueError(f"Unknown specimen: {name}. Known: {[s.name for s in SPECIMENS]}")
