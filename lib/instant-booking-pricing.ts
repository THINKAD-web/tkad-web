import type { MediaItem } from "@/lib/media-data";
import { normalizeMonthlyPriceWon } from "@/lib/instant-booking-eligibility";
import { resolveMediaProductPrice } from "@/lib/metrics/media-price-adapter";

export function countBookingDays(start: Date, end: Date): number {
  const s = startOfDay(start);
  const e = startOfDay(end);
  if (e < s) return 0;
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * 기간별 즉시예약 집행 금액 (원).
 *
 * 이 함수는 광고주가 실제로 결제하는 금액을 산출한다 —
 * `/api/instant-bookings` 가 그대로 charge 한다. 표시 계층의 계산과
 * 갈리면 안 된다.
 *
 * 우선순위 (V-5·R-1 동일):
 *   1. `priceOptions` 를 볼 수 있으면 등록 상품가 정확 일치 → 보간
 *   2. 아니면 기존 월 환산 × 일할 (호출부가 옵션을 안 주는 legacy 경로)
 *
 * legacy 경로는 D-04 패턴 그대로다. 옵션이 없는 매체에서만 동작한다.
 */
export function calculateInstantBookingAmount(opts: {
  monthlyPriceWon: number;
  pricePeriod?: string | null;
  startDate: Date;
  endDate: Date;
  /** 옵션을 넘기면 등록 상품가 우선 경로로 진입한다 (권장) */
  media?: Pick<MediaItem, "price" | "pricePeriod" | "priceOptions">;
}): number {
  const days = countBookingDays(opts.startDate, opts.endDate);
  if (days <= 0) return 0;

  if (opts.media) {
    const product = resolveMediaProductPrice(opts.media, days);
    if (product) {
      return Math.max(1, product.amount);
    }
  }

  const monthly = normalizeMonthlyPriceWon(
    opts.monthlyPriceWon,
    opts.pricePeriod,
  );
  const daily = monthly / 30;
  return Math.max(1, Math.round(daily * days));
}

export function computeInstantBookingAmount(
  media: Pick<MediaItem, "price" | "pricePeriod" | "priceOptions">,
  startDate: Date,
  endDate: Date,
): number {
  return calculateInstantBookingAmount({
    monthlyPriceWon: media.price,
    pricePeriod: media.pricePeriod,
    startDate,
    endDate,
    media,
  });
}

export function creativeSpecGuide(media: {
  widthM?: number;
  heightM?: number;
  resolution?: string;
  type: string;
}): { ko: string[]; en: string[] } {
  const linesKo: string[] = [];
  const linesEn: string[] = [];
  if (media.widthM && media.heightM) {
    const w = Math.round(media.widthM * 100);
    const h = Math.round(media.heightM * 100);
    linesKo.push(`권장 규격: 약 ${w}×${h}cm (물리 설치 기준)`);
    linesEn.push(`Suggested size: ~${w}×${h}cm (physical)`);
  }
  if (media.resolution) {
    linesKo.push(`해상도: ${media.resolution}`);
    linesEn.push(`Resolution: ${media.resolution}`);
  }
  linesKo.push("디지털: JPG/PNG(정지) 또는 MP4(H.264, 15–30초 권장)");
  linesEn.push("Digital: JPG/PNG or MP4 (H.264, 15–30s recommended)");
  linesKo.push("안전 영역 10% 여백, 텍스트는 고대비로 제작해 주세요.");
  linesEn.push("Keep 10% safe margin; use high-contrast text.");
  return { ko: linesKo, en: linesEn };
}
