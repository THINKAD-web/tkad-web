/** 지도 핀 매체명 permanent label — zoom·밀도 cap */

/** zoom ≥ 17 에서 뷰포트 내 핀에 매체명 라벨 표시 */
export const MAP_PIN_NAME_LABEL_MIN_ZOOM = 17;

/** 뷰포트 내 핀 수가 이 값을 초과하면 bulk 라벨 off (선택 핀 제외) — 밀집 구역만 */
export const MAP_PIN_NAME_LABEL_MAX_VISIBLE = 18;

export type MapPinLabelOverlayState = {
  zoom: number;
  visiblePinCount: number;
  /** zoom·cap 조건을 만족해 전체 라벨을 켤 수 있는지 */
  bulkLabelsEnabled: boolean;
  /** zoom≥MIN 이지만 cap 초과로 bulk 라벨이 꺼진 상태 */
  capActive: boolean;
};

export function resolveMapPinLabelOverlayState(
  zoom: number,
  visiblePinCount: number,
): MapPinLabelOverlayState {
  const bulkLabelsEnabled =
    zoom >= MAP_PIN_NAME_LABEL_MIN_ZOOM &&
    visiblePinCount <= MAP_PIN_NAME_LABEL_MAX_VISIBLE;
  const capActive =
    zoom >= MAP_PIN_NAME_LABEL_MIN_ZOOM &&
    visiblePinCount > MAP_PIN_NAME_LABEL_MAX_VISIBLE;
  return { zoom, visiblePinCount, bulkLabelsEnabled, capActive };
}
