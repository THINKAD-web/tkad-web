import type { MediaItem } from "@/lib/media-data";

/** 월 집행 비용 상한 (원) — 소액 DOOH 즉시 예약 대상 */
export const INSTANT_BOOKING_MAX_MONTHLY_WON = 5_000_000;

export type InstantBookingEligibility = {
  eligible: boolean;
  reasonKo?: string;
  reasonEn?: string;
};

export function isInstantBookingEligible(
  media: Pick<
    MediaItem,
    "type" | "price" | "pricePeriod" | "availability" | "catalogSource"
  >,
): InstantBookingEligibility {
  if (media.catalogSource === "network") {
    return {
      eligible: false,
      reasonKo: "패키지 네트워크 매체는 즉시 예약을 지원하지 않습니다.",
      reasonEn: "Instant booking is not available for network packages.",
    };
  }
  if (media.type !== "digital") {
    return {
      eligible: false,
      reasonKo: "디지털(DOOH) 매체만 즉시 예약할 수 있습니다.",
      reasonEn: "Instant booking is only for digital (DOOH) media.",
    };
  }
  if (media.availability && media.availability !== "available") {
    return {
      eligible: false,
      reasonKo: "현재 예약 가능 상태가 아닙니다.",
      reasonEn: "This media is not available for booking.",
    };
  }
  const monthly = normalizeMonthlyPriceWon(media.price, media.pricePeriod);
  if (monthly > INSTANT_BOOKING_MAX_MONTHLY_WON) {
    return {
      eligible: false,
      reasonKo: `월 ${(INSTANT_BOOKING_MAX_MONTHLY_WON / 1_000_000).toFixed(0)}백만원 이하 매체만 즉시 예약됩니다.`,
      reasonEn: `Instant booking is limited to media under ₩${INSTANT_BOOKING_MAX_MONTHLY_WON.toLocaleString()}/month.`,
    };
  }
  return { eligible: true };
}

export function normalizeMonthlyPriceWon(
  price: number,
  period?: string | null,
): number {
  const p = period?.toLowerCase() ?? "month";
  switch (p) {
    case "day":
      return price * 30;
    case "week":
      return price * 4;
    case "biweekly":
      return price * 2;
    case "month":
    default:
      return price;
  }
}
