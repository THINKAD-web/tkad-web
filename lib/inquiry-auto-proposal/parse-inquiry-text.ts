import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";
import {
  DEFAULT_PILOT_BUDGET_WON,
  PILOT_NAMED_SKU_NAMES,
} from "./pilot-skus";

export type ParsedInquiryProposal = {
  raw: string;
  budgetWon: number;
  budgetAssumed: boolean;
  months: number;
  wantsAirport: boolean;
  wantsRestStopLed: boolean;
  namedNeedles: string[];
};

function normalizeHay(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

export function parseInquiryProposalText(text: string): ParsedInquiryProposal {
  const raw = text.trim();
  const forParse = raw.replace(/(\d),(?=\d{3})/g, "$1");
  const parsed = parsePlannerFreetextBrief(forParse);
  const budgetMan = parsed.fields.budgetMan.value;
  const budgetAssumed = budgetMan == null || budgetMan <= 0;
  const budgetWon = budgetAssumed
    ? DEFAULT_PILOT_BUDGET_WON
    : Math.round(budgetMan * 10_000);
  const monthsRaw = parsed.fields.months.value;
  const days = parsed.fields.durationDays.value;
  const months =
    monthsRaw != null && monthsRaw > 0
      ? monthsRaw
      : days != null && days > 0
        ? Math.max(1, Math.round(days / 30))
        : 1;

  const wantsAirport = /인천\s*국제?공항|키로뷰|incheon\s*airport/i.test(raw);
  const wantsRestStopLed =
    /휴게소/.test(raw) && /LED|전광|사이니지|미디어|디지털/i.test(raw);

  const namedNeedles: string[] = [];
  const compact = normalizeHay(raw);
  for (const name of PILOT_NAMED_SKU_NAMES) {
    const n = normalizeHay(name.replace(/광고$/, ""));
    if (compact.includes(n) || compact.includes(normalizeHay(name))) {
      namedNeedles.push(name);
    }
  }

  return {
    raw,
    budgetWon,
    budgetAssumed,
    months,
    wantsAirport,
    wantsRestStopLed,
    namedNeedles,
  };
}
