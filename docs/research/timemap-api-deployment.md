# TimeMap Database and API -- Deployment

**Status:** In progress. Verified on PostgreSQL 16 in the sandbox 2026-11-05; server deployment pending (see timemap-frontend-deployment.md for the server steps).

## Components

| Part | File |
|------|------|
| Models + short-key map | `backend/app/models/timemap.py` (`Source`, `Record`, `Country`, `Inset`, `RECORD_FIELDS`) |
| Migration | `backend/alembic/versions/33d890b0e3d2_timemap_tables.py` |
| Seed files | `backend/app/seed_data/sources.json`, `records.json`, `countries.json`, `insets.json` |
| Seed extraction | `backend/scripts/extract_prototype_data.py` |
| Seeder | `backend/app/services/seed.py` |
| Router | `backend/app/routers/timemap.py` |
| Response schemas | `backend/app/schemas/timemap.py` |
| Tests | `backend/tests/test_timemap_api.py` |

## Startup sequence

1. `alembic upgrade head` runs with the backend's own interpreter (`sys.executable`); failures are logged with Alembic's stderr.
2. If `sources` is empty, the seed files are loaded in one transaction and the backend logs `TimeMap seed loaded: {...}`.
3. Requests are served. A restart with existing data skips step 2.

## Seed provenance

The seed files were produced from the data team's `5d-timemap-v2.jsx` (2026-11-02 handoff):

1. **Dev machine, terminal, `backend/`:** `python scripts/extract_prototype_data.py <path>/5d-timemap-v2.jsx`
2. Output: `sources=3 records=509 {'unesco': 402, 'nemo': 92, 'echo': 15} countries=38 insets=8`

The script parses the JSON array constants directly and checks the `SOURCES` registry in the file against its own transcription (ids, labels, kinds, shapes, notes, colors); it stops if they differ.

## Coordinate corrections (2026-11-05)

26 NE-MO records were re-geocoded: 9 automatic (`photon`) geocodes placed in the wrong city, and all 17 records placed at their country's capital (`capital_fallback`).

1. **Dev machine, terminal, `backend/`:** `python scripts/geocode_records.py scripts/geocode_fixes.json scripts/geocode_results.json` queries OpenStreetMap through Nominatim (one request per second) and writes the top candidates for review.
2. Each candidate was checked against the institution's published address; seven needing a second query were looked up by street address.
3. Reviewed values are in `scripts/geocode_applied.json` (coordinates, city, pinned building, query used).
4. **Dev machine, terminal, `backend/`:** `python scripts/apply_geocode_fixes.py scripts/geocode_applied.json` writes them into `app/seed_data/records.json`, setting `gx` = `nominatim`.
5. **Server or dev, project root:** `make seed-reset` loads the change into a running database.

Rule for organizations with several sites: the pin marks the organization's own address. Texel museum foundation -> Ecomare, De Koog; Universcience -> Cité des sciences, Paris; Amgueddfa Cymru -> National Museum Cardiff. Pernik City Art Gallery -> its hall in the Palace of Culture; Kamianets-Podilskyi museum-reserve -> the Old Fortress.

Güímar (Tenerife) is flagged `ov: true` so it draws on the Canary Islands tile.

Cross-check of the remaining 66 `photon` pins against OpenStreetMap by name: 37 matched, 35 of them within 1 km and 2 within 2.4 km (National Museum of Ireland and Prague City Museum, both multi-site); 29 had no name match in OpenStreetMap and keep their automatic coordinates.

## Operations

| Task | Machine, command |
|------|------------------|
| Reload seed data (wipes TimeMap tables) | Server or dev, project root: `make seed-reset` |
| Seed by hand only if empty | Server or dev, project root: `sudo docker compose exec backend python -m app.services.seed` |
| Count rows | Server or dev, project root: `sudo docker compose exec db psql -U echo_timemap -c "select src, count(*) from records group by src;"` |
| New migration after a model change | Dev, `backend/` with `DATABASE_URL` pointing at a running database: `.venv/bin/python -m alembic revision --autogenerate -m "<message>"` |

## Verification (2026-11-05, sandbox)

| Check | Result |
|-------|--------|
| `alembic upgrade head` on empty PostgreSQL 16 | Creates `sources`, `records`, `basemap_countries`, `basemap_insets` |
| Seed counts | `unesco` 402 (start years -43000 to 2025), `nemo` 92, `echo` 15; 38 countries; 8 insets |
| Second seed run | Skipped ("already seeded") |
| Backend restart | No re-seed; 509 records remain |
| API vs original prototype file (independent parser) | 509 of 509 records equal in order and content; `countries` equal to `EU_MAP`; `insets` equal to `INSETS` |
| Null handling | 319 explicit `null` values in the prototype arrays are omitted keys in API responses; every read of those fields in `TimeMap.jsx` uses `!= null`, `== null` or truthiness, which treat both the same |
| Filters | `?src=echo` 15; `?src=nemo&src=echo` 107; `?country=Spain` 50 |
| Unknown id | `GET /api/v1/records/nope` returns 404 |
| Response headers | `Content-Encoding: gzip`, `Cache-Control: public, max-age=300`; `/records` 193,648 bytes uncompressed |
| pytest (sqlite) | 8 passed |

## Known issues

- Rate-limit counters live in process memory (see TODO).
- Geocoding errors carried over from the prototype data (see TODO).
