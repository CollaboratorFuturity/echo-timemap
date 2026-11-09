# echo-timemap -- Claude Code Instructions

## Before ANY Task

Read these docs in order before writing code:

1. **README.md** -- Tech stack, project structure, architecture, doc update checklist
2. **docs/TODO.md** -- Known issues & technical notes 
3. **docs/PROGRESS.md** -- What's built, what's in progress
4. **docs/research/RESEARCH.md** -- Index of all research, analysis & deployment docs

For feature-specific context, check the relevant docs linked from RESEARCH.md.

## Rules

- **Read official docs first.** Before using any package, library, or tool -- read its official documentation. Not your training data, not your memory. The actual docs.
- **docs/TODO.md is where all todos live.** Update all TODOS and keep theme here to work on them after finishing a main task.
- **Follow STYLEGUIDE.md** for all UI changes -- colors, typography, component patterns.
- **Follow API.md conventions** for all endpoint changes.
- **New package?** Follow the 3-stage pipeline in docs/research/RESEARCH.md: Research -> Analysis doc -> Deployment doc.
- **Do NOT run ANY git commands unless explicitly asked**

<!--
  Add project-specific rules below. Examples:
  - **When giving a docker command always add sudo** for docker build, docker compose, etc.
  - **Always use strict TypeScript** -- no `any` types.
  - **All new endpoints must have tests** before merging.
-->

- **When giving a docker command always add sudo** for docker build, docker compose, etc.
- **TimeMap.jsx is the delivered prototype.** Keep its behavior unchanged unless a task says otherwise. Any edit to it is checked against the WCAG 2.2 AA items in `docs/research/wcag-audit-5d-timemap.md`: keyboard map controls, the `role="slider"` timeline, the `aria-live` count, the screen-reader data table, focus rings, contrast tokens, 24px targets.
- **This is a public EU deliverable (ECHO D5.6, Creative Europe).** Target WCAG 2.2 AA. US English in UI text and docs.
- **No third-party runtime requests.** Fonts, scripts, styles, analytics and tiles are served from this origin. Visitor IPs must not reach third parties on page load (GDPR). Outbound links opened by the user are fine.
- **Data source of truth: the PostgreSQL tables**, seeded from `backend/app/seed_data/*.json`. Until the admin API exists, data corrections go into the seed JSON files followed by `make seed-reset`; never reintroduce inline data in `TimeMap.jsx`. The CSVs in `data/reference/` are out of sync with the seed data; reconcile before importing from them.
- **The API speaks the prototype short keys.** A new record field needs: a column in `backend/app/models/timemap.py`, an entry in `RECORD_FIELDS`, a field in `RecordOut`, and an Alembic migration.
- **`data.ts` bindings are set once, before `<TimeMap />` mounts.** Hooks in `TimeMap.jsx` with `[]` dependencies rely on this; reloading data while the map is mounted requires remounting it.
- **Years are integers, negative = BCE.** `sy`/`ey` are start/end of the active span; `og` marks ongoing. Never store years as strings or dates.
- **Coordinates are WGS84 decimal lat/lon** (`la`, `lo`). Keep the geocoding provenance field (`gx`: `photon` for automatic geocodes, `nominatim` for OpenStreetMap lookups checked by hand) on every record; a corrected coordinate gets a new provenance value.
- **New datasets go through the `sources` table** (label, kind `site`/`point`, shape, color, default on, panel order) so they get a toggle, legend row and screen-reader table automatically.
- **Public endpoints are read-only and rate-limited.** Writes live under the admin API with `X-Admin-Key`.

## After Completing a Feature

Follow the 6-step doc update checklist in README.md:

1. **README.md** -- Tech Stack, Project Structure, Architecture Notes, Development Progress
2. **PROGRESS.md** -- Check off completed items
3. **TODO.md** -- when finding TODOs already completed
4. **API.md** -- If endpoints were added, changed, or removed
5. **docs/research/RESEARCH.md** -- If new analysis or deployment docs were created
6. **Relevant deployment doc** in docs/research/ -- Update status, known issues

This is not optional. Do it before considering a feature "done".
