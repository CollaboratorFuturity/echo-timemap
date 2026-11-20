# TODO - Future Features & Tasks

> Track pending features and tasks that are not part of the current phase roadmap.

For the reader, human or machine, know this: Memory is a beautiful, complex, amazing, and rather fragile thing. Don't stress yourself by overloading this precious gift from evolution with data that will not live on. Be true to yourself. All TODOs must absolutely completely quickly be added to this file.
Otherwise it will be forgotten during your sleep tonight, or during your next context compression.

Whenever visiting this page to look for info on how to perform a task, remember the mantra: "Every piece of code created must conform to the documentation and libraries we are using. Creating code without first looking at the libraries doc pages on their repos is stupid, and leads to spaghettification of code. Unacceptable and totally avoidable. Always read the docs! They usually are on the research/ folder."

---

## Pending

<!--
  Format: - [ ] **[Category] Short title** -- Description with enough context to act on it later.
  Include file paths, function names, or links to relevant code when possible.
  Examples:

  - [ ] **[UI] Dark mode text contrast** -- Selected items in dropdown turn dark on dark mode, making text illegible. After selecting, text should stay white. File: `frontend/src/features/messaging/components/ChannelList.tsx`
  - [ ] **[API] Rate limiting** -- No rate limiting on auth endpoints. Add per-IP throttling to `/auth/login` and `/auth/forgot-password`.
  - [ ] **[Infra] CI/CD pipeline** -- No automated tests or builds on push. Set up GitHub Actions with lint + test + build stages.
-->

- [ ] **[A11y] On-screen camera controls** -- WCAG 2.5.7 Dragging Movements is not met: pan and rotate work only by dragging or keys, and keys do not count as a single-pointer alternative. Add a small control cluster (pan arrows, rotate left/right, zoom +/-, reset view) with the `T` tokens, the existing focus ring and targets of at least 28 px, and update the four places that describe the controls (`TimeMap.jsx` header hint, help dialog, canvas `aria-label`; `docs/STYLEGUIDE.md`). It also gives touch users rotate and zoom, which they lack today, and covers 2.5.1 if pinch is added. See the [audit addendum](research/wcag-audit-5d-timemap.md) and [Known limits](research/timemap-frontend-deployment.md#known-limits).
- [ ] **[A11y] Timeline acts on pointer-down** -- The seek slider sets the year on `pointerdown` (the `onPointerDown` on the `role="slider"` element in `TimeMap.jsx`), which WCAG 2.5.2 allows only if essential. Pressing on the canvas also stops a running fly-to on pointer-down. Decide whether either should move to pointer-up.
- [ ] **[Frontend] Camera follow-ups** -- (1) The wheel ignores `deltaMode` (Firefox can report lines) and the trackpad pinch scale; consider zoom-to-cursor. (2) The look-at height is fixed at 4.5 while markers stand between 1.0 and 16.2; ease it toward the selected marker. (3) Rotation pivots on the screen center, so after panning away it no longer pivots on the selected marker. (4) Over the canvas, Ctrl+wheel and trackpad pinch now zoom the map instead of the browser page; confirm that is wanted. (5) No pinch or two-finger gestures.
- [ ] **[Frontend] No frontend tests** -- `frontend/package.json` has no test runner. The camera-math check (Node) and the 49-check browser run of 2026-11-18 existed only in a session scratch directory and are not in the repository. Promote them: Vitest for `cameraRig.js`, Playwright for the pointer behavior.
- [ ] **[A11y] Audit the v2 component** -- `docs/research/wcag-audit-5d-timemap.md` audits `5d-timemap-a11y.jsx` (2026-06-08). The v2 file in `frontend/src/features/timemap/TimeMap.jsx` keeps the main features (`role="slider"`, `aria-live`, `role="application"`, `:focus-visible`) and adds a theme toggle and new panels that have no audit. Re-run the checklist against v2 before publishing as D5.6.
- [ ] **[A11y] Residual PARTIAL items** -- 1.4.10 Reflow: collapse the side panels into drawers under a narrow breakpoint. 1.4.4 Resize Text: move px font sizes to rem. Both from the audit's remediation plan.
- [ ] **[Data] Reference CSVs out of sync** -- `data/reference/institutions.csv` has 188 rows and no founding years; the database has 92 NE-MO museums with founding years (`sy`). `sites.csv` has 402 rows matching the 402 UNESCO records by count only (not verified field by field). Reconcile before any import, or regenerate the CSVs from `backend/app/seed_data/records.json`.
- [ ] **[Security] Headers on the public site** -- Add to `frontend/nginx.conf`: `Content-Security-Policy` (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'`; inline styles are needed for React `style` props and the component's `<style>` block), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. Verify the map still renders after adding.
- [ ] **[Perf] Map chunk size** -- `TimeMap-*.js` is 585.67 kB (153.14 kB gzip), almost all Three.js. Vite still warns above 500 kB. Options: import only the Three.js classes used, or raise `build.chunkSizeWarningLimit` once accepted.
- [ ] **[Frontend] Data as props** -- `TimeMap.jsx` reads its data from live module bindings in `data.ts`, set once before mount. Passing the data as props would allow reloading without a remount; needs the module-level helpers (`insetFor`, `insetXZ`) to take `INSETS` as an argument.
- [ ] **[Backend] Rate limit storage** -- slowapi keeps counters in process memory. Fine for one backend container; switch to Redis storage if the backend is scaled to several workers or containers.
- [ ] **[Docs] Analysis docs for new packages** -- Write `three-analysis.md` and `fontsource-analysis.md` in `docs/research/` using RESEARCH_TEMPLATE.md.
- [ ] **[Infra] Database backups** -- `pgdata` holds the only live copy of the data once edits start (Phase 3). Add a backup before the admin API ships; until then `backend/app/seed_data/` can rebuild it.
- [ ] **[Backend] Unused notification dependency** -- `apprise` remains in `backend/requirements.txt` from the scaffold although notifications are disabled. Remove when the requirements are next revised.

---

## Done

<!--
  Move completed items here with a date and brief note on how it was resolved.
  Format: - [x] **[Category] Short title** DONE (YYYY-MM-DD) -- Brief resolution note. Link to deployment doc if relevant.
  Examples:

  - [x] **[Infra] Automated backups** DONE (2026-03-06) -- Docker sidecar containers with daily schedule. See [postgres-backup-deployment.md](research/postgres-backup-deployment.md).
  - [x] **[UI] Notification overflow** FIXED (2026-03-04) -- Added PopoverPositioner wrapper in TopNav.tsx.
-->

- [x] **[Frontend] Camera controls: left-drag pans, right-drag rotates, 45° locked** DONE (2026-11-18) -- Requested 2026-11-17. Left-drag pans (grab the ground), right-drag or Alt/Ctrl-drag rotates, the view opens north-up at a fixed 45°, arrows pan and Shift+Left/Right rotate. Marker selection moved to pointer-up so a drag that starts on a marker pans. 49 browser checks and a camera-math check pass. See [timemap-frontend-deployment.md](research/timemap-frontend-deployment.md#camera-and-pointer-controls).
- [x] **[Frontend] Camera defects from the 2026-11-17 review** DONE (2026-11-18) -- Pan math now screen-aligned and zoom-independent; button checks and `contextmenu` suppression; pointer capture, `pointercancel` and pointer-id tracking (a second finger is ignored); non-passive wheel listener (removes a console error on every zoom); the sites list and help dialog no longer reach the camera handlers.
- [x] **[Docs] Camera controls described in four places** DONE (2026-11-18) -- Header hint, help dialog, canvas `aria-label` and the style guide updated together, with a rule in the style guide to keep them in sync. Added a camera section to the frontend deployment doc, a README architecture note and tree entry, and an addendum to the WCAG audit.
- [x] **[Infra] Backend port exposed on the host** DONE (2026-11-09) -- `docker-compose.yml` now binds the backend and frontend ports to `127.0.0.1`. See [SERVER-INFRASTRUCTURE.md](SERVER-INFRASTRUCTURE.md).
- [x] **[Data] Museum coordinates corrected** DONE (2026-11-05) -- 26 NE-MO records re-geocoded with OpenStreetMap (Nominatim), each hit checked against the institution's address: 9 photon errors placed in the wrong city and all 17 `capital_fallback` records. `gx` = `nominatim`; `ci` filled in. Güímar (Tenerife) flagged `ov` so it draws on the Canary Islands tile. Provenance: `backend/scripts/geocode_applied.json`. See [timemap-api-deployment.md](research/timemap-api-deployment.md).
- [x] **[Privacy] Google Fonts removed** DONE (2026-11-05) -- Fonts self-hosted via `@fontsource/dm-sans` and `@fontsource/playfair-display`, imported in `frontend/src/main.tsx`. Built site makes zero third-party requests. See [timemap-frontend-deployment.md](research/timemap-frontend-deployment.md).
