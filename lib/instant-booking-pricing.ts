import type { MediaItem } from "@/lib/media-data";
import { normalizeMonthlyPriceWon } from "@/lib/instant-booking-eligibility";

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

/** 기간별 집행 금액 (원) — 월 단가를 일할 계산 (최소 1일) */
export function calculateInstantBookingAmount(opts: {
  monthlyPriceWon: number;
  pricePeriod?: string | null;
  startDate: Date;
  endDate: Date;
}): number {
  const days = countBookingDays(opts.startDate, opts.endDate);
  if (days <= 0) return 0;
  const monthly = normalizeMonthlyPriceWon(
    opts.monthlyPriceWon,
    opts.pricePeriod,
  );
  const daily = monthly / 30;
  return Math.max(1, Math.round(daily * days));
}

export function computeInstantBookingAmount(
  media: Pick<MediaItem, "price" | "pricePeriod">,
  startDate: Date,
  endDate: Date,
): number {
  return calculateInstantBookingAmount({
    monthlyPriceWon: media.price,
    pricePeriod: media.pricePeriod,
    startDate,
    endDate,
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
