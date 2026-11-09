"""TimeMap data: source registry, map records, basemap countries and overseas insets."""

from sqlalchemy import JSON, Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

# JSONB on PostgreSQL, plain JSON elsewhere (sqlite in tests).
JSONType = JSON().with_variant(JSONB(), "postgresql")


class Source(Base):
    """A dataset shown on the map (UNESCO sites, NE-MO museums, ECHO partners, ...)."""

    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    label: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(10))  # "site" (time span) or "point"
    shape: Mapped[str] = mapped_column(String(20))  # sphere, diamond, cube, cone, ring
    color: Mapped[str | None] = mapped_column(String(9))  # null = per heritage layer / fallback palette
    default_on: Mapped[bool] = mapped_column(Boolean, default=False)
    note: Mapped[str | None] = mapped_column(Text)
    seq: Mapped[int] = mapped_column(Integer, index=True)  # panel order


class Record(Base):
    """One marker on the map. Years are integers, negative = BCE."""

    __tablename__ = "records"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)  # "<src>-<n>"
    src: Mapped[str] = mapped_column(ForeignKey("sources.id"), index=True)
    seq: Mapped[int] = mapped_column(Integer, index=True)  # global display order
    kind_tag: Mapped[str | None] = mapped_column(String(20))

    name: Mapped[str] = mapped_column(String(300))
    country: Mapped[str] = mapped_column(String(100), index=True)
    city: Mapped[str | None] = mapped_column(String(200))
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    geocoding_provenance: Mapped[str | None] = mapped_column(String(40))

    start_year: Mapped[int | None] = mapped_column(Integer, index=True)
    end_year: Mapped[int | None] = mapped_column(Integer)
    ongoing: Mapped[bool | None] = mapped_column(Boolean)
    period_text: Mapped[str | None] = mapped_column(Text)
    period_confidence: Mapped[str | None] = mapped_column(String(20))
    period_parse_flag: Mapped[str | None] = mapped_column(String(40))

    heritage_layer: Mapped[str | None] = mapped_column(String(40), index=True)
    natural_top: Mapped[bool | None] = mapped_column(Boolean)
    overseas: Mapped[bool | None] = mapped_column(Boolean)
    description: Mapped[str | None] = mapped_column(Text)
    unesco_category: Mapped[str | None] = mapped_column(String(40))
    unesco_criteria: Mapped[str | None] = mapped_column(String(60))
    inscribed_year: Mapped[int | None] = mapped_column(Integer)
    unesco_url: Mapped[str | None] = mapped_column(String(500))
    official_url: Mapped[str | None] = mapped_column(String(500))

    org_type: Mapped[str | None] = mapped_column(String(100))
    website: Mapped[str | None] = mapped_column(String(500))
    founded_year: Mapped[int | None] = mapped_column(Integer)
    role: Mapped[str | None] = mapped_column(String(200))
    network: Mapped[str | None] = mapped_column(String(200))
    associated: Mapped[bool | None] = mapped_column(Boolean)


class Country(Base):
    """Basemap outline: one country with its polygon rings as [lon, lat] pairs."""

    __tablename__ = "basemap_countries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100))
    rings: Mapped[list] = mapped_column(JSONType)
    seq: Mapped[int] = mapped_column(Integer, index=True)


class Inset(Base):
    """Overseas territory drawn on a separate tile beside the mainland."""

    __tablename__ = "basemap_insets"

    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    label: Mapped[str] = mapped_column(String(100))
    bbox: Mapped[list] = mapped_column(JSONType)  # [lat_min, lat_max, lon_min, lon_max]
    tile: Mapped[list] = mapped_column(JSONType)  # [x, z, width, depth] in scene units
    outline: Mapped[list] = mapped_column(JSONType)  # rings of [lon, lat]
    seq: Mapped[int] = mapped_column(Integer, index=True)


# Prototype short key -> Record column. The API speaks the short keys so the
# map component reads records exactly as it did with the inline arrays.
RECORD_FIELDS: dict[str, str] = {
    "k": "kind_tag",
    "n": "name",
    "c": "country",
    "ci": "city",
    "la": "lat",
    "lo": "lon",
    "gx": "geocoding_provenance",
    "sy": "start_year",
    "ey": "end_year",
    "og": "ongoing",
    "ap": "period_text",
    "cf": "period_confidence",
    "fl": "period_parse_flag",
    "ht": "heritage_layer",
    "natural_top": "natural_top",
    "ov": "overseas",
    "d": "description",
    "uc": "unesco_category",
    "cr": "unesco_criteria",
    "yi": "inscribed_year",
    "up": "unesco_url",
    "ow": "official_url",
    "ot": "org_type",
    "w": "website",
    "fd": "founded_year",
    "role": "role",
    "net": "network",
    "assoc": "associated",
}
