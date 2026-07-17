import assert from "node:assert/strict";
import { ZHITAI_RFP_EXPECTATIONS } from "@/lib/rfp-proposal/fixtures/zhitai-rfp";
import type { RfpProposalBrief } from "@/lib/rfp-proposal/types";

function haystack(brief: RfpProposalBrief): string {
  const parts: string[] = [];
  for (const g of brief.groups) {
    parts.push(
      g.label,
      ...g.regionKeywords,
      ...g.mediaTypeKeywords,
      ...(g.constraints ?? []),
      ...(g.packageHints ?? []),
    );
  }
  if (brief.campaign) {
    parts.push(
      brief.campaign.brandName ?? "",
      brief.campaign.target ?? "",
      brief.campaign.period ?? "",
      brief.campaign.industry ?? "",
      ...(brief.campaign.notes ?? []),
    );
  }
  return parts.join(" ").toLowerCase();
}

function includesAny(text: string, needles: readonly string[]): boolean {
  return needles.some((n) => text.includes(n.toLowerCase()));
}

/** ZHITAI 픽스처 파싱 결과 골든 검증 (검증 항목 1–3) */
export function assertZhitaiBrief(brief: RfpProposalBrief): void {
  assert.ok(brief.groups.length >= 3, `expected ≥3 groups, got ${brief.groups.length}`);

  for (const needle of ZHITAI_RFP_EXPECTATIONS.groupLabels) {
    const hit = brief.groups.some((g) => g.label.includes(needle));
    assert.ok(hit, `missing group label containing "${needle}"`);
  }

  const airport = brief.groups.find((g) => g.label.includes("공항"));
  const commercial = brief.groups.find((g) => /상권/.test(g.label));
  const subway = brief.groups.find((g) => /지하철|역사/.test(g.label));
  assert.ok(airport, "airport group");
  assert.ok(commercial, "commercial group");
  assert.ok(subway, "subway group");

  const airText = [
    airport!.label,
    ...airport!.regionKeywords,
    ...airport!.mediaTypeKeywords,
  ]
    .join(" ")
    .toLowerCase();
  for (const k of ZHITAI_RFP_EXPECTATIONS.airportKeywords) {
    assert.ok(airText.includes(k.toLowerCase()), `airport missing "${k}"`);
  }

  const comText = [
    commercial!.label,
    ...commercial!.regionKeywords,
    ...commercial!.mediaTypeKeywords,
  ]
    .join(" ")
    .toLowerCase();
  for (const k of ["코엑스", "k-pop", "kpop"]) {
    if (k === "kpop" && comText.includes("k-pop")) continue;
    if (k === "k-pop" && comText.includes("kpop")) continue;
    // at least one of coex / k-pop family
  }
  assert.ok(comText.includes("코엑스"), "commercial missing 코엑스");
  assert.ok(
    /k-?pop/.test(comText),
    "commercial missing K-POP 광장 signal",
  );

  const subText = [
    subway!.label,
    ...subway!.regionKeywords,
    ...subway!.mediaTypeKeywords,
  ]
    .join(" ")
    .toLowerCase();
  assert.ok(
    subText.includes("psd") || subText.includes("스크린도어"),
    "subway missing PSD/스크린도어",
  );

  const all = haystack(brief);
  assert.ok(
    includesAny(all, ZHITAI_RFP_EXPECTATIONS.campaignTargetHints),
    "campaign target (IT/게이밍/테크) missing",
  );
  assert.ok(
    includesAny(all, ZHITAI_RFP_EXPECTATIONS.campaignPeriodHints),
    "campaign period (2026/하반기) missing",
  );
}
