import { inclusiveCampaignDays } from "@/lib/admin-quote-calc";
import { wonToKoreanLegalAmount } from "@/lib/won-to-korean-amount";

const KST = "Asia/Seoul";

function kstParts(d: Date): { y: number; m: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, day] = fmt.format(d).split("-").map(Number);
  return { y: y!, m: m!, day: day! };
}

/** 광고기간 시작/종료 — 예: 2026년 07월 06일 */
export function formatContractPeriodDateKo(d: Date): string {
  const { y, m, day } = kstParts(d);
  return `${y}년 ${String(m).padStart(2, "0")}월 ${String(day).padStart(2, "0")}일`;
}

/** 계약 체결일 — 예: 2026년 6월 29일 (월 zero-pad 없음) */
export function formatContractDateKo(d: Date = new Date()): string {
  const { y, m, day } = kstParts(d);
  return `${y}년 ${m}월 ${day}일`;
}

export function parseIsoDateOnly(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computeContractPeriodMonthsLabel(
  start: Date,
  end: Date,
): string {
  const days = inclusiveCampaignDays(start, end);
  if (days <= 0) return "1개월";
  const months = Math.max(1, Math.round(days / 30));
  return `${months}개월`;
}

/** VAT 포함 최종합계 표기 — 예: ₩ 2,156,000원 (VAT포함) */
export function formatContractTotalAmountVatIncluded(totalWon: number): string {
  const n = Math.max(0, Math.round(totalWon));
  return `₩ ${n.toLocaleString("ko-KR")}원 (VAT포함)`;
}

export function formatContractAmountKorean(totalWon: number): string {
  return wonToKoreanLegalAmount(Math.round(totalWon));
}

/** 매체수량 — 예: 1기 */
export function formatContractMediaCount(count: number): string {
  const n = Math.max(1, Math.round(count));
  return `${n}기`;
}

export function defaultContractPaymentMethodKo(): string {
  return "계산서 발행 후 선결제";
}

export function defaultProductionCostKo(): string {
  return "자체제작";
}

/** ISO 기간 "2026-07-01 ~ 2026-07-31" 또는 단일 문자열 파싱 */
export function parseContractPeriodRange(
  period: string,
): { start: Date | null; end: Date | null } {
  const parts = period.split("~").map((s) => s.trim());
  if (parts.length >= 2) {
    return {
      start: parseIsoDateOnly(parts[0]!) ?? tryParseDate(parts[0]!),
      end: parseIsoDateOnly(parts[1]!) ?? tryParseDate(parts[1]!),
    };
  }
  return { start: null, end: null };
}

function tryParseDate(s: string): Date | null {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
