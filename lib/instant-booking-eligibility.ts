import type { MediaItem } from "@/lib/media-data";
import { priceToMonthlyEquivalentWon } from "@/lib/media-metrics";

/** 월 집행 비용 상한 (원) — 레거시·참고용 (어드민 수동 토글이 우선) */
export const INSTANT_BOOKING_MAX_MONTHLY_WON = 5_000_000;

export type InstantBookingEligibility = {
  eligible: boolean;
  reasonKo?: string;
  reasonEn?: string;
};

type InstantBookingMedia = Pick<
  MediaItem,
  "availability" | "catalogSource" | "instantBookingEnabled"
>;

export function isInstantBookingEligible(
  media: InstantBookingMedia,
): InstantBookingEligibility {
  if (media.catalogSource === "network") {
    return {
      eligible: false,
      reasonKo: "패키지 네트워크 매체는 즉시 예약을 지원하지 않습니다.",
      reasonEn: "Instant booking is not available for network packages.",
    };
  }
  if (!media.instantBookingEnabled) {
    return {
      eligible: false,
      reasonKo:
        "즉시 예약이 꺼져 있습니다. 어드민 매체 관리 → 노출에서 켜 주세요.",
      reasonEn: "Instant booking is disabled for this media in admin.",
    };
  }
  if (media.availability && media.availability !== "available") {
    return {
      eligible: false,
      reasonKo: "가용 상태가 「예약가능」일 때만 즉시 예약됩니다.",
      reasonEn: "Instant booking requires availability set to available.",
    };
  }
  return { eligible: true };
}

/** 기간 → 월 환산가. SSOT `priceToMonthlyEquivalentWon` (catalog 원 단위 정규화 포함). */
export function normalizeMonthlyPriceWon(
  price: number,
  period?: string | null,
): number {
  return priceToMonthlyEquivalentWon(price, period);
}
