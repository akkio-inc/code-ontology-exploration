"""Clone or open specimen repositories."""

from pathlib import Path

from git import Repo

from code_ontology.config import REPOS_DIR, Specimen


def ensure_repo(specimen: Specimen) -> Repo:
    """Clone the repo if not present, otherwise open it. Returns a GitPython Repo."""
    # Use the base repo name (not the specimen name) for the clone dir
    repo_name = specimen.url.rstrip("/").split("/")[-1]
    repo_path = REPOS_DIR / repo_name

    if repo_path.exists() and (repo_path / ".git").exists():
        print(f"  repo already cloned: {repo_path}")
        return Repo(repo_path)

    print(f"  cloning {specimen.url} → {repo_path} ...")
    # Shallow clone is faster but we need history, so full clone
    # For linux kernel, use --filter=blob:none to skip file contents (treeless clone)
    # Large repos get treeless clones (commit+tree objects only, no file blobs)
    large_repos = {"linux", "rust", "kubernetes", "go", "next.js", "langchain"}
    if any(name in specimen.url for name in large_repos):
        print("  (treeless clone for large repo — fetches tree/commit objects only)")
        repo = Repo.clone_from(
            specimen.url,
            repo_path,
            multi_options=["--filter=blob:none"],
        )
    else:
        repo = Repo.clone_from(specimen.url, repo_path)

    return repo
