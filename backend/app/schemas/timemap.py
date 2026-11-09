"""Public TimeMap API schemas. Field names follow the prototype's short keys."""

from pydantic import BaseModel, Field


class SourceOut(BaseModel):
    id: str
    label: str
    kind: str = Field(description='"site" (time-spanning) or "point" (present-day)')
    shape: str
    color: str | None = Field(None, description="Marker color; null = heritage-layer color or fallback palette")
    defaultOn: bool
    note: str | None = None


class RecordOut(BaseModel):
    id: str
    src: str = Field(description="Source id")
    k: str | None = Field(None, description="Kind tag")
    n: str = Field(description="Name")
    c: str = Field(description="Country")
    ci: str | None = Field(None, description="City")
    la: float = Field(description="Latitude, WGS84")
    lo: float = Field(description="Longitude, WGS84")
    gx: str | None = Field(None, description="Geocoding provenance")
    sy: int | None = Field(None, description="Start year, negative = BCE")
    ey: int | None = Field(None, description="End year, negative = BCE")
    og: bool | None = Field(None, description="Ongoing")
    ap: str | None = Field(None, description="Period as written in the source")
    cf: str | None = Field(None, description="Period confidence")
    fl: str | None = Field(None, description="Period parse flag")
    ht: str | None = Field(None, description="Heritage layer")
    natural_top: bool | None = Field(None, description="Natural site drawn at the top of the scale")
    ov: bool | None = Field(None, description="Overseas, drawn on an inset tile")
    d: str | None = Field(None, description="Description")
    uc: str | None = Field(None, description="UNESCO category")
    cr: str | None = Field(None, description="UNESCO criteria")
    yi: int | None = Field(None, description="Year inscribed")
    up: str | None = Field(None, description="UNESCO listing URL")
    ow: str | None = Field(None, description="Official website")
    ot: str | None = Field(None, description="Organization type")
    w: str | None = Field(None, description="Website")
    fd: int | None = Field(None, description="Founding year")
    role: str | None = Field(None, description="Consortium role")
    net: str | None = Field(None, description="Network")
    assoc: bool | None = Field(None, description="Associated partner")


class InsetOut(BaseModel):
    label: str
    bbox: list = Field(description="[lat_min, lat_max, lon_min, lon_max]")
    tile: list = Field(description="[x, z, width, depth] in scene units")
    outline: list


class BasemapOut(BaseModel):
    countries: list = Field(description='EU_MAP format: [[name, rings], ...], rings of [lon, lat]')
    insets: dict[str, InsetOut]
