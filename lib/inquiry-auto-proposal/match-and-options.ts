import type { MediaItem } from "@/lib/media-data";
import { resolveMonthlyListPriceWon } from "@/lib/media-metrics";
import {
  evaluateProposalCandidate,
  type ProposalCandidateInput,
  type ProposalExcludeReason,
} from "./candidate-filter";
import type { ParsedInquiryProposal } from "./parse-inquiry-text";
import { PILOT_NAMED_SKU_NAMES } from "./pilot-skus";

export type ProposalCatalogRow = ProposalCandidateInput & {
  item: MediaItem;
  location?: string | null;
  regionSub?: string | null;
};

export type MatchedProposalMedia = {
  id: string;
  name: string;
  monthlyWon: number;
  matchKind: "named" | "pilot" | "category";
  eligible: boolean;
  reasons: ProposalExcludeReason[];
  sellingUnitUndeclared: boolean;
  cpmWon: number | null;
  mediaClass: string;
};

export type ProposalOption = {
  optionId: string;
  kind: "single" | "combo";
  mediaIds: string[];
  names: string[];
  monthlyWon: number;
  sellingUnitFollowUp: boolean;
};

const AIRPORT_NOISE_RE = /공항철도|에어부산|리무진|기내|항공기/;

function hay(row: ProposalCatalogRow): string {
  return [row.name, row.location, row.item.description, row.regionSub]
    .filter(Boolean)
    .join(" ");
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

function monthlyWon(row: ProposalCatalogRow): number {
  return resolveMonthlyListPriceWon(row.item);
}

function isRestStopLed(row: ProposalCatalogRow): boolean {
  const h = hay(row);
  return /휴게소/.test(h) && /LED|전광|사이니지|미디어|디지털/i.test(h);
}

function isIncheonAirportTerminal(row: ProposalCatalogRow): boolean {
  if (AIRPORT_NOISE_RE.test(row.name)) return false;
  if (row.regionSub === "incheon_airport") {
    return /인천\s*국제?공항|인천공항/.test(hay(row));
  }
  return /인천\s*국제?공항|인천공항/.test(row.name);
}

function namedHit(row: ProposalCatalogRow, parsed: ParsedInquiryProposal): boolean {
  const compactText = normalize(parsed.raw);
  const nameN = normalize(row.name);
  const short = normalize(row.name.replace(/광고$/, ""));
  if (nameN.length >= 6 && compactText.includes(nameN)) return true;
  if (short.length >= 6 && compactText.includes(short)) return true;
  return parsed.namedNeedles.some((n) => normalize(n) === nameN);
}

function matchKindFor(
  row: ProposalCatalogRow,
  parsed: ParsedInquiryProposal,
): MatchedProposalMedia["matchKind"] | null {
  if (namedHit(row, parsed)) return "named";
  if (
    parsed.wantsAirport &&
    PILOT_NAMED_SKU_NAMES.includes(
      row.name as (typeof PILOT_NAMED_SKU_NAMES)[number],
    )
  ) {
    return "pilot";
  }
  if (parsed.wantsRestStopLed && isRestStopLed(row)) return "category";
  if (
    parsed.wantsAirport &&
    parsed.namedNeedles.length === 0 &&
    isIncheonAirportTerminal(row)
  ) {
    return "category";
  }
  return null;
}

export function matchInquiryMedia(
  catalog: readonly ProposalCatalogRow[],
  parsed: ParsedInquiryProposal,
): MatchedProposalMedia[] {
  const out: MatchedProposalMedia[] = [];
  for (const row of catalog) {
    if (!row.isActive) continue;
    const kind = matchKindFor(row, parsed);
    if (!kind) continue;
    const decision = evaluateProposalCandidate(row);
    out.push({
      id: row.id,
      name: row.name,
      monthlyWon: monthlyWon(row),
      matchKind: kind,
      eligible: decision.eligible,
      reasons: decision.reasons,
      sellingUnitUndeclared: decision.sellingUnitUndeclared,
      cpmWon: decision.cpmWon,
      mediaClass: decision.mediaClass,
    });
  }
  return out.sort((a, b) => a.monthlyWon - b.monthlyWon);
}

function optionId(ids: string[]): string {
  const sorted = [...ids].sort();
  return sorted.length === 1
    ? `single:${sorted[0]}`
    : `combo:${sorted.join("+")}`;
}

const MAX_SINGLES = 8;
const MAX_COMBOS = 8;

export function buildProposalOptions(
  matched: readonly MatchedProposalMedia[],
  budgetWon: number,
): ProposalOption[] {
  const eligible = matched.filter((m) => m.eligible);
  const singles: ProposalOption[] = eligible
    .filter((m) => m.monthlyWon > 0 && m.monthlyWon <= budgetWon)
    .slice(0, MAX_SINGLES)
    .map((m) => ({
      optionId: optionId([m.id]),
      kind: "single" as const,
      mediaIds: [m.id],
      names: [m.name],
      monthlyWon: m.monthlyWon,
      sellingUnitFollowUp: m.sellingUnitUndeclared,
    }));

  const combos: ProposalOption[] = [];
  for (let i = 0; i < eligible.length && combos.length < MAX_COMBOS; i++) {
    for (let j = i + 1; j < eligible.length && combos.length < MAX_COMBOS; j++) {
      const a = eligible[i]!;
      const b = eligible[j]!;
      const sum = a.monthlyWon + b.monthlyWon;
      if (sum <= 0 || sum > budgetWon) continue;
      combos.push({
        optionId: optionId([a.id, b.id]),
        kind: "combo",
        mediaIds: [a.id, b.id],
        names: [a.name, b.name],
        monthlyWon: sum,
        sellingUnitFollowUp: a.sellingUnitUndeclared || b.sellingUnitUndeclared,
      });
    }
  }

  return [...singles, ...combos];
}

export function findOption(
  options: readonly ProposalOption[],
  optionIdValue: string,
): ProposalOption | null {
  return options.find((o) => o.optionId === optionIdValue) ?? null;
}
