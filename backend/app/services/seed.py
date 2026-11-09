"""Load the TimeMap seed data (app/seed_data/*.json) into the database.

The seed files were extracted from the prototype with
scripts/extract_prototype_data.py. Seeding runs on startup when the sources
table is empty, and can be run by hand:

    python -m app.services.seed           # seed only if empty
    python -m app.services.seed --reset   # delete all TimeMap data, then seed
"""

import asyncio
import json
import logging
import sys
from pathlib import Path

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.timemap import RECORD_FIELDS, Country, Inset, Record, Source

logger = logging.getLogger(__name__)

SEED_DIR = Path(__file__).resolve().parent.parent / "seed_data"


def _load(name: str) -> list[dict]:
    return json.loads((SEED_DIR / f"{name}.json").read_text(encoding="utf-8"))


def record_from_seed(row: dict) -> Record:
    unknown = set(row) - set(RECORD_FIELDS) - {"id", "src", "seq"}
    if unknown:
        raise ValueError(f"record {row.get('id')}: unknown fields {sorted(unknown)}")
    values = {RECORD_FIELDS[k]: v for k, v in row.items() if k in RECORD_FIELDS}
    return Record(id=row["id"], src=row["src"], seq=row["seq"], **values)


async def is_seeded(session: AsyncSession) -> bool:
    return (await session.scalar(select(func.count()).select_from(Source))) > 0


async def seed(session: AsyncSession, reset: bool = False) -> dict[str, int]:
    """Insert seed data. Returns row counts; empty dict if skipped."""
    if reset:
        for model in (Record, Source, Country, Inset):
            await session.execute(delete(model))
        await session.flush()
    elif await is_seeded(session):
        return {}

    sources = [Source(**row) for row in _load("sources")]
    session.add_all(sources)
    await session.flush()  # records reference sources

    records = [record_from_seed(row) for row in _load("records")]
    countries = [Country(**row) for row in _load("countries")]
    insets = [Inset(**row) for row in _load("insets")]
    session.add_all(records + countries + insets)
    await session.commit()

    counts = {"sources": len(sources), "records": len(records),
              "countries": len(countries), "insets": len(insets)}
    logger.info("TimeMap seed loaded: %s", counts)
    return counts


async def _main(reset: bool) -> None:
    from app.core.database import async_session

    async with async_session() as session:
        counts = await seed(session, reset=reset)
    print(counts or "already seeded, nothing done (use --reset to reload)")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_main(reset="--reset" in sys.argv))
