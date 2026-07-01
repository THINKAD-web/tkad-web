/**
 * 분포도 렌더 단위 검증 (export 파이프라인에서는 PDF/PPT 미사용)
 * Usage: npx tsx scripts/verify-b2-distribution-map.mts
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { renderPlannerDistributionMap } from "../lib/planner-report-export/render-distribution-map";
import { isCatalogFallbackCoordinate } from "../lib/planner-report-portfolio-map";

const outDir = join(process.cwd(), "tmp/planner-export-diagnose");
await mkdir(outDir, { recursive: true });

const pins = [
  { id: "m1", lat: 37.5512, lng: 126.9882, type: "digital", name: "광화문 디지털" },
  { id: "m2", lat: 37.5172, lng: 127.0473, type: "static", name: "강남 고정형" },
  { id: "m3", lat: 37.5796, lng: 126.977, type: "mobile", name: "종로 이동형" },
  { id: "m4", lat: 37.4979, lng: 127.0276, type: "network", name: "역삼 네트워크" },
];

const fallbackPins = pins.filter((p) => isCatalogFallbackCoordinate(p.lat, p.lng));
console.log(`fallback pins in sample: ${fallbackPins.length} (expect 0)`);

const dist = await renderPlannerDistributionMap(pins, true);
console.log(
  dist
    ? `distribution map OK — ${dist.mappableMediaCount} media, ${dist.locationCount} locations`
    : "distribution map FAILED",
);

const payload = {
  kind: "ooh" as const,
  isKo: true,
  documentTitle: "OOH 옥외광고 플래너 보고서",
  generatedAt: new Date().toLocaleString("ko-KR"),
  goalTitle: "브랜드 인지도",
  budgetMan: 2000,
  periodDisplay: "3개월",
  regionsText: "서울",
  categoriesText: "OOH",
  ageText: "20-49",
  industryText: "F&B",
  kpis: [
    { label: "총 예상 노출", value: "1,200,000" },
    { label: "핵심 타깃 도달", value: "68%" },
  ],
  charts: {
    budgetSplit: [{ label: "OOH", value: 15000000 }],
    reachSummary: [{ label: "월 노출", value: 400000 }],
  },
  portfolio: pins.map((p, i) => ({
    id: p.id,
    name: p.name,
    location: "서울",
    categoryLabel: p.type,
    dailyTraffic: 150000 - i * 10000,
    monthlyPriceLabel: "₩500만/월",
    lineTotalLabel: "₩1,500만",
    exposureContributionPct: 20,
    budgetContributionPct: 25,
  })),
  disclaimer: "테스트",
};

const { buildPlannerReportPdf } = await import("../lib/planner-report-export/build-pdf");
const { buildPlannerReportPptx } = await import("../lib/planner-report-export/build-pptx");

const t0 = Date.now();
const pdfBytes = await buildPlannerReportPdf(payload, {});
const pptxBytes = await buildPlannerReportPptx(payload, {});
console.log(`export elapsed: ${Date.now() - t0}ms`);

const pdfPath = join(outDir, "test-b2-planner.pdf");
const pptxPath = join(outDir, "test-b2-planner.pptx");
await writeFile(pdfPath, pdfBytes);
await writeFile(pptxPath, pptxBytes);

const pdfRaw = Buffer.from(pdfBytes).toString("latin1");
const hasMapSection = pdfRaw.includes("Media locations") || pdfRaw.includes("\uae30c \uc704uce58");
console.log(`PDF has map section text: ${hasMapSection} (expect false)`);
console.log(`PDF bytes: ${pdfBytes.length}, PPTX bytes: ${pptxBytes.length}`);

const emptyDist = await renderPlannerDistributionMap([], true);
console.log(`0-pin render: ${emptyDist === null ? "null (ok)" : "unexpected"}`);

// 서울시청 폴백 제외
const fallbackOnly = await renderPlannerDistributionMap(
  [{ id: "fb", lat: 37.5665, lng: 126.978, type: "static", name: "Fallback" }],
  true,
);
console.log(`fallback-only render: ${fallbackOnly === null ? "skipped OK" : "FAIL"}`);
