/**
 * published 성공사례 summaryKo 1회성 정리 — 깨진 마크다운 조각을 plain 요약으로 교체.
 *
 *   npx tsx scripts/migrate-success-case-summary-ko.ts           # dry-run
 *   npx tsx scripts/migrate-success-case-summary-ko.ts --apply   # DB 반영
 *
 * draft 사례는 대상 아님. 적용 전 scripts/.backups/ 에 JSON 백업 생성.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { stripMarkdown } from "../lib/strip-markdown";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();

const REPLACEMENTS: Record<string, string> = {
  cmpmpteu40000s82j3r7yo6iw:
    "강남 DOOH 중심으로 신제품 스킨케어 라인 런칭 인지도를 3개월간 끌어올린 OOH 캠페인입니다.",
  cmpmpuap60001s82jdeczcltp:
    "홍대·신촌 지하철 매체로 MZ 타깃 앱 다운로드를 2개월간 집중 유도한 성과 사례입니다.",
  cmpmpv6s30002s82jlxjmt4i7:
    "강남역·코엑스 DOOH와 지하철을 믹스해 아이돌 컴백 기간 팬덤 도달을 극대화한 1개월 캠페인입니다.",
  cmpmpw1fm0003s82jyw0ig1tr:
    "성수·한남 버스쉘터와 DOOH로 신규 매장 오픈을 2개월간 알린 지역 밀착 캠페인입니다.",
};

const FASHION_ID = "cmpmpwvte0004s82j4mx4tutt";

async function main() {
  const ids = [...Object.keys(REPLACEMENTS), FASHION_ID];
  const rows = await prisma.successCase.findMany({
    where: { id: { in: ids }, status: "published" },
    select: { id: true, industry: true, summaryKo: true },
  });

  if (rows.length === 0) {
    console.log("대상 published 사례 없음.");
    return;
  }

  const updates: Array<{
    id: string;
    industry: string | null;
    before: string;
    after: string;
  }> = [];

  for (const row of rows) {
    let after: string;
    if (row.id === FASHION_ID) {
      after = stripMarkdown(row.summaryKo);
    } else {
      after = REPLACEMENTS[row.id] ?? row.summaryKo;
    }
    if (after === row.summaryKo) continue;
    updates.push({
      id: row.id,
      industry: row.industry,
      before: row.summaryKo,
      after,
    });
  }

  const backupDir = resolve(process.cwd(), "scripts/.backups");
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = resolve(backupDir, `success-case-summary-ko-${stamp}.json`);
  writeFileSync(backupPath, JSON.stringify({ updates }, null, 2), "utf8");

  console.log(`${APPLY ? "🟢 APPLY" : "🟡 DRY-RUN"} · ${updates.length}건 summaryKo 갱신 예정`);
  console.log(`백업: ${backupPath}\n`);

  for (const u of updates) {
    console.log(`  [${u.industry ?? "?"}] ${u.id}`);
    console.log(`    before: ${u.before.slice(0, 80)}${u.before.length > 80 ? "…" : ""}`);
    console.log(`    after:  ${u.after.slice(0, 80)}${u.after.length > 80 ? "…" : ""}`);
    if (APPLY) {
      await prisma.successCase.update({
        where: { id: u.id },
        data: { summaryKo: u.after },
      });
    }
  }

  if (!APPLY && updates.length > 0) {
    console.log("\n실제 반영: npx tsx scripts/migrate-success-case-summary-ko.ts --apply");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
