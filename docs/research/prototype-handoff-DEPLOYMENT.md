# 5D TimeMap — Deployment Handoff

**File to deploy:** `5d-timemap-v2.html` (~1 MB, single file)
**Date:** 2026-11-02 · Contact: collaborator@futurity.systems

---

## TL;DR

It's a **self-contained static web page**. There is no backend, no database, no API keys, no build step required to run it. Put the one HTML file on any web server (or static host) and it works. Everything — the app code (React + Three.js) and all the data — is bundled inside that single file.

Minimum viable deploy:

```
# copy the file to the web root, optionally as index.html
cp 5d-timemap-v2.html /var/www/echo-timemap/index.html
# serve it over HTTPS with any static server (nginx/apache/caddy/S3/etc.)
```

Open it in a browser and you're done.

---

## What it is

- A single-page 3D WebGL application (React 18 + Three.js), compiled to one `.html` file with all JavaScript **inline**.
- All content is embedded as JSON inside the file: 402 UNESCO World Heritage sites, 92 NE-MO museums, 15 ECHO consortium partners, plus the base-map geometry and overseas-island coastlines.
- **No server-side runtime.** It never calls back to an API — there are zero `fetch` / XHR / WebSocket calls. It is a pure static asset.

## Requirements

- **Any static web server** (nginx, Apache, Caddy, S3 + CloudFront, Netlify, GitHub Pages, an internal box — all fine). No Node, PHP, Python, or DB on the server.
- **A modern browser with WebGL** on the client (Chrome, Firefox, Safari, Edge; desktop and mobile). WebGL is the only hard client requirement.
- Serve with `Content-Type: text/html; charset=utf-8` (any normal server does this automatically for `.html`).
- **HTTPS recommended** (it loads a font stylesheet over https; serving the page over http would be a mixed-content warning).

## External dependencies (only one, and it's optional)

The page loads **Google Fonts** at runtime from `fonts.googleapis.com` / `fonts.gstatic.com` (DM Sans + Playfair Display). This is purely cosmetic — if that domain is blocked or the box is offline, the map still works and falls back to system fonts.

For a fully offline / air-gapped / no-third-party deployment, self-host the two fonts: download the WOFF2 files, add an `@font-face` block, and remove the `<link href="https://fonts.googleapis.com/...">` that the app injects. (Happy to produce a self-hosted-fonts build on request.)

The external `https://whc.unesco.org/...` and museum URLs in the file are **click-through links** in the detail panel (opened in a new tab by the user), not load-time dependencies.

## Content-Security-Policy note (read this if you enforce CSP)

Because the whole app is a single **inline `<script>`** (and uses inline styles), a strict CSP will block it unless you allow inline code or add a hash/nonce. A working policy:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src  'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src   https://fonts.gstatic.com;
  img-src    'self' data:;
  connect-src 'self';
```

If you prefer not to use `'unsafe-inline'` for scripts, add the script tag's SHA-256 hash to `script-src` instead — ask and I'll generate a build with a nonce/hash or externalized JS.

## Client-side storage

The app uses `localStorage` for exactly one thing: a key named `tm-theme` that remembers the viewer's light/dark choice. No cookies, no tracking, no personal data stored.

## Caching & updates

- It's a ~1 MB static file. Set a sensible cache header (e.g. `Cache-Control: public, max-age=3600`).
- To push an update, **replace the one file**. Cache-bust so viewers get the new version — either version the filename (`5d-timemap-v2.3.html`) or append a query string (`index.html?v=20261102`).

## Accessibility / compliance

The build targets **WCAG 2.2 AA** (keyboard operable, screen-reader text alternative, visible focus, contrast). The audit is in `wcag-audit-5d-timemap.md` in this folder — relevant since this is ECHO deliverable D5.6, a public Creative Europe output.

---

## Source & rebuilding (only if the engineer will modify it)

Deployment does **not** require any of this — the HTML is ready to serve. This is only for future edits.

- **`5d-timemap-v2.jsx`** (in this folder) is the full React source: one component, `export default TimeMap`, with all data inlined. React 18 + Three.js, no other app dependencies.
- To rebuild the HTML from source:

```bash
npm install react react-dom three esbuild        # pin versions you prefer
# create entry.jsx:
#   import { createRoot } from "react-dom/client";
#   import TimeMap from "./5d-timemap-v2.jsx";
#   createRoot(document.getElementById("root")).render(<TimeMap />);
npx esbuild entry.jsx --bundle --minify --format=iife --jsx=automatic \
  --define:process.env.NODE_ENV='"production"' --outfile=bundle.js
# then wrap bundle.js in a minimal HTML shell with <div id="root"></div>
```

- To change the **data** (add sites, update museum years, add ECHO partners), edit the `SITES` / `INSTS` / `ECHO_ORGS` arrays near the top of the `.jsx` and rebuild. The editable data is also exported as `sites.csv` and `institutions.csv` in this folder for reference, though the live source of truth is currently the arrays inside the file.

## Do not deploy these (same folder, not the public map)

- `5d-timemap-topo.html` / `-topo-src.jsx` — the topographic/terrain **experiment**, a separate prototype, not the deliverable.
- `5d-timemap-a11y.html` / `.jsx` — an earlier version, superseded by `v2`.
