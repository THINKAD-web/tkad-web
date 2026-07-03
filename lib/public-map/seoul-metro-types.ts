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
  /** 환승역 병합 시 소속된 전체 노선 목록 (병합 없는 일반역은 [lineId] 와 동일) */
  lineIds?: SeoulMetroLineId[];
};

export type SeoulMetroGeoJson = GeoJSON.FeatureCollection<
  GeoJSON.LineString | GeoJSON.MultiLineString | GeoJSON.Point,
  SeoulMetroFeatureProperties
>;

export const SEOUL_METRO_GEO_URL = "/geo/seoul-metro-v1.json";
