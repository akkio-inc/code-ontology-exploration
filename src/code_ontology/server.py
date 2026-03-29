"""FastAPI server serving the web visualization and JSON data."""

from pathlib import Path

import orjson
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from code_ontology.config import PROCESSED_DIR, RAW_DIR, SPECIMENS

app = FastAPI(title="Code Ontology Explorer")

WEB_DIR = Path(__file__).resolve().parents[2] / "web"


@app.get("/api/specimens")
def list_specimens():
    """List available specimens and which have data."""
    results = []
    for s in SPECIMENS:
        has_timeline = (PROCESSED_DIR / f"{s.name}_timeline.json").exists()
        has_cochange = (PROCESSED_DIR / f"{s.name}_cochange.json").exists()
        has_topology = (PROCESSED_DIR / f"{s.name}_topology.json").exists()
        results.append({
            "name": s.name,
            "url": s.url,
            "subpath": s.subpath,
            "since": s.since,
            "until": s.until,
            "has_timeline": has_timeline,
            "has_cochange": has_cochange,
            "has_topology": has_topology,
        })
    return results


@app.get("/api/timeline/{specimen_name}")
def get_timeline(specimen_name: str):
    path = PROCESSED_DIR / f"{specimen_name}_timeline.json"
    if not path.exists():
        raise HTTPException(404, f"No timeline data for {specimen_name}")
    data = orjson.loads(path.read_bytes())
    return Response(content=orjson.dumps(data), media_type="application/json")


@app.get("/api/cochange/{specimen_name}")
def get_cochange(specimen_name: str):
    path = PROCESSED_DIR / f"{specimen_name}_cochange.json"
    if not path.exists():
        raise HTTPException(404, f"No co-change data for {specimen_name}")
    data = orjson.loads(path.read_bytes())
    return Response(content=orjson.dumps(data), media_type="application/json")


@app.get("/api/topology/{specimen_name}")
def get_topology(specimen_name: str):
    path = PROCESSED_DIR / f"{specimen_name}_topology.json"
    if not path.exists():
        raise HTTPException(404, f"No topology data for {specimen_name}")
    data = orjson.loads(path.read_bytes())
    return Response(content=orjson.dumps(data), media_type="application/json")


@app.get("/api/commits/{specimen_name}")
def get_commits(specimen_name: str):
    path = RAW_DIR / f"{specimen_name}_commits.json"
    if not path.exists():
        raise HTTPException(404, f"No commit data for {specimen_name}")
    data = orjson.loads(path.read_bytes())
    return Response(content=orjson.dumps(data), media_type="application/json")


# Serve static web files
app.mount("/static", StaticFiles(directory=str(WEB_DIR / "static")), name="static")


@app.get("/")
def index():
    return FileResponse(str(WEB_DIR / "index.html"))
