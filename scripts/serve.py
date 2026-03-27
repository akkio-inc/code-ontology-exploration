#!/usr/bin/env python3
"""Start the web visualization server."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import uvicorn

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print(f"Starting Code Ontology Explorer at http://localhost:{port}")
    uvicorn.run("code_ontology.server:app", host="0.0.0.0", port=port, reload=True)
