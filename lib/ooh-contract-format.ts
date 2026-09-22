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
  return `￦ ${n.toLocaleString("ko-KR")}(VAT포함)`;
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

/** 매체명·캠페인명 끝에 이미 "광고"가 있으면 true */
export function mediaNameAlreadyHasAdSuffix(name: string): boolean {
  const t = name.trim();
  return /광고\s*$/u.test(t);
}

/** "광고 광고" 등 중복 접미 제거 */
export function dedupeCampaignAdSuffix(text: string): string {
  let out = text.trim();
  out = out.replace(/광고\s+광고/gu, "광고");
  out = out.replace(/(광고)\s*광고\s*$/u, "$1");
  return out;
}

/**
 * 제1조 광고명칭 — 단일: "OOO 광고", 다중: "첫매체 광고 외 4건"
 * override가 있으면 중복 "광고"만 정리해 사용.
 */
export function formatContractCampaignName(
  mediaNames: readonly string[],
  override?: string | null,
): string {
  const custom = override?.trim();
  if (custom) return dedupeCampaignAdSuffix(custom);

  const names = mediaNames.map((n) => n.trim()).filter(Boolean);
  if (names.length === 0) return "옥외광고 집행";

  const first = names[0]!;
  const base = mediaNameAlreadyHasAdSuffix(first) ? first : `${first} 광고`;
  if (names.length === 1) return dedupeCampaignAdSuffix(base);
  return dedupeCampaignAdSuffix(`${base} 외 ${names.length - 1}건`);
}

export function formatContractAdUnitPriceDisplay(mediaSupplyWon: number): string {
  const n = Math.round(mediaSupplyWon);
  if (!Number.isFinite(n) || n <= 0) return "별도 협의";
  return `￦ ${n.toLocaleString("ko-KR")}원(VAT별도)`;
}

export function formatContractDesignProductionLine(
  productionCost: string,
  costLines?: readonly { label: string; amountWon: number }[],
): string {
  const parts: string[] = [];
  const prod = productionCost.trim();
  if (prod && prod !== "—") parts.push(prod);
  for (const line of costLines ?? []) {
    if (line.amountWon > 0) {
      parts.push(
        `${line.label} ₩ ${Math.round(line.amountWon).toLocaleString("ko-KR")} (VAT별도)`,
      );
    }
  }
  return parts.length > 0 ? parts.join(" / ") : "해당 없음";
}

export function formatContractArticle1PeriodValue(
  periodStart: string,
  periodEnd: string,
  periodMonths: string,
): string {
  const range = periodStart.includes("년")
    ? `${periodStart.replace(/일$/, "").trim()} ~ ${periodEnd.replace(/일$/, "").trim()} (${periodMonths})`
    : `${periodStart} ~ ${periodEnd} (${periodMonths})`;
  return `- ${range}\n- 단, 광고기간은 제작관계상 개시일이 변동될 수 있습니다.`;
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
