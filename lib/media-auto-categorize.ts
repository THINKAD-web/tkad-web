/**
 * 매체 유형 자동 분류 (DB `Media.type` 문자열)
 * — 퀵 등록·일괄 재분류·sub_category-only 힌트에 공통 사용
 *
 * 공개 카탈로그 유형은 `dooh` | `static` | `mobile` 세 가지.
 */

import {
  CATALOG_MEDIA_TYPE_DOOH,
  CATALOG_MEDIA_TYPE_MOBILE,
  CATALOG_MEDIA_TYPE_STATIC,
  CATALOG_MEDIA_TYPES,
  type CatalogMediaType,
  canonicalCatalogMediaType,
  isValidCatalogMediaType,
  normalizeCatalogMediaType,
} from "@/lib/catalog-media-type";

export {
  CATALOG_MEDIA_TYPES,
  type CatalogMediaType,
  isValidCatalogMediaType,
  normalizeCatalogMediaType,
  canonicalCatalogMediaType,
};

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export type MediaTypeInferenceInput = {
  subCategory: string;
  name: string;
  description: string;
  location: string;
  tags: readonly string[];
  nearbyFacilities?: string;
  nearbyStations?: string;
  nearbyLandmarks?: string;
};

function blobFrom(input: MediaTypeInferenceInput): string {
  return norm(
    [
      input.subCategory,
      input.name,
      input.description,
      input.location,
      ...(input.tags ?? []),
      input.nearbyFacilities ?? "",
      input.nearbyStations ?? "",
      input.nearbyLandmarks ?? "",
    ].join(" "),
  ).toLowerCase();
}

/**
 * 텍스트 시그널로 유형 추론. 앞쪽 규칙이 우선(더 구체적).
 * 결과는 항상 `dooh` | `static` | `mobile`.
 */
export function inferCatalogTypeFromMediaContent(
  input: MediaTypeInferenceInput,
): CatalogMediaType {
  const b = blobFrom(input);

  if (
    /네트워크|network\s*패키지|다지점|다수\s*정류|정류장\s*네트워크|n개소\s*단위|패키지\s*매체/.test(
      b,
    ) ||
    (/버스|정류장|쉘터/.test(b) && /네트워크|패키지|전국|광역/.test(b))
  ) {
    return /버스|정류|쉘터|bus|shelter/.test(b)
      ? CATALOG_MEDIA_TYPE_MOBILE
      : CATALOG_MEDIA_TYPE_DOOH;
  }

  if (
    /고속도로|휴게소|expressway|나들목|ic\s*인근|하이패스|rest\s*stop|휴게/.test(
      b,
    )
  ) {
    return CATALOG_MEDIA_TYPE_STATIC;
  }

  if (
    b.includes("빌보드") ||
    b.includes("billboard") ||
    b.includes("외벽") ||
    b.includes("현수막") ||
    /인쇄\s*광고|게첨|대형\s*패널/.test(b)
  ) {
    return CATALOG_MEDIA_TYPE_STATIC;
  }

  if (
    b.includes("지하철") ||
    /[가-힣0-9]{2,12}역(?:\s|,|$|·|\/|\(|,)/.test(b) ||
    b.includes("역\s*(") ||
    b.includes("subway") ||
    b.includes("metro") ||
    b.includes("스크린도어") ||
    b.includes("platform") ||
    b.includes("지하통로") ||
    b.includes("환승") ||
    b.includes("전철")
  ) {
    return CATALOG_MEDIA_TYPE_MOBILE;
  }

  if (
    b.includes("버스") ||
    b.includes("bus") ||
    b.includes("쉘터") ||
    b.includes("shelter") ||
    b.includes("정류장") ||
    b.includes("택시") ||
    b.includes("taxi") ||
    b.includes("랩핑") ||
    b.includes("wrapping")
  ) {
    return CATALOG_MEDIA_TYPE_MOBILE;
  }

  if (
    b.includes("led") ||
    b.includes("전광판") ||
    b.includes("디지털") ||
    b.includes("digital") ||
    b.includes("사이니지") ||
    b.includes("signage") ||
    b.includes("lcd") ||
    b.includes("미디어폴") ||
    /실내|인도어|\bindoor\b|로비|lobby|매장\s*내|백화점\s*내|몰\s*내|지하\s*상가/.test(
      b,
    ) ||
    /골프|golf|호텔|hotel|리조트|resort|아파트|단지내|단지\s*내/.test(b)
  ) {
    return CATALOG_MEDIA_TYPE_DOOH;
  }

  if (
    b.includes("옥외") ||
    b.includes("roof") ||
    b.includes("건물") ||
    b.includes("외벽")
  ) {
    return CATALOG_MEDIA_TYPE_STATIC;
  }

  return CATALOG_MEDIA_TYPE_DOOH;
}

/** DB 행 재분류용 */
export function inferCatalogTypeFromDbMedia(m: {
  name: string;
  location: string;
  description: string | null;
  subCategory: string | null;
  tags: string[];
  nearbyFacilities: string | null;
  nearbyStations: string | null;
  nearbyLandmarks: string | null;
}): CatalogMediaType {
  return inferCatalogTypeFromMediaContent({
    subCategory: m.subCategory ?? "",
    name: m.name,
    description: m.description ?? "",
    location: m.location,
    tags: m.tags ?? [],
    nearbyFacilities: m.nearbyFacilities ?? undefined,
    nearbyStations: m.nearbyStations ?? undefined,
    nearbyLandmarks: m.nearbyLandmarks ?? undefined,
  });
}
