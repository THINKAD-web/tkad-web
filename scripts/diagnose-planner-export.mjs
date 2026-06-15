/**
 * 플래너 제안서 PDF/PPT 이미지 진단 — 실제 파일 생성 후 추출·검사
 * Usage: node scripts/diagnose-planner-export.mjs
 */
import { writeFile, mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const outDir = join(process.cwd(), "tmp/planner-export-diagnose");
await mkdir(outDir, { recursive: true });

const { getPrisma } = await import("../lib/prisma.ts");
const prisma = getPrisma();

const media = await prisma.media.findMany({
  where: { isActive: true, NOT: { image: null } },
  select: { id: true, name: true, image: true, extractedImages: true },
  take: 4,
  orderBy: { updatedAt: "desc" },
});
console.log("=== Sample media image URLs ===");
for (const m of media) {
  const url = (Array.isArray(m.extractedImages) && m.extractedImages[0]) || m.image;
  console.log(`- ${m.name?.slice(0, 40)}: ${url}`);
}

// Dynamic import TS builders via tsx
const { fetchMediaImageDataUrl } = await import("../lib/server-media-image.ts");
console.log("\n=== fetchMediaImageDataUrl results ===");
const fetchResults = [];
for (const m of media) {
  const url = (Array.isArray(m.extractedImages) && m.extractedImages[0]) || m.image;
  const data = await fetchMediaImageDataUrl(url);
  fetchResults.push({ name: m.name, url, ok: !!data, len: data?.length ?? 0, fmt: data?.slice(0, 30) });
  console.log(`${m.name?.slice(0, 30)}: ${data ? `OK (${data.length} chars, ${data.slice(5, 20)})` : "FAIL"}`);
}

// Build sample payload
const portfolio = media.map((m, i) => ({
  id: m.id,
  name: m.name || `Media ${i + 1}`,
  thumbUrl: (Array.isArray(m.extractedImages) && m.extractedImages[0]) || m.image,
  location: "서울",
  categoryLabel: "OOH",
  dailyTraffic: 175000 - i * 20000,
  monthlyPriceLabel: "₩500만/월",
  lineTotalLabel: "₩1,500만",
  exposureContributionPct: 24 - i * 5,
  budgetContributionPct: 25,
}));

const payload = {
  kind: "ooh",
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
  portfolio,
  disclaimer: "테스트",
};

const { buildPlannerReportPdf } = await import("../lib/planner-report-export/build-pdf.ts");
const { buildPlannerReportPptx } = await import("../lib/planner-report-export/build-pptx.ts");

const pdfBytes = await buildPlannerReportPdf(payload);
const pptxBytes = await buildPlannerReportPptx(payload);
const pdfPath = join(outDir, "test-planner.pdf");
const pptxPath = join(outDir, "test-planner.pptx");
await writeFile(pdfPath, pdfBytes);
await writeFile(pptxPath, pptxBytes);
console.log(`\n=== Written ===\nPDF: ${pdfPath} (${pdfBytes.length} bytes)\nPPTX: ${pptxPath} (${pptxBytes.length} bytes)`);

// PDF image count via pdfimages if available
try {
  const imgDir = join(outDir, "pdf-images");
  await mkdir(imgDir, { recursive: true });
  execSync(`pdfimages -all "${pdfPath}" "${join(imgDir, "img")}"`, { stdio: "pipe" });
  const imgs = await readdir(imgDir);
  console.log(`\n=== PDF extracted images: ${imgs.length} ===`);
  for (const f of imgs) console.log(`  ${f}`);
} catch (e) {
  console.log("\n=== pdfimages ===", e.message?.slice(0, 120) || "not available");
  // fallback: count /Subtype /Image in raw pdf
  const raw = await readFile(pdfPath);
  const matches = raw.toString("latin1").match(/\/Subtype\s*\/Image/g);
  console.log(`PDF /Subtype /Image count (grep): ${matches?.length ?? 0}`);
}

// PPTX unzip
try {
  const pptDir = join(outDir, "pptx-unzip");
  execSync(`rm -rf "${pptDir}" && mkdir -p "${pptDir}" && unzip -q -o "${pptxPath}" -d "${pptDir}"`);
  const mediaDir = join(pptDir, "ppt/media");
  let pptImgs = [];
  try {
    pptImgs = await readdir(mediaDir);
  } catch {
    /* no media folder */
  }
  console.log(`\n=== PPTX ppt/media files: ${pptImgs.length} ===`);
  for (const f of pptImgs) console.log(`  ${f}`);
} catch (e) {
  console.log("\n=== pptx unzip failed ===", e.message);
}

await prisma.$disconnect();
console.log("\n=== fetch summary JSON ===");
console.log(JSON.stringify(fetchResults, null, 2));
