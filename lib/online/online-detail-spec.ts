import type { MediaOnlineSpecView } from "@/lib/media-data";
import { onlineBillingTypeLabel } from "@/lib/online/online-billing-label";
import { formatTargetingSummary } from "@/lib/online/online-targeting-tags";

export type OnlineDetailSpecRow = {
  label: string;
  value: string;
};

/**
 * `targetingOptions`가 `category:VALUE` 태그로 구조화돼 있으면 그룹 요약
 * ("업종: 이커머스·뷰티 / 목표: 인지도 / ...")을 보여준다. 파싱 가능한 태그가
 * 하나도 없을 때만(과거 데이터·플레이스홀더) "가능"/"문의"로 폴백.
 */
export function onlineTargetingLabel(
  spec: MediaOnlineSpecView | null | undefined,
  isKo: boolean,
): string {
  const opts = spec?.targetingOptions ?? [];
  const summary = formatTargetingSummary(opts, isKo);
  if (summary) return summary;
  if (opts.length > 0) {
    return isKo ? "가능" : "Available";
  }
  return isKo ? "문의" : "Inquire";
}

export function formatOnlineMinBudgetWon(
  spec: MediaOnlineSpecView | null | undefined,
  locale: string,
): string {
  const min = spec?.minBudget;
  if (min == null || min <= 0) {
    return "—";
  }
  return `${min.toLocaleString(locale)}원`;
}

export function buildOnlineDetailSpecRows(input: {
  typeLabel: string;
  platform: string | null | undefined;
  spec: MediaOnlineSpecView | null | undefined;
  slug: string | undefined;
  isKo: boolean;
}): OnlineDetailSpecRow[] {
  const locale = input.isKo ? "ko-KR" : "en-US";
  const platform = input.platform?.trim() || "—";
  const billing = onlineBillingTypeLabel(input.spec, input.slug, input.isKo);
  const targeting = onlineTargetingLabel(input.spec, input.isKo);
  const minBudget = formatOnlineMinBudgetWon(input.spec, locale);
  const device = input.isKo ? "PC/모바일 동일" : "PC & mobile";

  if (input.isKo) {
    return [
      { label: "유형", value: input.typeLabel },
      { label: "플랫폼", value: platform },
      { label: "과금방식", value: billing },
      { label: "타겟팅", value: targeting },
      { label: "최소 집행금액", value: minBudget },
      { label: "디바이스", value: device },
    ];
  }

  return [
    { label: "Type", value: input.typeLabel },
    { label: "Platform", value: platform },
    { label: "Billing", value: billing },
    { label: "Targeting", value: targeting },
    { label: "Min. budget", value: minBudget },
    { label: "Devices", value: device },
  ];
}
