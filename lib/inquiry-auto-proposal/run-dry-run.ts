import {
  assertAllProposalEligible,
  evaluateProposalCandidate,
} from "./candidate-filter";
import { loadProposalCatalog } from "./load-catalog";
import {
  buildProposalOptions,
  findOption,
  matchInquiryMedia,
  type MatchedProposalMedia,
  type ProposalCatalogRow,
  type ProposalOption,
} from "./match-and-options";
import { parseInquiryProposalText } from "./parse-inquiry-text";
import { buildInquiryAutoProposalPayload } from "./build-proposal";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";
import type { MediaItem } from "@/lib/media-data";

export type InquiryAutoProposalDryRun = {
  parsed: ReturnType<typeof parseInquiryProposalText>;
  matched: MatchedProposalMedia[];
  eligible: MatchedProposalMedia[];
  excluded: MatchedProposalMedia[];
  options: ProposalOption[];
};

export async function runInquiryAutoProposalDryRun(
  text: string,
  catalog?: ProposalCatalogRow[],
): Promise<InquiryAutoProposalDryRun> {
  const parsed = parseInquiryProposalText(text);
  const rows = catalog ?? (await loadProposalCatalog());
  const matched = matchInquiryMedia(rows, parsed);
  const eligible = matched.filter((m) => m.eligible);
  const excluded = matched.filter((m) => !m.eligible);
  const options = buildProposalOptions(matched, parsed.budgetWon);
  return { parsed, matched, eligible, excluded, options };
}

export function resolveOptionPortfolio(
  catalog: readonly ProposalCatalogRow[],
  option: ProposalOption,
): { items: MediaItem[]; sellingUnitFollowUp: boolean } {
  const byId = new Map(catalog.map((r) => [r.id, r]));
  const rows: ProposalCatalogRow[] = [];
  for (const id of option.mediaIds) {
    const row = byId.get(id);
    if (!row) {
      throw new Error(`PROPOSAL_MEDIA_MISSING:${id}`);
    }
    rows.push(row);
  }
  assertAllProposalEligible(rows);
  for (const row of rows) {
    const again = evaluateProposalCandidate(row);
    if (!again.eligible) {
      throw new Error(`PROPOSAL_FILTER_LEAK:${row.id}`);
    }
  }
  return {
    items: rows.map((r) => r.item),
    sellingUnitFollowUp: rows.some(
      (r) => evaluateProposalCandidate(r).sellingUnitUndeclared,
    ),
  };
}

export async function buildInquiryAutoProposalForOption(args: {
  text: string;
  optionId: string;
  catalog?: ProposalCatalogRow[];
}): Promise<{
  dryRun: InquiryAutoProposalDryRun;
  option: ProposalOption;
  payload: PlannerReportExportPayload;
}> {
  const catalog = args.catalog ?? (await loadProposalCatalog());
  const dryRun = await runInquiryAutoProposalDryRun(args.text, catalog);
  const option = findOption(dryRun.options, args.optionId);
  if (!option) {
    throw new Error("PROPOSAL_OPTION_NOT_FOUND");
  }
  const { items, sellingUnitFollowUp } = resolveOptionPortfolio(
    catalog,
    option,
  );
  const payload = buildInquiryAutoProposalPayload({
    portfolio: items,
    parsed: dryRun.parsed,
    sellingUnitFollowUp,
  });
  return { dryRun, option, payload };
}
