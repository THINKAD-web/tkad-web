export type MapMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  price: number;
  type: string;
  /** `/media/map` — 가시성 tier 외곽 ring. 미전달 시 tier 0 ring */
  visibilityScore?: number;
};

export type MapBounds = {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
};
