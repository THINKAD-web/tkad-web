export type MapMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  price: number;
  type: string;
  /** `/media/map` — 가시성 점수 핀 색상. 미전달 시 매체 타입 색상 유지 */
  visibilityScore?: number;
};

export type MapBounds = {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
};
