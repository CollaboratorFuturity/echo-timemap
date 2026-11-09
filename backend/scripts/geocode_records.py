"""Look up coordinates for records listed in a fixes file, using Nominatim (OpenStreetMap).

Usage (from backend/):
    python scripts/geocode_records.py scripts/geocode_fixes.json scripts/geocode_results.json

The fixes file maps record id -> {"q": search text, "cc": ISO country code, "city": expected city}.
For each id the top 3 candidates are written to the results file for manual review;
nothing in the seed data is changed. Respects the Nominatim usage policy: one request
per second, identifying User-Agent.
"""

import json
import sys
import time
import urllib.parse
import urllib.request

UA = "echo-timemap-geocoder/0.1 (ECHO project data cleaning)"


def search(q: str, cc: str) -> list[dict]:
    params = urllib.parse.urlencode({"q": q, "countrycodes": cc, "format": "jsonv2",
                                     "addressdetails": 1, "limit": 3})
    req = urllib.request.Request(f"https://nominatim.openstreetmap.org/search?{params}", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def main() -> None:
    fixes = json.load(open(sys.argv[1], encoding="utf-8"))
    results = {}
    for rid, f in fixes.items():
        hits = search(f["q"], f["cc"])
        results[rid] = {**f, "candidates": [
            {"lat": float(h["lat"]), "lon": float(h["lon"]), "name": h.get("name"),
             "type": f'{h.get("category")}/{h.get("type")}', "osm": f'{h["osm_type"]}/{h["osm_id"]}',
             "display_name": h["display_name"]} for h in hits]}
        top = results[rid]["candidates"][0] if hits else None
        print(rid, "|", f["city"], "|", f'{top["lat"]:.5f},{top["lon"]:.5f} {top["type"]} | {top["display_name"][:110]}' if top else "NO RESULT")
        time.sleep(1.1)
    json.dump(results, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
