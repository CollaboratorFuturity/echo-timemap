import json

import pytest

from app.core.database import get_db
from app.main import app
from app.services.seed import SEED_DIR, seed


def _seed_file(name):
    return json.loads((SEED_DIR / f"{name}.json").read_text(encoding="utf-8"))


@pytest.fixture
async def seeded(client):
    gen = app.dependency_overrides[get_db]()
    session = await gen.__anext__()
    counts = await seed(session)
    await gen.aclose()
    return counts


@pytest.mark.asyncio
async def test_seed_counts(seeded):
    assert seeded == {"sources": 3, "records": 509, "countries": 38, "insets": 8}


@pytest.mark.asyncio
async def test_seed_is_idempotent(client, seeded):
    gen = app.dependency_overrides[get_db]()
    session = await gen.__anext__()
    assert await seed(session) == {}
    await gen.aclose()


@pytest.mark.asyncio
async def test_sources_in_panel_order(client, seeded):
    r = await client.get("/api/v1/sources")
    assert r.status_code == 200
    data = r.json()
    assert [s["id"] for s in data] == ["unesco", "nemo", "echo"]
    assert data[0] == {"id": "unesco", "label": "UNESCO World Heritage", "kind": "site", "shape": "sphere",
                       "color": None, "defaultOn": True, "note": "Marker color = heritage layer; height = start year"}


@pytest.mark.asyncio
async def test_records_match_seed_exactly(client, seeded):
    r = await client.get("/api/v1/records")
    assert r.status_code == 200
    assert r.headers["cache-control"] == "public, max-age=300"
    api = r.json()
    expected = [{k: v for k, v in row.items() if k != "seq" and v is not None} for row in _seed_file("records")]
    assert api == expected


@pytest.mark.asyncio
async def test_record_filters(client, seeded):
    echo = (await client.get("/api/v1/records", params={"src": "echo"})).json()
    assert len(echo) == 15 and all(x["src"] == "echo" for x in echo)
    two = (await client.get("/api/v1/records", params=[("src", "nemo"), ("src", "echo")])).json()
    assert len(two) == 92 + 15
    spain = (await client.get("/api/v1/records", params={"country": "Spain"})).json()
    assert spain and all(x["c"] == "Spain" for x in spain)


@pytest.mark.asyncio
async def test_single_record_and_404(client, seeded):
    r = await client.get("/api/v1/records/unesco-0")
    assert r.status_code == 200
    assert r.json()["n"] == "Historic Centre of the City of Salzburg"
    assert (await client.get("/api/v1/records/unesco-99999")).status_code == 404


@pytest.mark.asyncio
async def test_basemap_matches_seed(client, seeded):
    data = (await client.get("/api/v1/basemap")).json()
    assert data["countries"] == [[c["name"], c["rings"]] for c in _seed_file("countries")]
    assert data["insets"] == {i["key"]: {"label": i["label"], "bbox": i["bbox"], "tile": i["tile"], "outline": i["outline"]}
                              for i in _seed_file("insets")}
