import assert from "node:assert/strict";
import test from "node:test";
import { buildRfpProposalPdf } from "@/lib/rfp-proposal-export/build-pdf";
import type { RfpProposalExportPayload } from "@/lib/rfp-proposal-export/types";
import {
  isRfpProposalExportPayload,
  rfpProposalFileBase,
} from "@/lib/rfp-proposal-export/types";

const samplePayload: RfpProposalExportPayload = {
  isKo: true,
  generatedAt: "2026-07-18",
  documentTitle: "ZHITAI RFP 매체 제안서",
  campaign: {
    brandName: "ZHITAI",
    target: "IT / 게이밍 / 테크 소비층",
    period: "2026년 하반기",
    industry: "IT / 게이밍",
  },
  groups: [
    {
      groupId: "airport",
      groupLabel: "공항 권역",
      regionKeywords: ["인천공항 T1", "인천공항 T2"],
      mediaTypeKeywords: ["디지털 사이니지", "DOOH"],
      mediaItems: [
        {
          mediaId: "m-airport-1",
          name: "인천공항 T1 디지털 사이니지",
          location: "인천공항 T1",
          priceLabel: "₩800만",
          priceWon: 8_000_000,
          score: 82,
          oneLine: "공항 권역 디지털 노출",
          toBadge: "available",
          toLabel: "예약 가능",
        },
      ],
    },
    {
      groupId: "core",
      groupLabel: "핵심 상권",
      regionKeywords: ["코엑스", "강남"],
      mediaTypeKeywords: ["DOOH"],
      mediaItems: [
        {
          mediaId: "m-coex-1",
          name: "코엑스 DOOH",
          location: "코엑스",
          priceLabel: "₩600만",
          priceWon: 6_000_000,
          score: 75,
          oneLine: "핵심 상권 DOOH",
          toBadge: "inquire",
          toLabel: "문의 필요",
        },
      ],
    },
    {
      groupId: "subway",
      groupLabel: "지하철 역사",
      regionKeywords: ["강남", "삼성"],
      mediaTypeKeywords: ["PSD", "스크린도어"],
      mediaItems: [
        {
          mediaId: "m-psd-1",
          name: "강남역 PSD",
          location: "강남역",
          priceLabel: "₩400만",
          priceWon: 4_000_000,
          score: 78,
          oneLine: "지하철 반복 노출",
          toBadge: "available",
          toLabel: "예약 가능",
        },
      ],
    },
  ],
  productionCostNotice:
    "제작비·부가세 별도. 제작비·송출 스펙은 매체별 별도 협의가 필요합니다.",
  contractNotice:
    "계약조건: 월 단위 게재를 기본으로 하며, 기간·수량·패키지 조건은 매체별로 별도 협의합니다.",
  recommendComment:
    "공항·핵심상권 DOOH로 인지도를 쌓고, 지하철 PSD로 반복 노출을 제안합니다.",
  disclaimer: "본 제안서는 참고용입니다.",
};

test("isRfpProposalExportPayload + file base", () => {
  assert.ok(isRfpProposalExportPayload(samplePayload));
  assert.match(rfpProposalFileBase(samplePayload), /ZHITAI/);
});

test("buildRfpProposalPdf: ZHITAI 3그룹 섹션 PDF 바이트 생성", async () => {
  const bytes = await buildRfpProposalPdf(samplePayload);
  assert.ok(bytes.byteLength > 1000);
  // PDF magic
  const head = Buffer.from(bytes.slice(0, 5)).toString("ascii");
  assert.equal(head, "%PDF-");
});
