/*
 * TimeMap data, loaded from the API before the map mounts.
 *
 * TimeMap.jsx reads these as module-level bindings (they were inline constants
 * in the prototype). ES module exports are live: setTimemapData() reassigns
 * them and every importer sees the new values. TimeMapPage calls it once,
 * before rendering <TimeMap />, so the component's code and hooks run exactly
 * as they did with the inline arrays.
 */

import { apiGet } from "@/api/client";

export interface SourceDef {
  label: string;
  kind: "site" | "point";
  shape: string;
  color: string | null;
  defaultOn: boolean;
  note: string | null;
}

interface SourceRow extends SourceDef {
  id: string;
}

// Map records use the prototype's short keys (see docs/API.md).
export type MapRecord = { id: string; src: string; [key: string]: unknown };

export interface Inset {
  label: string;
  bbox: number[];
  tile: number[];
  outline: number[][][];
}

export interface TimemapPayload {
  sources: SourceRow[];
  records: MapRecord[];
  countries: [string, number[][][]][];
  insets: Record<string, Inset>;
}

// Fallback marker colors for point sources registered without a color.
const SRC_FALLBACK = ["#E0A93B", "#5FD08A", "#FF5C8A", "#4AA3E0", "#B968D9", "#2DC4A8"];

export let SOURCES: Record<string, SourceDef> = {};
export let RECORDS: MapRecord[] = [];
export let SITE_RECORDS: MapRecord[] = [];
export let POINT_RECORDS: MapRecord[] = [];
export let EU_MAP: [string, number[][][]][] = [];
export let INSETS: Record<string, Inset> = {};

export function setTimemapData(p: TimemapPayload): void {
  const sources: Record<string, SourceDef> = {};
  p.sources.forEach(({ id, ...def }, i) => {
    sources[id] = { ...def };
    if (!def.color && def.kind === "point") sources[id].color = SRC_FALLBACK[i % SRC_FALLBACK.length];
  });
  SOURCES = sources;
  RECORDS = p.records.filter(r => sources[r.src]);
  SITE_RECORDS = RECORDS.filter(r => sources[r.src].kind === "site");
  POINT_RECORDS = RECORDS.filter(r => sources[r.src].kind === "point");
  EU_MAP = p.countries;
  INSETS = p.insets;
}

export async function fetchTimemapData(): Promise<TimemapPayload> {
  const [sources, records, basemap] = await Promise.all([
    apiGet<SourceRow[]>("/sources"),
    apiGet<MapRecord[]>("/records"),
    apiGet<{ countries: TimemapPayload["countries"]; insets: TimemapPayload["insets"] }>("/basemap"),
  ]);
  return { sources, records, countries: basemap.countries, insets: basemap.insets };
}
