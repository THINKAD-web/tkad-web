/**
 * 계산 입력 기본값 — **PR-4 이후 DB 값으로 교체할 지점을 한 곳에 모은다.**
 *
 * 엔진(`impressions.ts`·`cpm.ts`)은 건드리지 않는다. 이 파일은 엔진에
 * 넣을 입력값을 결정하고, **그 값의 근거(basis)를 함께 반환**한다.
 *
 * ## 왜 basis 를 값과 함께 반환하는가
 *
 * `resolveSovShare()` 가 근거 없을 때 `0` 을 돌려주는 설계는 의도적이다 —
 * 1.0 으로 가정하면 D-01(노출 과다 산정)을 그대로 재현한다. 기본값으로
 * 덮어쓰는 순간 그 안전장치가 풀리므로, **덮어썼다는 사실 자체를 값에
 * 실어 보낸다.** 화면의 신뢰도 배지는 이 basis 를 읽어서 렌더하며,
 * 화면이 임의로 "이건 추정이겠지" 하고 판정하지 않는다.
 *
 * ## basis 의미
 * - `measured`  : 매체별 실측값이 DB 에 있다
 * - `derived`   : 매체 사양(SOV 스펙 등)에서 계산했다
 * - `default`   : 유형별 기본 상수로 대체했다 → 화면에 [추정]
 */

import { isStaticMedia, classifyMedia } from "./classify";
import { resolveSovShare as engineResolveSovShare } from "./impressions";
import { DEFAULT_CONTACT_RATE } from "./constants";
import type { MediaMetricClass } from "./types";

export type MetricBasis = "measured" | "derived" | "default";

export type MetricValue<T = number> = {
  value: T;
  basis: MetricBasis;
};

/**
 * loop 매체 SOV 기본값 — 소재 점유율(내 소재 길이 / loop 1회전).
 *
 * 국내 DOOH 관행: 15초 소재 · 5분(300초) loop = 0.05.
 * 정적 매체는 이 표를 쓰지 않는다(정의상 1.0).
 *
 * TODO(PR-4 이후): `MediaFactSheet.spotDurationSec` / `loopDurationSec` /
 * `playsPerHour` 가 채워지면 `engineResolveSovShare()` 가 실제 값을
 * 계산하므로 이 기본값 경로는 자동으로 줄어든다. 컬럼은
 * `docs/pr3-redesign.md` 재배치표 참조.
 */
export const DEFAULT_SOV_SHARE: Record<MediaMetricClass, number> = {
  /** 15초 / 300초 loop */
  dooh_large: 0.05,
  /** 15초 / 240초 loop — 중형은 회전이 조금 빠르다 */
  dooh_mid: 0.0625,
  /** 지하철 PSD 는 대부분 인쇄물(정적)이나, 디지털 PSD 대비 */
  subway_psd: 0.1,
  subway_light: 0.1,
  /** 버스 외부는 랩핑(정적)이 기본 — 디지털 버스 사이니지 대비 */
  bus_exterior: 0.1,
  bus_shelter: 0.1,
  /** 엘리베이터 TV: 15초 / 180초 loop */
  elevator_tv: 0.0833,
  /** 공항 디지털 사이니지: 15초 / 300초 */
  airport: 0.05,
  static_other: 0.1,
};

export type MediaSovSource = {
  type?: string;
  subCategory?: string;
  mainCategory?: string;
  name?: string;
  /** PR-3 이후 채워질 예정 — 지금은 항상 undefined */
  spotDuration?: number;
  loopDuration?: number;
  playsPerHour?: number;
};

/**
 * SOV(소재 점유율) + 근거.
 *
 * 우선순위: 정적(정의상 1.0) → 매체 사양 기반 계산 → 유형별 기본값.
 * 엔진이 0 을 반환하는 경우에만 기본값으로 덮어쓰고 `default` 로 표시한다.
 */
export function resolveSovShareWithBasis(
  media: MediaSovSource,
): MetricValue {
  const classifyInput = {
    type: media.type ?? "",
    subCategory: media.subCategory,
    mainCategory: media.mainCategory,
    name: media.name,
  };

  const isStatic = isStaticMedia(classifyInput);
  if (isStatic) {
    // 정적 매체는 소재가 항상 노출된다 — 가정이 아니라 정의다.
    return { value: 1, basis: "derived" };
  }

  const fromSpec = engineResolveSovShare({
    isStatic: false,
    spotDuration: media.spotDuration,
    loopDuration: media.loopDuration,
    playsPerHour: media.playsPerHour,
  });

  if (fromSpec > 0) {
    return { value: fromSpec, basis: "derived" };
  }

  // 엔진이 0 → SOV 근거 없음. 기본값으로 덮어쓰되 그 사실을 실어 보낸다.
  const mediaClass = classifyMedia(classifyInput);
  return { value: DEFAULT_SOV_SHARE[mediaClass], basis: "default" };
}

export type MediaContactRateSource = {
  type?: string;
  subCategory?: string;
  mainCategory?: string;
  name?: string;
  /** PR-3/PR-4 이후 채워질 예정 — 지금은 항상 undefined */
  contactRate?: number;
};

/**
 * contactRate(OTS→LTS 전환율) + 근거.
 *
 * TODO(PR-4 이후): `MediaComputedMetric.contactRate` 가 채워지면
 * `measured` / `derived` 경로가 열린다. E-4 승인 유도 공식
 * `DEFAULT[class] × (0.8 + 0.4 × visibilityScore/100)` 은 **PR-4 데이터
 * 이관 완료 후** 배선하기로 확정됐다(docs/pr3-redesign.md 배포 타이밍).
 * 그 전까지는 visibilityScore 가 있어도 유도하지 않는다 — 지금 켜면
 * 이관 전 데이터로 계산된 값이 저장 제안서에 굳는다.
 */
export function resolveContactRateWithBasis(
  media: MediaContactRateSource,
): MetricValue {
  if (
    typeof media.contactRate === "number" &&
    media.contactRate > 0 &&
    media.contactRate <= 1
  ) {
    return { value: media.contactRate, basis: "measured" };
  }

  const mediaClass = classifyMedia({
    type: media.type ?? "",
    subCategory: media.subCategory,
    mainCategory: media.mainCategory,
    name: media.name,
  });
  return { value: DEFAULT_CONTACT_RATE[mediaClass], basis: "default" };
}

/**
 * 여러 basis 를 합칠 때의 규칙 — **가장 약한 근거가 이긴다.**
 * 추정값이 하나라도 섞이면 합산 결과는 추정이다.
 */
export function weakestBasis(
  bases: readonly MetricBasis[],
): MetricBasis {
  if (bases.length === 0) return "default";
  if (bases.includes("default")) return "default";
  if (bases.includes("derived")) return "derived";
  return "measured";
}
