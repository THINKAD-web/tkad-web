/**
 * 매체 지표 표기 — **단일 포매터**.
 *
 * 홈 카드·목록·상세·유사매체·제안서는 전부 이 모듈만 쓴다. 같은 매체가
 * 화면마다 다른 숫자·다른 기간 기준으로 보이는 문제(D-05)의 표시 계층 해법.
 *
 * 금액 포맷 자체는 `lib/media-price-format` 의 검증된 구현에 위임한다.
 * 여기서 새로 정하는 것은 **무엇을 보여줄지**(기간 동반 표기, 극단값 차단)다.
 */
import { formatCpmForDisplay } from "@/lib/media-display-currency";
import {
  formatCpmKrw,
  formatMediaPriceCompactWon,
  mediaPriceOnInquiryLabel,
} from "@/lib/media-price-format";
import { isStaticMedia } from "./classify";

// ─────────────────────────────────────────────────────────────────
// CPM 극단값 가드
// ─────────────────────────────────────────────────────────────────

/**
 * 광고주 대면 화면에 표시할 수 있는 CPM 하한/상한.
 *
 * 유형별 정식 범위(`CPM_BOUNDS`)가 아니라 **의도적으로 느슨한** 임계값이다.
 * 정식 범위를 지금 적용하면 카탈로그의 상당 비율이 "산정 중"으로 바뀌는데,
 * 그 비율은 전수 감사 리포트가 나와야 알 수 있다. 여기서는 물리적으로
 * 불가능한 값만 먼저 걷어내고, 정식 범위 적용은 감사 이후로 미룬다.
 *
 *   ₩32     (버스 1대 가격 ÷ 전 노선 노출)  → 하한 미달
 *   ₩954,545 (일 단가 × 30 ÷ 월 노출)       → 상한 초과
 */
export const CPM_DISPLAY_MIN_WON = 1_000;
export const CPM_DISPLAY_MAX_WON = 200_000;

export type CpmSuppressReason = "NO_VALUE" | "TOO_LOW" | "TOO_HIGH";

export type CpmDisplay = {
  /** 광고주에게 보여줄 문자열 */
  text: string;
  /** 표시 가능 여부 — false 면 text 는 "CPM 산정 중" */
  displayable: boolean;
  /** 원래 계산값 (관리자 화면·로깅용). 표시 불가여도 값은 잃지 않는다 */
  rawWon: number | null;
  reason?: CpmSuppressReason;
};

function cpmPendingLabel(locale: string): string {
  return locale.startsWith("ko") ? "CPM 산정 중" : "CPM under review";
}

/**
 * CPM 표시 판정 — 광고주 대면.
 *
 * 틀린 숫자를 보여주는 것보다 안 보여주는 것이 낫다. 임계값 밖의 값은
 * 문자열을 "CPM 산정 중"으로 바꾸되 `rawWon` 에 원값을 남겨 관리자 화면과
 * 감사 로그가 그대로 쓸 수 있게 한다.
 */
export function resolveCpmDisplay(
  cpmWon: number | null | undefined,
  locale = "ko-KR",
  country?: string | null,
): CpmDisplay {
  if (cpmWon == null || !Number.isFinite(cpmWon) || cpmWon <= 0) {
    return {
      text: cpmPendingLabel(locale),
      displayable: false,
      rawWon: null,
      reason: "NO_VALUE",
    };
  }

  if (cpmWon < CPM_DISPLAY_MIN_WON) {
    return {
      text: cpmPendingLabel(locale),
      displayable: false,
      rawWon: cpmWon,
      reason: "TOO_LOW",
    };
  }

  if (cpmWon > CPM_DISPLAY_MAX_WON) {
    return {
      text: cpmPendingLabel(locale),
      displayable: false,
      rawWon: cpmWon,
      reason: "TOO_HIGH",
    };
  }

  return {
    text: formatCpmForDisplay(Math.round(cpmWon), country, locale),
    displayable: true,
    rawWon: cpmWon,
  };
}

/**
 * 광고주 대면 CPM 문자열. 극단값은 "CPM 산정 중" 으로 대체된다.
 * 관리자 화면에는 `formatCpmForAdmin` 을 쓸 것.
 */
export function formatCPM(
  cpmWon: number | null | undefined,
  locale = "ko-KR",
  country?: string | null,
): string {
  return resolveCpmDisplay(cpmWon, locale, country).text;
}

/**
 * 관리자 화면용 — 실값을 그대로 노출하고, 임계값 밖이면 경고를 덧붙인다.
 * 운영이 어떤 매체를 고쳐야 하는지 보려면 값이 보여야 한다.
 */
export function formatCpmForAdmin(
  cpmWon: number | null | undefined,
  locale = "ko-KR",
): string {
  const d = resolveCpmDisplay(cpmWon, locale);
  if (d.rawWon == null) return "—";
  const value = formatCpmKrw(Math.round(d.rawWon), locale);
  if (d.displayable) return value;
  const isKo = locale.startsWith("ko");
  const warn =
    d.reason === "TOO_LOW"
      ? isKo
        ? "하한 미달"
        : "below floor"
      : isKo
        ? "상한 초과"
        : "above ceiling";
  return `${value} ⚠ ${warn}`;
}

// ─────────────────────────────────────────────────────────────────
// 가격 — 항상 «금액 / 실제 상품 기간»
// ─────────────────────────────────────────────────────────────────

/** 상품 일수 → 표기 라벨. 임의 반올림 없이 실제 일수를 보여준다. */
export function formatProductPeriod(days: number, locale = "ko-KR"): string {
  const isKo = locale.startsWith("ko");
  if (!Number.isFinite(days) || days <= 0) return isKo ? "기간 문의" : "period TBD";
  if (days === 1) return isKo ? "1일" : "1 day";
  if (days === 7) return isKo ? "7일" : "7 days";
  if (days === 14) return isKo ? "14일" : "14 days";
  if (days === 30) return isKo ? "30일" : "30 days";
  return isKo ? `${days}일` : `${days} days`;
}

/**
 * 가격 표기 — **금액과 기간을 절대 분리하지 않는다** (D-05/②).
 *
 * "₩2,500만 / 1일" 로 표기하면서 실제로는 7일 상품가를 쓰는 것이 지금의
 * 문제다. 이 함수는 금액과 그 금액이 성립하는 일수를 함께 받아야만 한다.
 *
 * @param days 이 금액이 성립하는 **실제 상품 일수**
 */
export function formatMediaPrice(
  won: number | null | undefined,
  days: number,
  locale = "ko-KR",
  opts?: { isEstimate?: boolean },
): string {
  if (won == null || !Number.isFinite(won) || won <= 0) {
    return mediaPriceOnInquiryLabel(locale);
  }
  const amount = formatMediaPriceCompactWon(won, locale);
  const period = formatProductPeriod(days, locale);
  const base = `${amount} / ${period}`;
  if (!opts?.isEstimate) return base;
  return locale.startsWith("ko") ? `${base} (추정)` : `${base} (est.)`;
}

// ─────────────────────────────────────────────────────────────────
// SOV 미적용 상태 표시 (관리자 전용)
// ─────────────────────────────────────────────────────────────────

/**
 * 이 매체의 노출·CPM 이 **SOV 미적용 상태**인지.
 *
 * loop 매체(DOOH·옥내 사이니지)는 소재 점유율만큼만 내 노출이다.
 * 현재 스키마에는 `spotDuration`/`loopDuration` 컬럼이 아예 없어서
 * SOV 를 적용할 수 없고, 그래서 노출이 최대 20배 부풀어 있다.
 *
 * 문제는 이 값들이 **정상 범위 안**이라 CPM 극단값 가드에 걸리지 않는다는
 * 것이다. 즉 "일관되게 틀린" 상태로 조용히 굳는다. 관리자 화면에 상태를
 * 계속 띄워서 5b 까지 잊히지 않게 한다.
 */
export function needsSovBadge(media: {
  type?: string | null;
  subCategory?: string | null;
  mediaSubCategory?: string | null;
}): boolean {
  return !isStaticMedia({
    type: media.type,
    subCategory: media.mediaSubCategory ?? media.subCategory,
  });
}

/** 관리자 배지 문구 — 화면에서 잊히는 것을 막는 것이 목적이다 */
export function sovBadgeLabel(locale = "ko-KR"): string {
  return locale.startsWith("ko")
    ? "SOV 미적용 · 5b 대기"
    : "SOV not applied · pending 5b";
}

// ─────────────────────────────────────────────────────────────────
// 노출
// ─────────────────────────────────────────────────────────────────

/** 노출 수 축약 표기 — 카드·목록·제안서 공통 */
export function formatImpressions(
  impressions: number | null | undefined,
  locale = "ko-KR",
): string | null {
  if (
    impressions == null ||
    !Number.isFinite(impressions) ||
    impressions <= 0
  ) {
    return null;
  }
  const isKo = locale.startsWith("ko");
  const n = Math.round(impressions);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (isKo && n >= 10_000) return `${Math.round(n / 10_000)}만`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(isKo ? "ko-KR" : "en-US");
}
