# echo-timemap

Public 5D TimeMap for the ECHO project (deliverable D5.6): an interactive 3D map of Europe with 402 UNESCO World Heritage sites, 92 NE-MO museums and 15 ECHO consortium partners, browsable through time with a sweep timeline.

## Tech Stack

| Layer       | Technology                                              |
| ----------- | ------------------------------------------------------- |
| Backend     | FastAPI (Python 3.11) + SQLAlchemy 2 async + Alembic + PostgreSQL 16 |
| Frontend    | React 18 + TypeScript + Vite 6; map component in plain JSX with Three.js r184 |
| State       | React local state inside the TimeMap component; map data loaded once from the API into `features/timemap/data.ts` |
| Auth        | None for visitors (public, read-only). JWT helpers and `X-Admin-Key` admin auth are scaffolded for Phase 3 |
| Data        | PostgreSQL 16 tables `sources`, `records`, `basemap_countries`, `basemap_insets`; seeded from `backend/app/seed_data/*.json` on first start |
| Deploy      | Docker Compose (db + backend + frontend nginx). Target server medusa on 127.0.0.1:8109/8110 behind a Cloudflare tunnel; local defaults 3000/8000 |
| Fonts       | DM Sans + Playfair Display, self-hosted via Fontsource (bundled by Vite) |
| Rate limit  | slowapi with Cloudflare-aware IP resolution             |

<!--
  Add rows as your stack grows. Examples:
  | i18n        | react-i18next (10 EU languages)                         |
  | Messaging   | Matrix/Synapse (self-hosted homeserver)                  |
  | Backups     | prodrigestivill/postgres-backup-local (Docker sidecar)   |
-->

## Project Structure

```
echo-timemap/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app: CORS, gzip, rate limiting, /health, migrations + seed on startup
│   │   ├── core/                # config, database, security, rate_limit
│   │   ├── models/timemap.py    # Source, Record, Country, Inset + RECORD_FIELDS (short key -> column)
│   │   ├── schemas/timemap.py   # Public API response models (prototype short keys)
│   │   ├── routers/timemap.py   # GET /api/v1/sources, /records, /records/{id}, /basemap
│   │   ├── services/seed.py     # Loads seed_data into the DB (auto on empty DB; CLI with --reset)
│   │   └── seed_data/           # sources.json, records.json, countries.json, insets.json
│   ├── scripts/
│   │   └── extract_prototype_data.py  # Rebuilds seed_data from a prototype .jsx
│   ├── alembic/versions/        # 33d890b0e3d2_timemap_tables.py
│   ├── tests/                   # pytest (sqlite, no Docker)
│   ├── requirements.txt
│   ├── .dockerignore            # Keeps .venv and caches out of the image
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx             # Entry; imports self-hosted fonts
│   │   ├── App.tsx              # Router: "/" renders TimeMapPage
│   │   ├── api/client.ts        # fetch wrapper for /api/v1
│   │   ├── features/timemap/
│   │   │   ├── TimeMapPage.tsx  # Loads data + map chunk in parallel; loading and error screens
│   │   │   ├── data.ts          # Fetches sources/records/basemap; exposes them as live module bindings
│   │   │   ├── TimeMap.jsx      # The prototype component, reading its data from ./data
│   │   │   └── TimeMap.d.ts     # Type declaration so TS can import the JSX component
│   │   ├── components/
│   │   └── pages/
│   ├── index.html
│   ├── nginx.conf               # Serves the build, proxies /api and /uploads to backend
│   ├── .dockerignore            # Keeps local node_modules and dist out of the image
│   └── Dockerfile
├── data/
│   └── reference/               # sites.csv, institutions.csv as exported with the prototype (see TODO)
├── docs/
│   ├── API.md                   # Complete API endpoint reference
│   ├── TODO.md                  # Future features & pending tasks
│   ├── PROGRESS.md              # Implementation progress checklist
│   ├── STYLEGUIDE.md            # Visual design cheatsheet
│   ├── SERVER-INFRASTRUCTURE.md # This app's ports, containers, volumes
│   └── research/                # Package research, analysis & deployment guides, WCAG audit
├── docker-compose.yml
├── Makefile
└── .env.example
```

<!--
  Keep this tree updated as the project grows. This is the map.
  Anyone reading the project for the first time will use this to orient themselves.
-->

## Architecture Notes

- **The map is one React component.** `frontend/src/features/timemap/TimeMap.jsx` is the data team's prototype (`5d-timemap-v2.jsx`) with its inline data arrays removed. It holds the UI and the Three.js scene. Fonts are imported in `main.tsx` from Fontsource packages.
- **Data source of truth:** the PostgreSQL tables. On first start, when `sources` is empty, the backend loads `backend/app/seed_data/*.json` (extracted from the prototype by `backend/scripts/extract_prototype_data.py`). `make seed-reset` wipes the TimeMap tables and reloads the seed files. The CSVs in `data/reference/` were exported separately and do not match the seed data (see TODO).
- **Data loading in the frontend:** `TimeMapPage` fetches `/sources`, `/records` and `/basemap` and downloads the map chunk at the same time. It then calls `setTimemapData()` and renders `<TimeMap />`. `data.ts` exports `SOURCES`, `RECORDS`, `SITE_RECORDS`, `POINT_RECORDS`, `EU_MAP` and `INSETS` as `let` bindings; ES module exports are live, so `TimeMap.jsx` reads them exactly as it read the old inline constants. The data is set once, before the component mounts.
- **Record shape:** the API returns records with the prototype's short keys (`n`, `c`, `la`, `sy` ...). `RECORD_FIELDS` in `backend/app/models/timemap.py` maps each short key to a named column. Null fields are left out of responses.
- **Record ids** follow the prototype scheme `<src>-<index>` (`unesco-0`, `nemo-23`, `echo-14`); `seq` keeps the original display order.
- **Source registry:** the `sources` table (label, kind `site` or `point`, marker shape, color, default on, panel order). Point sources without a color get one from the fallback palette in `data.ts`.
- **Time model:** `sy`/`ey` are start/end years, negative = BCE. Column height encodes origin age on a square-root curve between 5000 BCE and 2025 CE (`HMIN`, `HMAX`).
- **No third-party requests at runtime.** The built site loads nothing from outside its own origin. External URLs (UNESCO listings, museum sites) are click-through links only.
- **Backend pattern:** Routers -> Services -> Models. All routes under `/api/v1/`, health at `/health`. Public routes are read-only, rate-limited to 120 requests/minute per client IP, gzip-compressed, and sent with `Cache-Control: public, max-age=300`.
- **Production traffic:** visitor -> Cloudflare tunnel -> frontend nginx (`127.0.0.1:8109` on medusa) -> static build; `/api/*` and `/uploads/*` proxied to `backend:8000` on the Docker network. Both published ports are bound to `127.0.0.1`.
- **Database:** `postgres:16-alpine` container, internal only, volume `pgdata`. Migrations run on backend startup, followed by the seed check.

## API Documentation

**Current Status:** 5 endpoints across 2 domains

**Resources:**
- [API Reference](docs/API.md) - Complete endpoint list with examples
- [Swagger UI](http://localhost:8000/docs) - Interactive docs (when backend is running)

<!--
  Update the endpoint/domain count as the API grows.
-->

## Development Progress

See [docs/PROGRESS.md](docs/PROGRESS.md) for the full implementation checklist.

**Current status**:
- 🚧 **Phase 1 in progress** -- Prototype runs inside the platform with self-hosted fonts; server deployment pending
- ✅ **Phase 2 complete** -- Data in PostgreSQL, public read API, map loads from the API, museum coordinates corrected

<!--
  Keep this section as a quick snapshot. The full details live in PROGRESS.md.
  Example:
  - ✅ **Phase 1 complete** -- Auth, navigation, directories
  - 🚧 **Phase 2 in progress** -- File sharing, messaging
-->

## Documentation

All documentation starts on this README and lives in .md files for robustness. Your memory WILL fail, and AI WILL compress and forget certain stuff. That is why every step from research, architecture, structure, installation, development and deployment must absolutely live in the DOCS.

Before coding, read this and all documents. New library/package? Check docs/research/. New feature? Update PROGRESS.md and flag any open items to the user. Setup or deployment changes? Create or update a -deployment.md file in docs/research/. API change? Update API.md. UI changes? Follow STYLEGUIDE.md patterns.

- [API.md](docs/API.md) -- Complete API endpoint reference
- [STYLEGUIDE.md](docs/STYLEGUIDE.md) -- Colors, typography, component patterns
- [PROGRESS.md](docs/PROGRESS.md) -- What's built, what's next. Go-to place to track all features developed and in development.
- [TODO.md](docs/TODO.md) -- Future features and pending tasks. All TODOs must be added here always, no questions asked, no "I will add it in a minute" excuses. We do not trust AI context. It gets shrunk at weird intervals, and we don't trust it retains all TODOs. So just document it there.
- [Package Research Guide](docs/research/RESEARCH.md) -- Index of all research, analysis & deployment docs. Explains the 3-stage pipeline (research -> analysis -> deployment) and how to evaluate packages for consistency and interoperability.
  - [Analysis docs](docs/research/) -- Package/Library specific docs generated using the above guide, rationale behind choosing the pack/lib.
  - [Deployment docs](docs/research/) -- Deployment instructions and bug/troubleshooting docs for any feature that has passed the Analysis stage.

### After deploying a feature, update docs in this order:

1. **README.md** -- Tech Stack table, Project Structure tree, Architecture Notes, Development Progress
2. **[PROGRESS.md](docs/PROGRESS.md)** -- Check off completed items, add new sub-items if needed
3. **[TODO.md](docs/TODO.md)** -- when finding TODOs already completed
4. **[API.md](docs/API.md)** -- If endpoints were added, changed, or removed
5. **[docs/research/RESEARCH.md](docs/research/RESEARCH.md)** -- If new analysis or deployment docs were created, update the tables
6. **Relevant deployment doc** in docs/research/ -- Update status, add known issues, troubleshooting

This is not optional. Context gets compressed, memory gets lost, sessions end. The docs are the only thing that survives. Update them before you consider a feature "done".

PS: Remember the mantra: "Every piece of code created must conform to the documentation and libraries we are using. Creating code without first looking at the libraries doc pages on their repos is super risky, and leads to spaghettification of code. Unacceptable and totally avoidable. Always read the docs!"
