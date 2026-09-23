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

/** 계약서 제1조 등 표시용 — 예: 2026년 9월 27일 (zero-pad 없음) */
export function formatContractPeriodDateDisplayKo(d: Date): string {
  const { y, m, day } = kstParts(d);
  return `${y}년 ${m}월 ${day}일`;
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
  const t = name.trim().replace(/[\s\u00A0\u3000.,·]+$/u, "");
  return /광고$/u.test(t);
}

/** "광고 광고" / "광고광고" 중복 접미 제거 */
export function dedupeCampaignAdSuffix(text: string): string {
  let out = text.trim();
  let prev = "";
  while (out !== prev) {
    prev = out;
    out = out.replace(/광고\s*광고/gu, "광고");
  }
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

const GENERIC_PRODUCTION_LABELS = new Set([
  "제작비",
  "자체제작",
  defaultProductionCostKo(),
]);

export function formatContractDesignProductionLine(
  productionCost: string,
  costLines?: readonly { label: string; amountWon: number }[],
): string {
  const parts: string[] = [];
  const prod = productionCost.trim();
  const prodIsGeneric =
    !prod ||
    GENERIC_PRODUCTION_LABELS.has(prod) ||
    /^[\d,\s원₩￦.]+$/u.test(prod);
  if (prod && !prodIsGeneric) parts.push(prod);

  for (const line of costLines ?? []) {
    if (line.amountWon <= 0) continue;
    const won = Math.round(line.amountWon).toLocaleString("ko-KR");
    parts.push(`${line.label} ￦ ${won}원(VAT별도)`);
  }
  return parts.length > 0 ? parts.join(" / ") : "해당 없음";
}

export function formatContractArticle1PeriodValue(
  periodStart: string,
  periodEnd: string,
  periodMonths: string,
): string {
  const range = `${periodStart} ~ ${periodEnd} (${periodMonths})`;
  return `- ${range}\n- 단, 광고기간은 제작관계상 개시일이 변동될 수 있습니다.`;
}

/**
 * 한국 전화번호 표시.
 * 02는 9자리(02-XXX-XXXX)·10자리(02-XXXX-XXXX),
 * 휴대폰 11자리, 지역번호 10~11자리, 050 계열 12자리.
 */
export function formatKoreanPhoneDisplay(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("82") && digits.length >= 10) {
    digits = `0${digits.slice(2)}`;
  }
  if (!digits.startsWith("0") && digits.length < 8) return trimmed;

  if (digits.startsWith("02")) {
    const rest = digits.slice(2);
    if (rest.length === 7) return `02-${rest.slice(0, 3)}-${rest.slice(3)}`;
    if (rest.length === 8) return `02-${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  if (digits.startsWith("050") && digits.length === 12) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  if (/^01[016789]/.test(digits) && digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (/^0\d{2}/.test(digits) && !digits.startsWith("02")) {
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
  }
  if (/^1[568]\d{6}$/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return trimmed;
}

export function buildMediaContractSpecLabel(media: {
  width?: string | null;
  height?: string | null;
  location?: string | null;
  region?: string | null;
}): string {
  const w = media.width?.trim();
  const h = media.height?.trim();
  const size =
    w && h ? `${w}×${h}` : w || h || "";
  const loc = media.location?.trim() || media.region?.trim() || "";
  if (size && loc) return `${size} · ${loc}`;
  return size || loc || "";
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
