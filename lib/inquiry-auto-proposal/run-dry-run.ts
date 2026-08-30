import type { MediaItem } from "@/lib/media-data";
import type { CampaignPlanSnapshot } from "@/lib/campaign-plan-schema";
import type { CampaignBriefInput } from "@/lib/planner/brief/types";
import { buildCampaignPlanSnapshot } from "@/lib/planner/brief/build-plan-snapshot";
import { buildBriefReportPayload } from "@/lib/planner/brief/brief-report-adapter";
import { fetchPlannerMediaCatalog } from "@/lib/public-media-catalog";
import type {
  PlannerExportAppendixMediaSpec,
  PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";
import {
  assertAllProposalEligible,
  evaluateProposalCandidate,
  SELLING_UNIT_FOLLOWUP_LINE_KO,
} from "./candidate-filter";
import { loadProposalCatalog } from "./load-catalog";
import {
  matchInquiryMedia,
  type MatchedProposalMedia,
  type ProposalCatalogRow,
} from "./match-and-options";
import { parseInquiryProposalText } from "./parse-inquiry-text";
import {
  buildInquiryAppendixMediaSpecs,
  isDesignatedInquiryMatch,
  selectInquiryBodyMix,
} from "./select-inquiry-mix";
import { assertInquiryBriefFlight, inquiryToBrief } from "./to-brief";

export type InquiryAutoProposalDryRun = {
  parsed: ReturnType<typeof parseInquiryProposalText>;
  matched: MatchedProposalMedia[];
  /** 이름/pilot 지정 매체 (카테고리 확장 제외) */
  designated: MatchedProposalMedia[];
  eligible: MatchedProposalMedia[];
  excluded: MatchedProposalMedia[];
  brief: CampaignBriefInput;
  mixUnits: Record<string, number>;
  bodyTotalWon: number;
  appendixMediaSpecs: PlannerExportAppendixMediaSpec[];
};

export type InquiryAutoProposalBuild = {
  dryRun: InquiryAutoProposalDryRun;
  snapshot: CampaignPlanSnapshot;
  payload: PlannerReportExportPayload;
};

export type InquiryAutoProposalBuildDeps = {
  proposalCatalog?: ProposalCatalogRow[];
  plannerCatalog?: MediaItem[];
  flightStart?: string;
  generatedAt?: string;
};

function plannerCatalogForMix(
  plannerCatalog: readonly MediaItem[],
  mixIds: readonly string[],
): MediaItem[] {
  const byId = new Map(plannerCatalog.map((m) => [m.id, m]));
  const missing: string[] = [];
  const items: MediaItem[] = [];
  for (const id of mixIds) {
    const hit = byId.get(id);
    if (!hit) {
      missing.push(id);
      continue;
    }
    items.push(hit);
  }
  if (missing.length) {
    throw new Error(`PROPOSAL_PLANNER_CATALOG_GAP:${missing.join(",")}`);
  }
  return items;
}

function inquiryFollowUpLines(dryRun: InquiryAutoProposalDryRun): string[] {
  const lines: string[] = [];
  if (dryRun.parsed.budgetAssumed) {
    lines.push(
      "예산이 본문에서 확실하지 않아 3,000만원으로 가정했습니다. 확정 예산은 확인 후 회신드립니다.",
    );
  }
  if (dryRun.eligible.some((m) => m.sellingUnitUndeclared)) {
    lines.push(SELLING_UNIT_FOLLOWUP_LINE_KO);
  }
  return lines;
}

function withInquiryFollowUp(
  payload: PlannerReportExportPayload,
  lines: string[],
): PlannerReportExportPayload {
  if (lines.length === 0) return payload;
  return {
    ...payload,
    sections: [
      ...(payload.sections ?? []),
      { title: "확인 후 회신", lines },
    ],
  };
}

function resolveInquiryMix(args: {
  rows: readonly ProposalCatalogRow[];
  parsed: ReturnType<typeof parseInquiryProposalText>;
  matched: MatchedProposalMedia[];
}): Pick<
  InquiryAutoProposalDryRun,
  "designated" | "eligible" | "excluded" | "mixUnits" | "bodyTotalWon" | "appendixMediaSpecs"
> {
  const designated = args.matched.filter(isDesignatedInquiryMatch);
  const eligible = designated.filter((m) => m.eligible);
  const excluded = designated.filter((m) => !m.eligible);
  const { mixUnits, selectedIds, bodyTotalWon } = selectInquiryBodyMix({
    designated,
    budgetWon: args.parsed.budgetWon,
    months: args.parsed.months,
  });
  const catalogById = new Map(args.rows.map((r) => [r.id, r]));
  const appendixMediaSpecs = buildInquiryAppendixMediaSpecs({
    designated,
    selectedIds: new Set(selectedIds),
    catalogById,
    namedNeedles: args.parsed.namedNeedles,
    isKo: true,
  });
  return {
    designated,
    eligible,
    excluded,
    mixUnits,
    bodyTotalWon,
    appendixMediaSpecs,
  };
}

export async function runInquiryAutoProposalDryRun(
  text: string,
  deps?: Pick<InquiryAutoProposalBuildDeps, "proposalCatalog" | "flightStart">,
): Promise<InquiryAutoProposalDryRun> {
  const parsed = parseInquiryProposalText(text);
  const rows = deps?.proposalCatalog ?? (await loadProposalCatalog());
  const matched = matchInquiryMedia(rows, parsed);
  const mix = resolveInquiryMix({ rows, parsed, matched });
  const bodyRows = mix.mixUnits
    ? Object.keys(mix.mixUnits)
        .map((id) => rows.find((r) => r.id === id))
        .filter((r): r is ProposalCatalogRow => r != null)
    : [];
  if (bodyRows.length > 0) {
    assertAllProposalEligible(bodyRows);
    for (const row of bodyRows) {
      const again = evaluateProposalCandidate(row);
      if (!again.eligible) {
        throw new Error(`PROPOSAL_FILTER_LEAK:${row.id}`);
      }
    }
  }
  const brief = inquiryToBrief(parsed, { flightStart: deps?.flightStart });
  assertInquiryBriefFlight(brief);
  return { parsed, matched, ...mix, brief };
}

/**
 * Same path as planner Step 3:
 * mixUnits → buildCampaignPlanSnapshot → buildBriefReportPayload.
 */
export async function buildInquiryAutoProposal(
  args: { text: string } & InquiryAutoProposalBuildDeps,
): Promise<InquiryAutoProposalBuild> {
  const rows = args.proposalCatalog ?? (await loadProposalCatalog());
  const dryRun = await runInquiryAutoProposalDryRun(args.text, {
    proposalCatalog: rows,
    flightStart: args.flightStart,
  });
  const bodyIds = Object.keys(dryRun.mixUnits);
  if (bodyIds.length === 0) {
    throw new Error("PROPOSAL_EMPTY_MIX");
  }
  const plannerCatalog =
    args.plannerCatalog ?? (await fetchPlannerMediaCatalog()).catalog;
  const mixCatalog = plannerCatalogForMix(plannerCatalog, bodyIds);
  const snapshot = buildCampaignPlanSnapshot({
    brief: dryRun.brief,
    catalog: mixCatalog,
    mixUnits: dryRun.mixUnits,
  });
  const payload = withInquiryFollowUp(
    {
      ...buildBriefReportPayload({
        plan: snapshot,
        catalog: mixCatalog,
        isKo: true,
        generatedAt: args.generatedAt,
        mixSource: "inquiry_match",
      }),
      appendixMediaSpecs: dryRun.appendixMediaSpecs,
    },
    inquiryFollowUpLines(dryRun),
  );
  return { dryRun, snapshot, payload };
}
