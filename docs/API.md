# API Reference

**Base URL:** `http://localhost:8000/api/v1`

**Interactive Documentation:** When running the backend, visit [http://localhost:8000/docs](http://localhost:8000/docs) for Swagger UI with live API testing.

---

## Overview

echo-timemap API is a RESTful API built with FastAPI. All routes are prefixed with `/api/v1/`.

**Current Status:** 5 endpoints across 2 domains

**Authentication:** Most endpoints require authentication via `Authorization: Bearer <token>` header. Public endpoints are marked with a globe icon.

For echo-timemap, every visitor-facing endpoint is public and read-only. Write operations (Phase 3) use the admin API with an `X-Admin-Key` header.

---

## Table of Contents

<!--
  List your API domains here. Examples:
  1. [Auth](#auth-apiv1auth) - Authentication & account management
  2. [Users](#users-apiv1users) - User profiles & management
  3. [Health](#health) - Health check
-->

1. [TimeMap](#timemap-apiv1) - Sources, map records, basemap
2. [Health](#health) - Health check

---

<!--
  For each domain, use this format:

  ## Domain Name (`/api/v1/domain`)

  Brief description.

  | Method | Endpoint | Description | Auth |
  |--------|----------|-------------|------|
  | `GET`  | `/endpoint` | What it does | Public / Required / Admin |
  | `POST` | `/endpoint` | What it does | Required |

  **Example:**
  ```bash
  POST /api/v1/auth/login
  Content-Type: application/json

  {
    "email": "user@example.com",
    "password": "password"
  }

  # Response:
  {
    "access_token": "eyJ...",
    "token_type": "bearer"
  }
  ```
-->

## TimeMap (`/api/v1`)

Public, read-only data for the map. Every route is rate-limited to `120/minute` per client IP (Cloudflare `CF-Connecting-IP` first), gzip-compressed above 1 kB, and returns `Cache-Control: public, max-age=300`.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET`  | `/api/v1/sources` | Source registry in panel order | Public |
| `GET`  | `/api/v1/records` | All map records in display order. Filters: `?src=` (repeatable), `?country=` (exact name) | Public |
| `GET`  | `/api/v1/records/{id}` | One record; `404` if the id is unknown | Public |
| `GET`  | `/api/v1/basemap` | Country outlines and overseas inset tiles | Public |

**Example: sources**
```bash
GET /api/v1/sources

# Response:
[
  {"id": "unesco", "label": "UNESCO World Heritage", "kind": "site", "shape": "sphere",
   "color": null, "defaultOn": true, "note": "Marker color = heritage layer; height = start year"},
  {"id": "nemo", "label": "NE-MO museums", "kind": "point", "shape": "diamond",
   "color": "#E0A93B", "defaultOn": false, "note": "Museums, height = founding year"},
  {"id": "echo", "label": "ECHO Consortium", "kind": "point", "shape": "cube",
   "color": "#52C7C0", "defaultOn": false, "note": "Consortium partners, no time dimension yet"}
]
```

**Example: one record**
```bash
GET /api/v1/records/unesco-0

# Response:
{
  "id": "unesco-0", "src": "unesco", "k": "site",
  "n": "Historic Centre of the City of Salzburg", "c": "Austria", "ci": "Salzburg",
  "la": 47.8006, "lo": 13.0433, "sy": 700, "ey": 2025, "og": true,
  "ap": "8th century onwards", "cf": "medium", "fl": "ongoing", "ht": "architecture", "ov": false,
  "d": "Baroque old town, birthplace of Mozart, ecclesiastical and secular architecture",
  "uc": "Cultural", "cr": "ii, iv, vi", "yi": 1996,
  "up": "https://whc.unesco.org/en/list/784", "ow": "https://www.salzburg.info"
}
```

**Record fields** (short keys kept from the prototype; null fields are left out of the response):

| Key | Column | Meaning |
|-----|--------|---------|
| `id` | `id` | `<src>-<index>`, stable |
| `src` | `src` | Source id |
| `k` | `kind_tag` | Kind tag (`site`, `inst`, `echo`) |
| `n`, `c`, `ci` | `name`, `country`, `city` | Name, country, city |
| `la`, `lo` | `lat`, `lon` | WGS84 coordinates |
| `gx` | `geocoding_provenance` | `photon` (automatic), `nominatim` (OpenStreetMap, checked by hand) |
| `sy`, `ey` | `start_year`, `end_year` | Active span, integers, negative = BCE |
| `og` | `ongoing` | Still in use |
| `ap`, `cf`, `fl` | `period_text`, `period_confidence`, `period_parse_flag` | Period as written, confidence, parse flag |
| `ht` | `heritage_layer` | Heritage layer (marker color) |
| `natural_top` | `natural_top` | Natural site drawn at the top of the scale |
| `ov` | `overseas` | Drawn on an inset tile |
| `d` | `description` | Description |
| `uc`, `cr`, `yi` | `unesco_category`, `unesco_criteria`, `inscribed_year` | UNESCO listing data |
| `up`, `ow` | `unesco_url`, `official_url` | Links |
| `ot`, `w`, `fd` | `org_type`, `website`, `founded_year` | Institution data |
| `role`, `net`, `assoc` | `role`, `network`, `associated` | Consortium partner data |

**Example: basemap**
```bash
GET /api/v1/basemap

# Response (truncated):
{
  "countries": [["Cyprus", [[[33.7, 35.0], [33.6, 34.8], ...]]], ...],
  "insets": {
    "greenland": {"label": "Greenland (DK)", "bbox": [59, 84, -73, -11],
                  "tile": [-33, -42, 16, 18], "outline": [[[-40.88, 65.1], ...]]},
    ...
  }
}
```
`countries` rings and inset `outline` rings are `[lon, lat]` pairs. Inset `bbox` is `[lat_min, lat_max, lon_min, lon_max]`; `tile` is `[x, z, width, depth]` in scene units.

---

## Health

System health check.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET`  | `/health` | Health check endpoint | Public |

**Response:**
```json
{
  "status": "healthy",
  "version": "0.1.0"
}
```

Note: `/health` is served at the backend root, outside `/api/v1`. The frontend nginx proxies only `/api/` and `/uploads/`, so on the public port `/health` is answered by the SPA; check it on the backend port.

---

## Authentication

<!--
  Document your auth flow here. Example:

  ### JWT Tokens
  - **Access Token:** Short-lived (30 minutes), used for API requests
  - **Refresh Token:** Long-lived (7 days), used to obtain new access tokens

  **Headers:**
  ```
  Authorization: Bearer <access_token>
  ```
-->

Visitors are anonymous. JWT helpers exist in `backend/app/core/security.py` and stay unused until a feature needs user accounts.

**Admin (Phase 3):**
```
X-Admin-Key: <ADMIN_API_KEY from .env>
```

---

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Error message here"
}
```

**Common Status Codes:**
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Pagination

<!--
  Document your pagination pattern. Example:

  List endpoints support pagination:

  **Query Parameters:**
  - `?skip=0` - Number of records to skip (default: 0)
  - `?limit=100` - Number of records to return (default: 100, max: 1000)

  **Response:**
  ```json
  {
    "items": [...],
    "total": 150,
    "skip": 0,
    "limit": 100
  }
  ```
-->

---

## Future Endpoints (Planned)

See [PROGRESS.md](PROGRESS.md) for upcoming API features by phase.

**Phase 3: admin API**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST`   | `/admin/sources` | Register a new data source | Admin |
| `POST`   | `/admin/sources/{id}/import` | Import a CSV of records into a source | Admin |
| `PATCH`  | `/admin/records/{id}` | Edit a record (coordinates, years, text) | Admin |
| `DELETE` | `/admin/records/{id}` | Remove a record | Admin |

## Database Schema

| Table | Key | Contents |
|-------|-----|----------|
| `sources` | `id` | Registry: `label`, `kind`, `shape`, `color`, `default_on`, `note`, `seq` (panel order) |
| `records` | `id` | One row per marker; `src` FK to `sources.id`; columns as in the record field table; `seq` (display order). Indexes: `src`, `country`, `start_year`, `heritage_layer`, `seq` |
| `basemap_countries` | `id` (serial) | `name`, `rings` (JSONB), `seq` |
| `basemap_insets` | `key` | `label`, `bbox`, `tile`, `outline` (JSONB), `seq` |

Migration: `backend/alembic/versions/33d890b0e3d2_timemap_tables.py`. Seed: `backend/app/seed_data/*.json`, loaded on first start (3 sources, 509 records, 38 countries, 8 insets).

---

**Last Updated:** 2026-11-05
**API Version:** v1
