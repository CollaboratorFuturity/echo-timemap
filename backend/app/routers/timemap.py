"""Public, read-only TimeMap API."""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models.timemap import RECORD_FIELDS, Country, Inset, Record, Source
from app.schemas.timemap import BasemapOut, RecordOut, SourceOut

router = APIRouter(prefix="/api/v1", tags=["timemap"])

PUBLIC_LIMIT = "120/minute"
CACHE = "public, max-age=300"


def record_to_api(rec: Record) -> dict:
    """Record -> prototype short keys, null fields left out."""
    out = {"id": rec.id, "src": rec.src}
    for key, col in RECORD_FIELDS.items():
        value = getattr(rec, col)
        if value is not None:
            out[key] = value
    return out


@router.get("/sources", response_model=list[SourceOut])
@limiter.limit(PUBLIC_LIMIT)
async def list_sources(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """Source registry in panel order."""
    rows = (await db.scalars(select(Source).order_by(Source.seq))).all()
    response.headers["Cache-Control"] = CACHE
    return [
        {"id": s.id, "label": s.label, "kind": s.kind, "shape": s.shape,
         "color": s.color, "defaultOn": s.default_on, "note": s.note}
        for s in rows
    ]


@router.get("/records", response_model=list[RecordOut], response_model_exclude_none=True)
@limiter.limit(PUBLIC_LIMIT)
async def list_records(
    request: Request,
    response: Response,
    src: list[str] | None = Query(None, description="Filter by source id; repeat for several"),
    country: str | None = Query(None, description="Filter by country name, exact match"),
    db: AsyncSession = Depends(get_db),
):
    """All map records in display order."""
    stmt = select(Record).order_by(Record.seq)
    if src:
        stmt = stmt.where(Record.src.in_(src))
    if country:
        stmt = stmt.where(Record.country == country)
    rows = (await db.scalars(stmt)).all()
    response.headers["Cache-Control"] = CACHE
    return [record_to_api(r) for r in rows]


@router.get("/records/{record_id}", response_model=RecordOut, response_model_exclude_none=True)
@limiter.limit(PUBLIC_LIMIT)
async def get_record(request: Request, response: Response, record_id: str, db: AsyncSession = Depends(get_db)):
    """One record."""
    rec = await db.get(Record, record_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="Record not found")
    response.headers["Cache-Control"] = CACHE
    return record_to_api(rec)


@router.get("/basemap", response_model=BasemapOut)
@limiter.limit(PUBLIC_LIMIT)
async def get_basemap(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """Country outlines and overseas inset tiles."""
    countries = (await db.scalars(select(Country).order_by(Country.seq))).all()
    insets = (await db.scalars(select(Inset).order_by(Inset.seq))).all()
    response.headers["Cache-Control"] = CACHE
    return {
        "countries": [[c.name, c.rings] for c in countries],
        "insets": {i.key: {"label": i.label, "bbox": i.bbox, "tile": i.tile, "outline": i.outline} for i in insets},
    }
