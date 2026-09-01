/**
 * ZHITAI RFP → 매칭 → 제안서 PDF 샘플 생성 (검증용).
 * DB 카탈로그 실패 시 스텁 카탈로그로 폴백해 그룹 섹션·단가·TO 뱃지를 검증한다.
 * Usage: node --import tsx scripts/verify-rfp-proposal-pdf.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ZHITAI_RFP_EMAIL } from "../lib/rfp-proposal/fixtures/zhitai-rfp.ts";
import { heuristicParseRfpBrief } from "../lib/rfp-proposal/heuristic-parse.ts";
import { matchRfpProposalBrief } from "../lib/rfp-proposal/match-rfp-brief.ts";
import { buildRfpProposalExportPayload } from "../lib/rfp-proposal-export/build-payload.ts";
import { buildRfpProposalPdf } from "../lib/rfp-proposal-export/build-pdf.ts";
import { rfpProposalFileBase } from "../lib/rfp-proposal-export/types.ts";

function stubMedia(partial) {
  return {
    nameEn: partial.name,
    location: partial.location ?? "서울",
    locationEn: partial.location ?? "Seoul",
    region: partial.region ?? "seoul",
    type: partial.type ?? "digital",
    price: partial.price ?? 500,
    lat: 37.5,
    lng: 127.0,
    dailyFootTraffic: 10_000,
    ...partial,
  };
}

const stubCatalog = [
  stubMedia({
    id: "airport-t1-sign",
    name: "인천공항 T1 디지털 사이니지",
    location: "인천공항 T1",
    region: "incheon",
    type: "dooh",
    mediaCategory: ["digital"],
    price: 8_000_000,
  }),
  stubMedia({
    id: "airport-t2-sign",
    name: "인천공항 T2 DOOH",
    location: "인천공항 T2",
    region: "incheon",
    type: "dooh",
    mediaCategory: ["digital"],
    price: 9_000_000,
  }),
  stubMedia({
    id: "coex-dooh",
    name: "코엑스 K-POP광장 DOOH",
    location: "코엑스 K-POP광장",
    type: "dooh",
    mediaCategory: ["digital"],
    price: 6_000_000,
  }),
  stubMedia({
    id: "gangnam-dooh",
    name: "강남 랜드마크 DOOH",
    location: "강남",
    type: "dooh",
    mediaCategory: ["digital"],
    price: 7_000_000,
  }),
  stubMedia({
    id: "gangnam-psd",
    name: "강남역 PSD",
    location: "강남역",
    type: "transit",
    nearbyStations: "강남",
    price: 4_000_000,
  }),
  stubMedia({
    id: "samsung-psd",
    name: "삼성역 스크린도어",
    location: "삼성역",
    type: "transit",
    nearbyStations: "삼성",
    price: 3_500_000,
  }),
];

const outDir = join(process.cwd(), "scripts", ".verify-rfp-proposal-pdf");
mkdirSync(outDir, { recursive: true });

const brief = heuristicParseRfpBrief(ZHITAI_RFP_EMAIL);
if (!brief) {
  console.error("FAIL: heuristic parse returned null");
  process.exit(1);
}

console.log(
  "groups:",
  brief.groups.map((g) => g.label).join(" | "),
);

let match = await matchRfpProposalBrief(brief, {
  limitPerGroup: 5,
  isKo: true,
});

let usedStub = false;
if (match.catalogCount === 0) {
  usedStub = true;
  console.warn("WARN: empty DB catalog — using stub catalog for PDF sample");
  match = await matchRfpProposalBrief(brief, {
    catalog: stubCatalog,
    limitPerGroup: 5,
    isKo: true,
  });
}

console.log(
  "match:",
  match.groups.map((g) => `${g.groupLabel}:${g.mediaItems.length}`).join(", "),
  `| catalog=${match.catalogCount}`,
  usedStub ? "(stub)" : "(db)",
);

for (const g of match.groups) {
  if (g.mediaItems.length === 0) {
    console.error("FAIL: empty match for group", g.groupLabel);
    process.exit(1);
  }
}

// build-payload re-fetches catalog for thumbs — when DB empty, enrich mediaRows via match only.
// Override: build payload manually from match + availability stubs so PDF has prices/TO.
const { formatMediaPriceCompactWon, mediaPriceExclNoteText } = await import(
  "../lib/media-price-format.ts"
);
const { toBadgeLabel } = await import("../lib/rfp-proposal-export/types.ts");

const payload = {
  isKo: true,
  generatedAt: new Date().toISOString().slice(0, 10),
  documentTitle: brief.campaign?.brandName
    ? `${brief.campaign.brandName} RFP 매체 제안서`
    : "RFP 매체 제안서",
  campaign: {
    brandName: brief.campaign?.brandName ?? null,
    target: brief.campaign?.target ?? null,
    period: brief.campaign?.period ?? null,
    industry: brief.campaign?.industry ?? null,
    notes: brief.campaign?.notes,
  },
  groups: match.groups.map((g) => {
    const bg = brief.groups.find((x) => x.id === g.groupId);
    return {
      groupId: g.groupId,
      groupLabel: g.groupLabel,
      regionKeywords: bg?.regionKeywords ?? g.input.regions ?? [],
      mediaTypeKeywords: bg?.mediaTypeKeywords ?? [],
      mediaItems: g.mediaItems.map((m, i) => {
        const toBadge = i % 3 === 1 ? "inquire" : "available";
        return {
          mediaId: m.mediaId,
          name: m.name,
          location: m.location,
          priceWon: m.priceWon,
          priceLabel: formatMediaPriceCompactWon(m.priceWon, "ko-KR"),
          score: m.score,
          oneLine: m.oneLine,
          thumbUrl: null,
          toBadge,
          toLabel: toBadgeLabel(toBadge, true),
          pinned: m.pinned,
        };
      }),
    };
  }),
  productionCostNotice: `${mediaPriceExclNoteText(true)}. 제작비·송출 스펙은 매체별 별도 협의가 필요합니다.`,
  contractNotice:
    "계약조건: 월 단위 게재를 기본으로 하며, 기간·수량·패키지 조건은 매체별로 별도 협의합니다. 본 제안의 단가는 참고용이며 최종 견적 시 재확인합니다.",
  recommendComment:
    "공항·핵심상권 DOOH로 브랜드 인지도를 확보하고, 지하철 PSD로 반복 노출을 제안합니다.",
  disclaimer:
    "본 제안서는 참고용입니다. 실제 예약·단가·가용 여부는 계약 전 재확인해 주세요.",
};

// Also exercise buildRfpProposalExportPayload path when DB works
if (!usedStub) {
  const livePayload = await buildRfpProposalExportPayload({
    brief,
    matchGroups: match.groups,
    locale: "ko",
    recommendComment: payload.recommendComment,
  });
  Object.assign(payload, livePayload);
}

const labels = payload.groups.map((g) => g.groupLabel);
const expectedHints = ["공항", "상권", "지하철"];
for (const hint of expectedHints) {
  if (!labels.some((l) => l.includes(hint))) {
    console.error("FAIL: missing group section for", hint, "got", labels);
    process.exit(1);
  }
}

const bytes = await buildRfpProposalPdf(payload);
const filename = `${rfpProposalFileBase(payload)}.pdf`;
const pdfPath = join(outDir, filename);
writeFileSync(pdfPath, bytes);

const report = {
  ok: true,
  usedStub,
  pdfPath,
  byteLength: bytes.byteLength,
  documentTitle: payload.documentTitle,
  campaign: payload.campaign,
  groupLabels: labels,
  mediaCounts: payload.groups.map((g) => ({
    label: g.groupLabel,
    count: g.mediaItems.length,
    sample: g.mediaItems.slice(0, 2).map((m) => ({
      name: m.name,
      price: m.priceLabel,
      to: m.toLabel,
    })),
  })),
  productionCostNotice: payload.productionCostNotice,
  contractNotice: payload.contractNotice.slice(0, 80),
  hasRecommendComment: Boolean(payload.recommendComment),
};

writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log("OK wrote", pdfPath);
