import type { SeoulMetroLineId } from "@/lib/public-map/seoul-metro-line-colors";

export type SeoulMetroFeatureKind = "line" | "station";

export type SeoulMetroFeatureProperties = {
  kind: SeoulMetroFeatureKind;
  lineId: SeoulMetroLineId;
  lineNameKo: string;
  color: string;
  stationId?: string;
  nameKo?: string;
  isTransfer?: boolean;
};

export type SeoulMetroGeoJson = GeoJSON.FeatureCollection<
  GeoJSON.LineString | GeoJSON.MultiLineString | GeoJSON.Point,
  SeoulMetroFeatureProperties
>;

export const SEOUL_METRO_GEO_URL = "/geo/seoul-metro-v1.json";
