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

- [x] **[Infra] Backend port exposed on the host** DONE (2026-11-09) -- `docker-compose.yml` now binds the backend and frontend ports to `127.0.0.1`. See [SERVER-INFRASTRUCTURE.md](SERVER-INFRASTRUCTURE.md).
- [x] **[Data] Museum coordinates corrected** DONE (2026-11-05) -- 26 NE-MO records re-geocoded with OpenStreetMap (Nominatim), each hit checked against the institution's address: 9 photon errors placed in the wrong city and all 17 `capital_fallback` records. `gx` = `nominatim`; `ci` filled in. Güímar (Tenerife) flagged `ov` so it draws on the Canary Islands tile. Provenance: `backend/scripts/geocode_applied.json`. See [timemap-api-deployment.md](research/timemap-api-deployment.md).
- [x] **[Privacy] Google Fonts removed** DONE (2026-11-05) -- Fonts self-hosted via `@fontsource/dm-sans` and `@fontsource/playfair-display`, imported in `frontend/src/main.tsx`. Built site makes zero third-party requests. See [timemap-frontend-deployment.md](research/timemap-frontend-deployment.md).
