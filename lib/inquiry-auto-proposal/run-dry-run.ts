import type { MediaItem } from "@/lib/media-data";
import type { CampaignPlanSnapshot } from "@/lib/campaign-plan-schema";
import type { CampaignBriefInput } from "@/lib/planner/brief/types";
import { buildCampaignPlanSnapshot } from "@/lib/planner/brief/build-plan-snapshot";
import { buildBriefReportPayload } from "@/lib/planner/brief/brief-report-adapter";
import { fetchPlannerMediaCatalog } from "@/lib/public-media-catalog";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";
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
  assertInquiryBriefFlight,
  inquiryMixUnits,
  inquiryToBrief,
} from "./to-brief";

export type InquiryAutoProposalDryRun = {
  parsed: ReturnType<typeof parseInquiryProposalText>;
  matched: MatchedProposalMedia[];
  eligible: MatchedProposalMedia[];
  excluded: MatchedProposalMedia[];
  brief: CampaignBriefInput;
  mixUnits: Record<string, number>;
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
  eligibleIds: readonly string[],
): MediaItem[] {
  const byId = new Map(plannerCatalog.map((m) => [m.id, m]));
  const missing: string[] = [];
  const items: MediaItem[] = [];
  for (const id of eligibleIds) {
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

export async function runInquiryAutoProposalDryRun(
  text: string,
  deps?: Pick<InquiryAutoProposalBuildDeps, "proposalCatalog" | "flightStart">,
): Promise<InquiryAutoProposalDryRun> {
  const parsed = parseInquiryProposalText(text);
  const rows = deps?.proposalCatalog ?? (await loadProposalCatalog());
  const matched = matchInquiryMedia(rows, parsed);
  const eligible = matched.filter((m) => m.eligible);
  const excluded = matched.filter((m) => !m.eligible);
  const eligibleRows = eligible
    .map((m) => rows.find((r) => r.id === m.id))
    .filter((r): r is ProposalCatalogRow => r != null);
  assertAllProposalEligible(eligibleRows);
  for (const row of eligibleRows) {
    const again = evaluateProposalCandidate(row);
    if (!again.eligible) {
      throw new Error(`PROPOSAL_FILTER_LEAK:${row.id}`);
    }
  }
  const brief = inquiryToBrief(parsed, { flightStart: deps?.flightStart });
  assertInquiryBriefFlight(brief);
  const mixUnits = inquiryMixUnits(eligible.map((m) => m.id));
  return { parsed, matched, eligible, excluded, brief, mixUnits };
}

/**
 * Same path as planner Step 3:
 * mixUnits → buildCampaignPlanSnapshot → buildBriefReportPayload.
 */
export async function buildInquiryAutoProposal(
  args: { text: string } & InquiryAutoProposalBuildDeps,
): Promise<InquiryAutoProposalBuild> {
  const dryRun = await runInquiryAutoProposalDryRun(args.text, {
    proposalCatalog: args.proposalCatalog,
    flightStart: args.flightStart,
  });
  if (dryRun.eligible.length === 0) {
    throw new Error("PROPOSAL_EMPTY_MIX");
  }
  const plannerCatalog =
    args.plannerCatalog ?? (await fetchPlannerMediaCatalog()).catalog;
  const mixCatalog = plannerCatalogForMix(
    plannerCatalog,
    dryRun.eligible.map((m) => m.id),
  );
  const snapshot = buildCampaignPlanSnapshot({
    brief: dryRun.brief,
    catalog: mixCatalog,
    mixUnits: dryRun.mixUnits,
  });
  const payload = withInquiryFollowUp(
    buildBriefReportPayload({
      plan: snapshot,
      catalog: mixCatalog,
      isKo: true,
      generatedAt: args.generatedAt,
    }),
    inquiryFollowUpLines(dryRun),
  );
  return { dryRun, snapshot, payload };
}
