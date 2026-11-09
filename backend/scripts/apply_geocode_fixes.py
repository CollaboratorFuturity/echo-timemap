"""Apply reviewed coordinate corrections to the seed records.

Usage (from backend/):
    python scripts/apply_geocode_fixes.py scripts/geocode_applied.json

Updates la, lo, ci (and ov when given) and sets gx = "nominatim" for each id, in
app/seed_data/records.json. Prints the distance each pin moved. Run
`make seed-reset` afterwards to load the change into a running database.
"""

import json
import math
import sys
from pathlib import Path

RECORDS = Path(__file__).resolve().parent.parent / "app" / "seed_data" / "records.json"


def km(a, b, c, d):
    p = math.pi / 180
    h = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def main() -> None:
    fixes = {k: v for k, v in json.load(open(sys.argv[1], encoding="utf-8")).items() if not k.startswith("_")}
    records = json.loads(RECORDS.read_text(encoding="utf-8"))
    by_id = {r["id"]: r for r in records}
    missing = set(fixes) - set(by_id)
    if missing:
        raise SystemExit(f"unknown ids: {sorted(missing)}")
    for rid, f in fixes.items():
        r = by_id[rid]
        moved = km(r["la"], r["lo"], f["la"], f["lo"])
        print(f'{rid:8} {r["n"][:46]:46} {str(r.get("ci"))[:16]:16} -> {f["ci"][:22]:22} moved {moved:7.1f} km')
        r["la"], r["lo"], r["ci"], r["gx"] = f["la"], f["lo"], f["ci"], "nominatim"
        if "ov" in f:
            r["ov"] = f["ov"]
    RECORDS.write_text(json.dumps(records, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"updated {len(fixes)} records in {RECORDS}")


if __name__ == "__main__":
    main()
