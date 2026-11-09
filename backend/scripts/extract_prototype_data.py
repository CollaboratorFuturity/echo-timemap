"""Extract the inline data arrays from the 5D TimeMap prototype into seed JSON files.

Usage (from backend/):
    python scripts/extract_prototype_data.py <path/to/5d-timemap-v2.jsx> [out_dir]

Reads SITES, INSTS, ECHO_ORGS, EU_MAP, INSETS and the SOURCES registry from the
prototype and writes, into out_dir (default app/seed_data/):
    sources.json    registry rows in panel order
    records.json    every record with id, src, seq, in the prototype's short keys
    countries.json  EU_MAP as [{"name", "rings", "seq"}]
    insets.json     INSETS as [{"key", "label", "bbox", "tile", "outline", "seq"}]

Record ids reproduce the prototype's scheme: "<src>-<index in its array>".
"""

import json
import re
import sys
from pathlib import Path

# Prototype array name -> source id, in the order RECORDS concatenates them.
ARRAYS = [("SITES", "unesco"), ("INSTS", "nemo"), ("ECHO_ORGS", "echo")]

# SOURCES registry as declared in the prototype (it is JS, not JSON, so it is
# transcribed here and checked against the file below).
SOURCES = [
    {"id": "unesco", "label": "UNESCO World Heritage", "kind": "site", "shape": "sphere",
     "color": None, "default_on": True, "note": "Marker color = heritage layer; height = start year"},
    {"id": "nemo", "label": "NE-MO museums", "kind": "point", "shape": "diamond",
     "color": "#E0A93B", "default_on": False, "note": "Museums, height = founding year"},
    {"id": "echo", "label": "ECHO Consortium", "kind": "point", "shape": "cube",
     "color": "#52C7C0", "default_on": False, "note": "Consortium partners, no time dimension yet"},
]


def _json_const(src: str, name: str, opener: str):
    m = re.search(r"^const %s = (\%s.*?);\n" % (name, opener), src, re.S | re.M)
    if not m:
        raise SystemExit(f"constant {name} not found")
    return json.loads(m.group(1))


def _check_sources(src: str) -> None:
    block = re.search(r"^const SOURCES = \{(.*?)^\};", src, re.S | re.M)
    if not block:
        raise SystemExit("SOURCES registry not found")
    text = block.group(1)
    ids = re.findall(r"^\s+(\w+): \{ label:", text, re.M)
    if ids != [s["id"] for s in SOURCES]:
        raise SystemExit(f"SOURCES ids in file {ids} differ from transcription")
    for s in SOURCES:
        for key, js_key in (("label", "label"), ("kind", "kind"), ("shape", "shape"), ("note", "note")):
            if f'{js_key}: "{s[key]}"' not in text:
                raise SystemExit(f"SOURCES.{s['id']}.{js_key} differs from transcription")
        color = "null" if s["color"] is None else f'"{s["color"]}"'
        if f"color: {color}" not in text:
            raise SystemExit(f"SOURCES.{s['id']}.color differs from transcription")


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    jsx = Path(sys.argv[1]).read_text(encoding="utf-8")
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parent.parent / "app" / "seed_data"
    out.mkdir(parents=True, exist_ok=True)

    _check_sources(jsx)

    records = []
    seq = 0
    for array_name, src_id in ARRAYS:
        for i, row in enumerate(_json_const(jsx, array_name, "[")):
            records.append({"id": f"{src_id}-{i}", "src": src_id, "seq": seq, **row})
            seq += 1

    countries = [{"name": name, "rings": rings, "seq": i}
                 for i, (name, rings) in enumerate(_json_const(jsx, "EU_MAP", "["))]
    insets = [{"key": key, "seq": i, **val}
              for i, (key, val) in enumerate(_json_const(jsx, "INSETS", "{").items())]
    sources = [{**s, "seq": i} for i, s in enumerate(SOURCES)]

    for name, data in (("sources", sources), ("records", records),
                       ("countries", countries), ("insets", insets)):
        (out / f"{name}.json").write_text(
            json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    by_src = {s["id"]: sum(1 for r in records if r["src"] == s["id"]) for s in SOURCES}
    print(f"sources={len(sources)} records={len(records)} {by_src} "
          f"countries={len(countries)} insets={len(insets)} -> {out}")


if __name__ == "__main__":
    main()
