import { OOH_QUOTE_WON_PER_MANWON } from "@/lib/ooh-quote-amount";
import { isQuoteAddonLineId } from "@/lib/quote-addon-line";
import type { QuoteBreakdown } from "@/lib/quote-calculator";
import type { OohContractMeta } from "@/lib/ooh-contract-meta";
import { formatContractAmountKorean } from "@/lib/ooh-contract-format";

/**
 * OoHQuote.totalAmount 는 만원 단위가 원칙.
 * 원(KRW)이 그대로 들어간 값에 ×10,000 을 한 번 더 하면
 * ₩165,000,000,000 같은 표기가 나온다.
 *
 * 100억 원(= 1,000,000만)을 넘는 만원 저장은 실무상 없고,
 * 그 이상이면 원 단위가 필드에 들어간 것으로 본다.
 */
const MANWON_FIELD_WON_MISTAKEN_MIN = 1_000_000;

export function supplyWonFromManwonField(
  stored: number,
  referenceSupplyWon?: number | null,
): number {
  if (!Number.isFinite(stored) || stored <= 0) return 0;
  if (
    referenceSupplyWon != null &&
    referenceSupplyWon > 0 &&
    Math.abs(stored - referenceSupplyWon) / referenceSupplyWon < 0.08
  ) {
    return Math.round(referenceSupplyWon);
  }
  if (stored >= MANWON_FIELD_WON_MISTAKEN_MIN) {
    return Math.round(stored);
  }
  return Math.round(stored * OOH_QUOTE_WON_PER_MANWON);
}

export function vatFromSupplyWon(supplyWon: number): number {
  return Math.round(Math.max(0, supplyWon) * 0.1);
}

export type ContractMoneyMediaLine = {
  name: string;
  location: string;
  spec: string;
  supplyWon: number;
};

/** 계약서·청구서·요약·메일·어드민이 공유하는 금액 SSOT */
export type ContractMoneyBreakdown = {
  mediaLines: ContractMoneyMediaLine[];
  /** 매체 라인 합 (카탈로그/견적) */
  mediaSubtotalWon: number;
  /** 어드민 계약금액(매체비, VAT별도). 라인 없으면 이 값이 매체비 */
  contractMediaSupplyWon: number;
  /** contractMediaSupplyWon - mediaSubtotalWon. 0이면 표에서 생략 */
  adjustmentWon: number;
  /** @deprecated contractMediaSupplyWon 과 동일. 기존 호출부 호환 */
  mediaSupplyWon: number;
  extraProductionWon: number;
  extraInstallWon: number;
  extraOtherWon: number;
  supplyWon: number;
  vatWon: number;
  totalWon: number;
  amountKorean: string;
  totalAmountDisplay: string;
  adUnitPriceDisplay: string;
  productionDisplay: string;
};

/** 어드민 제작비 텍스트·금액 필드에서 원화 추출 */
export function parseWonFromLooseAdminInput(raw: string | undefined): number {
  const t = raw?.trim() ?? "";
  if (!t) return 0;
  const man = t.match(/([\d,.]+)\s*만(?:\s*원)?/u);
  if (man) {
    const n = Number(man[1]!.replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) return Math.round(n * OOH_QUOTE_WON_PER_MANWON);
  }
  const digits = t.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 1_000_000) return n;
  if (n >= 100 && n < 1_000_000 && /만/u.test(t)) {
    return Math.round(n * OOH_QUOTE_WON_PER_MANWON);
  }
  return n;
}

export function productionCostLooksLikeWonAmountOnly(raw: string | undefined): boolean {
  const t = raw?.trim() ?? "";
  if (!t) return false;
  if (/만/u.test(t)) return true;
  const digits = t.replace(/[^\d]/g, "");
  if (digits.length < 5) return false;
  return /^[\d,\s원₩￦.]+$/u.test(t);
}

function numMetaField(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/** 계약 PDF·총액용 부가비용 — meta 숫자 → 제작비 텍스트 → 견적 addon 라인 */
export function resolveContractExtraWons(
  meta: OohContractMeta,
  breakdown: QuoteBreakdown | null | undefined,
): {
  extraProductionWon: number;
  extraInstallWon: number;
  extraOtherWon: number;
} {
  let extraProductionWon = numMetaField(meta.extraProductionWon);
  let extraInstallWon = numMetaField(meta.extraInstallWon);
  let extraOtherWon = numMetaField(meta.extraOtherWon);

  if (!extraProductionWon && meta.productionCost) {
    extraProductionWon = parseWonFromLooseAdminInput(meta.productionCost);
  }

  for (const line of breakdown?.lines ?? []) {
    if (!isQuoteAddonLineId(line.mediaId)) continue;
    const amt = Math.round(line.lineSupplyWon ?? 0);
    if (amt <= 0) continue;
    const name = line.mediaName;
    if (/제작|디자인|production/i.test(name)) {
      if (!extraProductionWon) extraProductionWon = amt;
      continue;
    }
    if (/설치/i.test(name)) {
      if (!extraInstallWon) extraInstallWon = amt;
      continue;
    }
    if (!extraOtherWon) extraOtherWon = amt;
  }

  return { extraProductionWon, extraInstallWon, extraOtherWon };
}

function wonExVat(n: number): string {
  return `￦ ${Math.max(0, Math.round(n)).toLocaleString("ko-KR")}원(VAT별도)`;
}

function wonIncVat(n: number): string {
  return `￦ ${Math.max(0, Math.round(n)).toLocaleString("ko-KR")}(VAT포함)`;
}

const GENERIC_PRODUCTION = new Set(["", "제작비", "자체제작", "디자인비"]);

export function formatProductionDesignDisplay(
  productionWon: number,
  productionCostText?: string,
): string {
  const note = productionCostText?.trim() ?? "";
  const noteIsGeneric = !note || GENERIC_PRODUCTION.has(note);
  if (productionWon > 0) {
    const money = wonExVat(productionWon);
    return noteIsGeneric ? money : `${money} ${note}`;
  }
  if (note && !noteIsGeneric) return note;
  return "해당 없음";
}

export function formatAdUnitPriceDisplay(
  contractMediaSupplyWon: number,
  mediaCount: number,
): string {
  if (contractMediaSupplyWon <= 0) return "별도 협의";
  const base = wonExVat(contractMediaSupplyWon);
  if (mediaCount >= 2) return `${base} — 매체별 내역 참조`;
  return base;
}

/** 숫자·N기 가 아니면 문장형 수량으로 본다 */
export function isSentenceMediaCount(raw: string | undefined): boolean {
  const t = raw?.trim() ?? "";
  if (!t) return false;
  return !/^\d+\s*기?$/u.test(t);
}

export function resolveContractMediaCountLabel(input: {
  mediaUnitCount: number;
  adminMediaCount?: string;
}): { label: string; overridden: boolean } {
  const auto = `${Math.max(1, Math.round(input.mediaUnitCount || 1))}기`;
  const admin = input.adminMediaCount?.trim() ?? "";
  if (!admin) return { label: auto, overridden: false };
  if (isSentenceMediaCount(admin)) return { label: admin, overridden: false };
  const n = parseInt(admin, 10);
  if (Number.isFinite(n) && n === Math.max(1, input.mediaUnitCount)) {
    return { label: auto, overridden: false };
  }
  return { label: auto, overridden: true };
}

export function buildContractMoney(input: {
  mediaLines?: readonly ContractMoneyMediaLine[];
  /** 합의된 매체비(VAT별도 원). 생략 시 라인 합 또는 mediaSupplyWon */
  contractMediaSupplyWon?: number;
  /** 라인 없이 매체비 하나만 줄 때 (기존 호출) */
  mediaSupplyWon?: number;
  extraProductionWon?: number;
  extraInstallWon?: number;
  extraOtherWon?: number;
  productionCostText?: string;
  /** 카탈로그 추정 라인과 합의 매체비가 다를 때 협의 조정 행 생략 (standalone 작성) */
  suppressAdjustmentRow?: boolean;
}): ContractMoneyBreakdown {
  const mediaLines = (input.mediaLines ?? []).map((line) => ({
    name: line.name,
    location: line.location ?? "",
    spec: line.spec ?? "",
    supplyWon: Math.max(0, Math.round(line.supplyWon)),
  }));
  const mediaSubtotalWon = mediaLines.reduce((s, l) => s + l.supplyWon, 0);
  const hasLines = mediaLines.length > 0;
  const contractMediaSupplyWon = Math.max(
    0,
    Math.round(
      input.contractMediaSupplyWon ??
        input.mediaSupplyWon ??
        mediaSubtotalWon,
    ),
  );
  const adjustmentWon =
    hasLines && !input.suppressAdjustmentRow
      ? contractMediaSupplyWon - mediaSubtotalWon
      : 0;
  const extraProductionWon = Math.max(0, Math.round(input.extraProductionWon ?? 0));
  const extraInstallWon = Math.max(0, Math.round(input.extraInstallWon ?? 0));
  const extraOtherWon = Math.max(0, Math.round(input.extraOtherWon ?? 0));
  const supplyWon =
    contractMediaSupplyWon + extraProductionWon + extraInstallWon + extraOtherWon;
  const vatWon = vatFromSupplyWon(supplyWon);
  const totalWon = supplyWon + vatWon;
  const mediaCount = Math.max(1, mediaLines.length || 1);
  return {
    mediaLines,
    mediaSubtotalWon: hasLines ? mediaSubtotalWon : contractMediaSupplyWon,
    contractMediaSupplyWon,
    adjustmentWon,
    mediaSupplyWon: contractMediaSupplyWon,
    extraProductionWon,
    extraInstallWon,
    extraOtherWon,
    supplyWon,
    vatWon,
    totalWon,
    amountKorean: formatContractAmountKorean(totalWon),
    totalAmountDisplay: wonIncVat(totalWon),
    adUnitPriceDisplay: formatAdUnitPriceDisplay(contractMediaSupplyWon, mediaCount),
    productionDisplay: formatProductionDesignDisplay(
      extraProductionWon,
      input.productionCostText,
    ),
  };
}
