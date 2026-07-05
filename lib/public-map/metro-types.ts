import type { MetroCityId } from "@/lib/public-map/metro-line-colors";

export type MetroFeatureKind = "line" | "station";

export type MetroFeatureProperties = {
  kind: MetroFeatureKind;
  cityId: MetroCityId;
  lineId: string;
  lineNameKo: string;
  color: string;
  stationId?: string;
  nameKo?: string;
  isTransfer?: boolean;
  lineIds?: string[];
};

export type MetroGeoJson = GeoJSON.FeatureCollection<
  GeoJSON.LineString | GeoJSON.MultiLineString | GeoJSON.Point,
  MetroFeatureProperties
>;

export type MetroBbox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type MetroChunkManifest = {
  id: MetroCityId;
  nameKo: string;
  url: string;
  bbox: MetroBbox;
  byteSize?: number;
  lineCount?: number;
  stationCount?: number;
};

export type MetroIndexManifest = {
  version: number;
  generatedAt: string;
  chunks: MetroChunkManifest[];
};

export const METRO_INDEX_URL = "/geo/metro/index.json";

/** @deprecated Use METRO_INDEX_URL + chunk `capital` */
export const SEOUL_METRO_GEO_URL = "/geo/metro/capital.json";

export type SeoulMetroFeatureProperties = MetroFeatureProperties;
export type SeoulMetroGeoJson = MetroGeoJson;
