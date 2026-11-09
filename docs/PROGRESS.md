# Implementation Progress

Multi-phase build plan for echo-timemap. Each phase produces a runnable increment. ALL DEVELOPMENT MUST CONFORM WITH THE RELATED LIBRARIES AND DATABASE SCHEMES. ALWAYS SEARCH FOR THE PROPER DOCUMENTATION OF LIBRARIES AND READ THEM TO MAKE SURE THE CODE CONFORMS TO WHAT THE LIBRARIES EXPECT.

---

## Phase 1: Prototype on the platform **IN PROGRESS**

<!--
  STATUS options: NOT STARTED / IN PROGRESS / COMPLETE
-->

### Backend
- [x] FastAPI + PostgreSQL + Alembic scaffold, notifications removed
- [x] `/health` endpoint with passing pytest (`make test`)
- [ ] Generate production `.env` on the server (`SECRET_KEY`, `ADMIN_API_KEY`, `POSTGRES_PASSWORD` via `openssl rand -hex 32`)
- [x] Stop publishing the backend port on the server's external interfaces (backend and frontend bound to `127.0.0.1`; only the tunnel route faces the public)

### Frontend
- [x] Prototype `5d-timemap-v2.jsx` mounted unchanged as `src/features/timemap/TimeMap.jsx` at route `/`
- [x] Google Fonts link removed; DM Sans (300-700) and Playfair Display (500, 700) self-hosted through Fontsource
- [x] Body margin reset in `index.html` to match the prototype page
- [x] `make check` and `npm run build` pass; production build renders in Chromium with zero console errors and zero third-party requests, matching the prototype screenshot (104 of 1,296,000 pixels differ, anti-aliasing)
- [x] Full Docker stack (db, backend, frontend nginx) builds and serves the map with `/api` proxied to the backend
- [ ] Security headers in `frontend/nginx.conf` (CSP, `X-Content-Type-Options`, `Referrer-Policy`)
- [ ] WCAG 2.2 AA re-audit of the v2 component (existing audit covers the earlier a11y build)

### Deploy
- [x] Choose server and ports: medusa, 8109 and 8110, recorded in `docs/SERVER-INFRASTRUCTURE.md`
- [ ] Assign the public hostname and record it in `docs/SERVER-INFRASTRUCTURE.md`
- [ ] Add the hostname as a published application route on medusa's Cloudflare tunnel and to `ALLOWED_ORIGINS`
- [ ] `make deploy` on the server; verify the map loads on the public URL

---

## Phase 2: Data in PostgreSQL + public read API **COMPLETE**

### Backend
- [x] Models and migration for `sources`, `records`, `basemap_countries`, `basemap_insets` (`alembic/versions/33d890b0e3d2_timemap_tables.py`)
- [x] `scripts/extract_prototype_data.py` extracts the prototype arrays into `app/seed_data/*.json` (3 sources, 509 records, 38 countries, 8 insets)
- [x] Seed loads on first start when the DB is empty; `make seed-reset` reloads; restart leaves data untouched
- [x] `GET /api/v1/sources`, `/api/v1/records` (`?src=`, `?country=`), `/api/v1/records/{id}`, `/api/v1/basemap`; rate-limited, gzip, 5-minute cache header
- [x] Tests: seed counts, idempotent seed, API output equal to seed files, filters, 404, basemap (`make test`, 8 passed)
- [x] API output on PostgreSQL compared with the original prototype file: 509 of 509 records equal, basemap and insets identical
- [x] Corrected 26 museum coordinates (9 wrong-city geocodes, 17 capital fallbacks) via OpenStreetMap/Nominatim, `gx` = `nominatim` (`scripts/geocode_applied.json`)
- [x] Startup migration runs with the backend's own interpreter (`sys.executable`), so it also works outside Docker

### Frontend
- [x] `TimeMapPage` loads sources, records and basemap from the API, with a loading state (`role="status"`) and an error state (`role="alert"`, retry button)
- [x] Inline data arrays removed from `TimeMap.jsx`; it reads from `data.ts` (other changes: header count uses `SITE_RECORDS.length`; camera fly-to uses `sceneXZ` for every source so overseas museums fly to their inset tile)
- [x] Three.js and the map split into a lazy chunk: first load 185.82 kB JS (61.59 kB gzip), map chunk 585.67 kB (153.14 kB gzip), was 1,011.16 kB in one file
- [x] Map rendered through the Docker stack matches the prototype screenshot (105 of 1,296,000 pixels differ); detail panel matches (28 pixels)

---

## Phase 3: Admin API + data import **NOT STARTED**

### Backend
- [ ] `/admin/*` routes with `X-Admin-Key` (sources, CSV import, record edit/delete)
- [ ] CSV import validates years (negative = BCE), coordinates, and required fields per source kind

### Frontend
- [ ] `_adminPanel` integration for record editing and source import

---

## Phase 4: Threads and related links **NOT STARTED**

### Backend
- [ ] Wikidata ID per record; relations by place, period and thread (movement, style, person, route)
- [ ] `GET /api/v1/records/{id}/related` returning same place / same time / same thread lists

### Frontend
- [ ] Related panel in the detail view (three short lists)
- [ ] Follow-a-thread mode: path across the map with the timeline moving along it

---

<!--
  Add more phases as needed. Keep the pattern:

  ## Phase N: Name **STATUS**
  ### Backend
  - [ ] / [x] Task description
  ### Frontend
  - [ ] / [x] Task description

  When a phase is done, mark it **COMPLETE** and check off all items.
  When infrastructure work doesn't fit a phase, add a standalone section:

  ## Infrastructure: {{Feature Name}} **COMPLETE**
  - [x] Task description
  **Documentation:** [deployment-doc.md](research/deployment-doc.md)

  Tips:
  - Break phases into backend/frontend sections
  - Each checkbox should be a concrete, verifiable deliverable
  - Link to deployment docs when a feature ships
  - Don't delete completed phases -- they're the project history
-->
