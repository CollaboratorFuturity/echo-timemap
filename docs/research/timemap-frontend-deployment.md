# TimeMap Frontend -- Deployment

**Status:** Deployed 2026-11-09. Live at https://5dtimemap.echoimmersive.eu on medusa. Security headers and the WCAG 2.2 AA re-audit are still open (see TODO).

## How the map is integrated

- `frontend/src/features/timemap/TimeMap.jsx` is the data team's `5d-timemap-v2.jsx` with five changes:
  1. The Google Fonts `<link href="https://fonts.googleapis.com/css2?...">` line is removed.
  2. The inline constants `SITES`, `INSTS`, `ECHO_ORGS`, `EU_MAP`, `INSETS`, the `SOURCES` registry, `SRC_FALLBACK` and the derived `RECORDS`, `SITE_RECORDS`, `POINT_RECORDS` are removed and imported from `./data`.
  3. The header count reads `SITE_RECORDS.length` (402, the UNESCO records) where it read `SITES.length`.
  4. Selecting a record flies the camera to `sceneXZ(sel)` for every source. The prototype used raw coordinates for point sources, which sent overseas museums (Güímar, Tenerife) to an empty stretch of ocean instead of their inset tile.
  5. The camera controls were redone on 2026-11-18: left-drag pans, right-drag rotates, elevation is locked at 45°, the view opens north-up. The prototype had left-drag orbit with free elevation and Shift-drag pan. See [Camera and pointer controls](#camera-and-pointer-controls).
- `frontend/src/features/timemap/cameraRig.js` holds the camera math (orbit state to camera pose, grab-the-ground pan, keyboard steps) so it can be checked without the component.
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

## Camera and pointer controls

Added 2026-11-18. Code: `TimeMap.jsx` (state `orbit`, handlers `pd`, `pm`, `pu`, `pc`, `pl`, `ctxMenu`, `wheel`, `onCanvasKey`) and `cameraRig.js` (math).

### Camera model

The camera state is `orbit = { theta, phi, dist, tx, tz }`. The camera always looks at `(TGT_X + tx, 4.5, TGT_Z + tz)` from `dist` away.

| Field | Meaning | Value |
|-------|---------|-------|
| `theta` | Rotation in radians. 0 puts the camera due south of the target, so north is up the screen and east is right | Starts at 0 (was -0.7 in the prototype) |
| `phi` | Elevation above the horizon | Fixed at `TILT` = 45° (the prototype started at 35.5° and let the user change it, 6.9° to 83.1°). No input changes it |
| `dist` | Distance from the look-at point | Starts at 74; limited to 22 to 150 |
| `tx`, `tz` | Look-at offset from the base target, in scene units | Starts at 0; unbounded |

At 45° elevation and 38° vertical field of view, every pixel of the canvas sees the map surface, so the cursor ray always meets the ground.

### Inputs

| Input | Effect |
|-------|--------|
| Left-drag (mouse, pen or one finger) | Pans. The map surface point under the cursor when the drag began stays under the cursor ("grab the ground", plane at `y = SURF`). Markers above the surface drift relative to the cursor, as in any perspective view |
| Right-drag; Alt+left-drag; Ctrl+left-drag | Rotates around the look-at point, 0.005 rad per horizontal pixel. Vertical movement is ignored. Alt and Ctrl are there for trackpads without a right button |
| Click on a marker | Selects it when the button is released. Clicking the selected marker again deselects it. A press that moves less than 4 px (10 px for touch) is a click; more than that is a drag |
| Click on empty ground | Nothing. It does not deselect; use the × button |
| Drag that starts on a marker | Pans. It does not select |
| Right-click on a marker | Nothing |
| Wheel over the canvas | Zooms: 0.06 distance per wheel delta unit |
| Keys, canvas focused | Arrows pan along the screen axes (3% of the distance per press). Shift+Left/Right rotates 0.12 rad. Shift+Up/Down do nothing. + / = and - / _ zoom by 4 |
| Touch | One finger pans or taps. A second finger is ignored. There is no pinch and no rotate |

Selecting a record still flies the look-at point to it (`flyRef`, unchanged). Starting a drag or pressing a canvas key cancels the fly.

### Rules the handlers follow

- Only events that start on the canvas (or its wrapper) drive the camera. The sites list and the help dialog sit inside the same element and keep their own clicks, drags and scrolling.
- A drag uses pointer capture, so it keeps working when the cursor leaves the canvas. It ends on release, on `pointercancel` and on `lostpointercapture`. Only the pointer that started the drag counts.
- Pan is computed against a frozen copy of the camera taken when the drag starts (`snapshotCamera`), so several pointer events between frames cannot add up.
- `contextmenu` is suppressed on the canvas only. While a pointer is captured the browser sends `contextmenu` to the wrapper, which is why the wrapper counts as the canvas.
- The wheel listener is a native non-passive listener. React registers `onWheel` as passive, where `preventDefault()` is ignored and logs "Unable to preventDefault inside passive event listener" to the console. One effect of the fix: over the canvas, Ctrl+wheel and trackpad pinch now zoom the map and no longer zoom the browser page.

### Verification (2026-11-18)

| Check | Result |
|-------|--------|
| Camera math (Node, `three`, 2,000 random views at 45°) | After a pan the grabbed ground point sits within 1e-13 (normalized screen units) of the cursor; same cursor position gives the same offset; the horizon is never in view at any zoom; `placeCamera` equals the old inline formula; arrow steps move the view the right way at four rotations; at theta 0 north is straight up and east is right; elevation measures 45.00° |
| `npx tsc --noEmit`, `npm run build` | Pass; `TimeMap-*.js` 586.86 kB (152.70 kB gzip) |
| Browser, 49 checks (headless Google Chrome on macOS, software WebGL, built site, API served from the seed files) | 49 passed: pan, rotate, Alt/Ctrl rotate, click and select on release, drag from a marker, 2 px wobble, right-click, context menu suppressed, capture outside the canvas, no stuck drag, help dialog and sites list still clickable, wheel, keyboard, Tab leaves the canvas, touch tap and drag, second finger ignored, hover tooltip, zero console errors, zero third-party requests |
| Screenshots at 1440x900 | North up at 45°; right-drag rotates the whole scene |

Not covered: Safari and Firefox, a real GPU, real trackpad and touch hardware (touch was emulated through the Chrome DevTools protocol), screen readers, and the production server. The Docker stack was not used for this run (Docker Desktop was not running); the page was served from `dist/` with an API mock built from `backend/app/seed_data/`. The test scripts are not in the repository (see TODO: no frontend tests).

### Known limits

See TODO for each item.

- No on-screen buttons for pan, rotate or zoom. WCAG 2.5.7 (dragging) needs a single-pointer alternative, and keyboard keys do not count. 2.5.1 (pointer gestures) will need the same if pinch-zoom is added.
- Touch users cannot rotate or zoom (no right button, no pinch, no buttons).
- The wheel ignores `deltaMode` and the trackpad pinch scale.
- Rotation pivots on the screen center. After panning away from the selected marker it no longer pivots on that marker.
- The look-at height is fixed at 4.5 while markers stand between 1.0 and 16.2.
- There is no "reset view" control.
- The timeline slider still sets the year on pointer-down (WCAG 2.5.2).

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
5. **medusa, terminal:** `sudo docker compose up -d --build`
6. **medusa, terminal:** `sudo docker compose logs backend | grep -E "seed loaded|migration failed|seeding failed"` and expect `TimeMap seed loaded: {'sources': 3, 'records': 509, 'countries': 38, 'insets': 8}`
7. **medusa, terminal:** `curl -s http://127.0.0.1:8110/health` and expect `{"status":"healthy","version":"0.1.0"}`
8. **medusa, terminal:** `curl -s http://127.0.0.1:8109/api/v1/sources` and expect three sources: `unesco`, `nemo`, `echo`
9. **Cloudflare dashboard:** Networking > Tunnels > the healthy medusa tunnel > Routes > Add route > Published application, with Service URL `http://127.0.0.1:8109`. Confirm the hostname has a proxied CNAME to `<tunnel-id>.cfargotunnel.com`. Do not use the "add an application" wizard; it creates a new, inactive tunnel.
10. **Browser:** open the public URL; confirm the map renders and the devtools Network tab lists only requests to the site's own origin. If `static.cloudflareinsights.com` appears, turn off Cloudflare Web Analytics for this hostname.

## Known issues

- Map chunk above Vite's 500 kB warning threshold (see TODO).
- No security headers yet in `frontend/nginx.conf` (see TODO).
- Camera controls have no on-screen equivalents and no touch rotate or zoom (see [Known limits](#known-limits)).
