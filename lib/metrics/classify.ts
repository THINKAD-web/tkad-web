/**
 * 매체 → `MediaMetricClass` 분류.
 *
 * CPM 정상 범위와 가시율 기본값이 여기서 갈리므로, 분류가 틀리면
 * 검증(R-02)이 통째로 무의미해진다. browse taxonomy(`mediaMainCategory` /
 * `mediaSubCategory`)를 1차 근거로, 없으면 이름·태그 휴리스틱으로 폴백한다.
 */
import { DEFAULT_CONTACT_RATE } from "./constants";
import type { MediaMetricClass, SellingUnit } from "./types";

/** 이 면적(㎡) 이상이면 대형 DOOH 로 본다 (사거리·대로변급) */
export const DOOH_LARGE_AREA_M2 = 50;

/** browse sub category → metric class (확정 매핑) */
const SUB_CATEGORY_CLASS: Record<string, MediaMetricClass> = {
  // 교통
  subway_station: "subway_psd",
  subway_train: "subway_light",
  bus_exterior: "bus_exterior",
  bus_interior: "bus_exterior",
  vehicle_wrap: "bus_exterior",
  taxi_exterior: "bus_exterior",
  taxi_interior: "elevator_tv",
  airport: "airport",
  inflight: "airport",
  ktx_terminal: "subway_light",
  ferry: "static_other",
  // 쉘터
  bus_shelter: "bus_shelter",
  digital_shelter: "bus_shelter",
  phone_booth: "bus_shelter",
  city_furniture: "static_other",
  trash_can: "static_other",
  street_furniture: "static_other",
  // 건물 — 밀폐 공간 사이니지
  elevator: "elevator_tv",
  elevator_network: "elevator_tv",
  // 네트워크 — 매장·시설 내 사이니지
  convenience_network: "elevator_tv",
  campus_network: "elevator_tv",
  hospital_network: "elevator_tv",
  parking_network: "elevator_tv",
  franchise_network: "elevator_tv",
};

/** 정적(비 loop) 매체 — SOV 가 항상 1.0 인 sub category */
const STATIC_SUB_CATEGORIES = new Set([
  "billboard",
  "wall_mural",
  "banner",
  "bus_exterior",
  "vehicle_wrap",
  "taxi_exterior",
  "subway_train",
  "city_furniture",
  "trash_can",
  "street_furniture",
  "market",
]);

export type ClassifyInput = {
  /** `Media.mediaMainCategory` */
  mainCategory?: string | null;
  /** `Media.mediaSubCategory` */
  subCategory?: string | null;
  /** `Media.type` — "dooh" | "static" | "mobile" | "network" */
  type?: string | null;
  name?: string | null;
  /** 화면 실물 크기 (㎡ 계산용) */
  widthM?: number | null;
  heightM?: number | null;
};

function screenAreaM2(input: ClassifyInput): number | null {
  const w = input.widthM;
  const h = input.heightM;
  if (typeof w !== "number" || typeof h !== "number") return null;
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return w * h;
}

/** 이름 기반 폴백 — taxonomy 가 비어 있는 레거시 레코드용 */
function classifyByName(name: string): MediaMetricClass | null {
  const n = name.toLowerCase();
  if (/스크린도어|psd|안전문/.test(n)) return "subway_psd";
  if (/지하철|전철|역사|metro|subway/.test(n)) return "subway_light";
  if (/버스\s*쉘터|쉘터|승차대|shelter/.test(n)) return "bus_shelter";
  if (/버스|bus|택시|taxi/.test(n)) return "bus_exterior";
  if (/엘리베이터|elevator|승강기/.test(n)) return "elevator_tv";
  if (/공항|airport/.test(n)) return "airport";
  return null;
}

/** 매체가 loop 없이 상시 노출되는 정적 매체인지 */
export function isStaticMedia(input: ClassifyInput): boolean {
  const sub = input.subCategory ?? "";
  if (STATIC_SUB_CATEGORIES.has(sub)) return true;
  // digital/network 은 loop 가 있고, static/mobile 은 상시 노출로 본다.
  return input.type === "static" || input.type === "mobile";
}

export function classifyMedia(input: ClassifyInput): MediaMetricClass {
  const sub = input.subCategory ?? "";
  const mapped = SUB_CATEGORY_CLASS[sub];
  if (mapped) return mapped;

  const isDigitalSignage =
    sub === "digital_signage" ||
    sub === "led_screen" ||
    sub === "media_pole" ||
    sub === "popup_display" ||
    (input.type === "dooh" && input.mainCategory === "ooh");

  if (isDigitalSignage) {
    const area = screenAreaM2(input);
    // 면적 미상이면 과대 추정을 피해 중형으로 본다 (범위가 더 낮고 넓음).
    if (area != null && area >= DOOH_LARGE_AREA_M2) return "dooh_large";
    return "dooh_mid";
  }

  const byName = input.name ? classifyByName(input.name) : null;
  if (byName) return byName;

  // 옥내 사이니지 계열(디지털)은 엘리베이터 TV 와 노출 성격이 같다.
  if (input.type === "dooh") return "dooh_mid";
  return "static_other";
}

/** 분류에 대응하는 가시율 기본값 */
export function defaultContactRate(mediaClass: MediaMetricClass): number {
  return DEFAULT_CONTACT_RATE[mediaClass];
}

/** 분류에 대응하는 기본 판매 단위 — 가격/노출 분모 일치 검사(R-05)의 기준 */
export function defaultSellingUnit(mediaClass: MediaMetricClass): SellingUnit {
  switch (mediaClass) {
    case "bus_exterior":
      return "vehicle";
    case "subway_psd":
    case "subway_light":
      return "station";
    case "elevator_tv":
      return "site";
    default:
      return "panel";
  }
}
