# TimeMap Frontend -- Deployment

**Status:** In progress. Full stack verified in the sandbox 2026-11-05; server deployment pending.

## How the map is integrated

- `frontend/src/features/timemap/TimeMap.jsx` is the data team's `5d-timemap-v2.jsx` with four changes:
  1. The Google Fonts `<link href="https://fonts.googleapis.com/css2?...">` line is removed.
  2. The inline constants `SITES`, `INSTS`, `ECHO_ORGS`, `EU_MAP`, `INSETS`, the `SOURCES` registry, `SRC_FALLBACK` and the derived `RECORDS`, `SITE_RECORDS`, `POINT_RECORDS` are removed and imported from `./data`.
  3. The header count reads `SITE_RECORDS.length` (402, the UNESCO records) where it read `SITES.length`.
  4. Selecting a record flies the camera to `sceneXZ(sel)` for every source. The prototype used raw coordinates for point sources, which sent overseas museums (Güímar, Tenerife) to an empty stretch of ocean instead of their inset tile.
- `frontend/src/features/timemap/data.ts` fetches `/api/v1/sources`, `/api/v1/records` and `/api/v1/basemap`, rebuilds the registry (including fallback colors for point sources without a color) and exposes the data as live `let` exports.
- `frontend/src/features/timemap/TimeMapPage.tsx` starts the data fetch and the lazy import of `TimeMap.jsx` together, calls `setTimemapData()`, then renders `<TimeMap />`. While loading it shows "Loading map data…" in a `role="status"` region; on failure it shows the error in a `role="alert"` region with a "Try again" button. Both screens follow the stored theme (`tm-theme`) or the OS preference.
- `frontend/src/features/timemap/TimeMap.d.ts` declares the default export so strict TypeScript (`make check`) accepts the JSX import.
- `frontend/src/App.tsx` renders `<TimeMapPage />` at `/`.
- `frontend/src/main.tsx` imports `@fontsource/dm-sans` weights 300, 400, 500, 600, 700 and `@fontsource/playfair-display` weights 500, 700. Vite bundles the font files into `dist/assets/`.
- `frontend/index.html` sets `html,body,#root{height:100%;margin:0}` and `body{background:#070a12}`, as in the prototype page.
- Packages: `three@^0.184.0` (r184, same revision as the prototype bundle), `@fontsource/dm-sans@^5.1.0`, `@fontsource/playfair-display@^5.1.0`.

## Verification (2026-11-05, sandbox)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (`make check`) | Pass |
| `npm run build` | Pass; `index-*.js` 185.82 kB (61.59 kB gzip), `TimeMap-*.js` 585.67 kB (153.14 kB gzip) loaded on demand |
| `make test` (backend pytest) | 8 passed |
| Full Docker stack on ports 3300/8300, fresh `pgdata` | Backend migrated and seeded on first start; page requests `/api/v1/sources`, `/api/v1/records`, `/api/v1/basemap` through nginx |
| Chromium render through nginx | Canvas present, 403 table rows (402 sites + header), header "402 sites · 107 institutions", zero console errors, zero third-party requests |
| Screenshot diff vs prototype HTML at 1440x900 | Map view: 105 of 1,296,000 pixels differ by more than 40/255 (anti-aliasing) |
| Detail panel (Hallstatt-Dachstein) vs prototype | Panel region: 28 pixels differ; header and filters: 11; 3D scene differs while the camera flies to the selection |
| Backend stopped | Page shows "The map data could not be loaded. Bad Gateway" with a "Try again" button |

The Docker images were built in a sandbox whose outbound proxy required its CA certificate inside the build; that was added to a throwaway copy only. The project Dockerfiles are the scaffold originals.

## Local run

1. **Dev machine, terminal, project root:** `cp .env.example .env`
2. **Dev machine, terminal, project root:** `make frontend-install`
3. **Dev machine, terminal, project root:** `make dev` (starts db + backend in Docker, seeds the database on first start, runs Vite in the foreground)
4. **Dev machine, browser:** open `http://localhost:5173`

## Server deploy

Target server: medusa. Ports, tunnel and paths are in [SERVER-INFRASTRUCTURE.md](../SERVER-INFRASTRUCTURE.md).

1. **medusa, terminal:** clone the private repo into `~/Repositories/echo-timemap` with a read-only deploy key, then `cd` into it.
2. **medusa, terminal:** `cp .env.example .env && chmod 600 .env`
3. **medusa, terminal:** before the first start, run `openssl rand -hex 32` three times; put the values into `.env` as `SECRET_KEY`, `ADMIN_API_KEY` and `POSTGRES_PASSWORD`, and put the same password inside `DATABASE_URL`.
4. **medusa, editor:** in `.env`, set `FRONTEND_PORT=8109`, `BACKEND_PORT=8110` and `ALLOWED_ORIGINS=https://<public hostname>`.
5. **medusa, terminal:** `make deploy`
6. **medusa, terminal:** `sudo docker compose logs backend | grep -E "seed loaded|migration failed|seeding failed"` and expect `TimeMap seed loaded: {'sources': 3, 'records': 509, 'countries': 38, 'insets': 8}`
7. **medusa, terminal:** `curl -s http://127.0.0.1:8110/health` and expect `{"status":"healthy","version":"0.1.0"}`
8. **medusa, terminal:** `curl -s http://127.0.0.1:8109/api/v1/sources` and expect three sources: `unesco`, `nemo`, `echo`
9. **Cloudflare dashboard:** Networking > Tunnels > the healthy medusa tunnel > Routes > Add route > Published application, with Service URL `http://127.0.0.1:8109`. Confirm the hostname has a proxied CNAME to `<tunnel-id>.cfargotunnel.com`. Do not use the "add an application" wizard; it creates a new, inactive tunnel.
10. **Browser:** open the public URL; confirm the map renders and the devtools Network tab lists only requests to the site's own origin. If `static.cloudflareinsights.com` appears, turn off Cloudflare Web Analytics for this hostname.

## Known issues

- Map chunk above Vite's 500 kB warning threshold (see TODO).
- No security headers yet in `frontend/nginx.conf` (see TODO).
