import type { ContactBudgetV2, ContactRegion } from "@/lib/contact-lead-schema";
import { CONTACT_BUDGET_V2, CONTACT_REGIONS } from "@/lib/contact-lead-schema";

const CUID_RE = /\b[c][a-z0-9]{20,28}\b/gi;

export type ParsedInquiryQuoteIntent = {
  mediaIds: string[];
  durationDays: number;
  startDate: Date | null;
  budgetCode: string | null;
  regions: ContactRegion[];
};

export function parseMediaIdsFromText(text: string): string[] {
  const ids = new Set<string>();

  const labeled =
    text.match(/(?:매체\s*ID|Media\s*IDs?)\s*[:：]\s*([^\n]+)/i)?.[1] ?? "";
  if (labeled) {
    for (const part of labeled.split(/[,，\s]+/)) {
      const t = part.trim();
      if (t.length >= 20) ids.add(t);
    }
  }

  for (const m of text.matchAll(CUID_RE)) {
    ids.add(m[0]);
  }

  return [...ids];
}

export function parseDurationDaysFromText(text: string): number | null {
  const ko = text.match(/집행\s*기간\s*[:：]?\s*(\d+)\s*일/i);
  if (ko) return Math.max(1, parseInt(ko[1], 10));
  const en = text.match(/Duration\s*[:：]?\s*(\d+)\s*days?/i);
  if (en) return Math.max(1, parseInt(en[1], 10));
  return null;
}

export function parseStartDateFromText(text: string): Date | null {
  const m = text.match(
    /(?:희망\s*집행\s*시작일|Desired\s*start)\s*[:：]\s*(\d{4}-\d{2}-\d{2}|\d{4}\.\d{1,2}\.\d{1,2})/i,
  );
  if (!m) return null;
  const raw = m[1].replace(/\./g, "-");
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseRegionsFromStoredMessage(text: string): ContactRegion[] {
  const out: ContactRegion[] = [];
  for (const code of CONTACT_REGIONS) {
    if (text.includes(code.replace(/_/g, " "))) out.push(code);
  }
  const koBlock = text.match(/희망\s*집행\s*지역\s*[:：]\s*([^\n\[]+)/i)?.[1];
  if (koBlock) {
    if (koBlock.includes("강남")) out.push("seoul_gangnam");
    if (koBlock.includes("도심")) out.push("seoul_downtown");
    if (koBlock.includes("수도권")) out.push("metro_area");
    if (koBlock.includes("지방")) out.push("regional_cities");
    if (koBlock.includes("전국")) out.push("nationwide");
  }
  return [...new Set(out)];
}

export function parseBudgetCodeFromLabel(budgetLabel: string): string | null {
  const t = budgetLabel.trim();
  for (const code of CONTACT_BUDGET_V2) {
    if (t.includes(code)) return code;
  }
  if (t.includes("500만") || t.includes("Under")) return "under_5m";
  if (t.includes("3000만") || t.includes("30M+")) return "over_30m";
  return null;
}

export function buildParsedInquiryQuoteIntent(opts: {
  message: string;
  budgetLabel?: string;
  explicitMediaIds?: string[];
  startDateRaw?: string;
  regions?: ContactRegion[];
  budgetCode?: ContactBudgetV2;
}): ParsedInquiryQuoteIntent {
  const fromText = parseMediaIdsFromText(opts.message);
  const mediaIds = [
    ...new Set([
      ...(opts.explicitMediaIds ?? []).filter(Boolean),
      ...fromText,
    ]),
  ];

  const durationFromText = parseDurationDaysFromText(opts.message);
  const durationDays = durationFromText ?? 30;

  let startDate: Date | null = null;
  if (opts.startDateRaw?.trim()) {
    const d = new Date(opts.startDateRaw.trim());
    if (!Number.isNaN(d.getTime())) startDate = d;
  }
  if (!startDate) startDate = parseStartDateFromText(opts.message);

  const regions =
    opts.regions && opts.regions.length > 0
      ? opts.regions
      : parseRegionsFromStoredMessage(opts.message);

  const budgetCode =
    opts.budgetCode ??
    (opts.budgetLabel
      ? parseBudgetCodeFromLabel(opts.budgetLabel)
      : null);

  return {
    mediaIds,
    durationDays,
    startDate,
    budgetCode,
    regions,
  };
}

export function regionWhereClause(
  regions: ContactRegion[],
): { OR: Array<Record<string, unknown>> } | undefined {
  if (regions.length === 0) return undefined;
  const or: Array<Record<string, unknown>> = [];
  for (const r of regions) {
    switch (r) {
      case "seoul_gangnam":
        or.push({ region: { contains: "강남" } });
        or.push({ regionZone: "seoul_gangnam" });
        break;
      case "seoul_downtown":
        or.push({ region: { contains: "도심" } });
        or.push({ region: { in: ["서울 중구", "서울 종로", "명동"] } });
        break;
      case "metro_area":
        or.push({ region: { contains: "경기" } });
        or.push({ region: { contains: "인천" } });
        break;
      case "regional_cities":
        or.push({ region: { not: { contains: "서울" } } });
        break;
      case "nationwide":
        or.push({ isActive: true });
        break;
      default:
        or.push({ region: { contains: "서울" } });
    }
  }
  return or.length ? { OR: or } : undefined;
}
