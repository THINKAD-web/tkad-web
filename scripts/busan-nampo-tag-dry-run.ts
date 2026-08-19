/**
 * busan_nampo regionSub 태깅 — dry-run / 백업 / 적용
 *
 *   npx tsx --env-file=.env.local scripts/busan-nampo-tag-dry-run.ts
 *   npx tsx --env-file=.env.local scripts/busan-nampo-tag-dry-run.ts --apply
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { prismaMediaToMediaItem } from "@/lib/public-media-catalog";
import type { MediaItem } from "@/lib/media-data";
import {
  buildScenarioPatchFromFreetextParse,
  parsePlannerFreetextBrief,
} from "@/lib/planner/parse-freetext-brief";
import { recommendPlannerMedia } from "@/lib/planner/recommend";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL not set (.env.local)");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/** 남포·광복·자갈치·중구 일대 — `동광` 단독(동광빌딩 등) 제외 */
const NAMPO_RE =
  /남포|광복|자갈치|중구|부산역|보수동|동광동|nampo|gwangbok/i;

const NAMPO_EXCLUDE_RE =
  /연제구|연산(?:역|동)?|수영구|해운대|서면|부전|센텀|벡스코|사상|금정|동래|남구(?!포)/i;

export type NampoCandidate = {
  id: string;
  name: string;
  location: string;
  district: string | null;
  regionMain: string | null;
  regionSub: string | null;
};

export function findNampoCandidates(
  catalog: readonly {
    id: string;
    name: string;
    location: string;
    district?: string | null;
    regionMain?: string | null;
    regionSub?: string | null;
    region?: string | null;
    nearbyStations?: string | null;
    nearbyLandmarks?: string | null;
    nearbyFacilities?: string | null;
  }[],
): NampoCandidate[] {
  const busan = catalog.filter(
    (m) => m.regionMain === "busan" || m.region === "busan",
  );

  return busan
    .filter((m) => {
      if (m.regionSub === "busan_nampo") return false;
      const hay = [
        m.name,
        m.location,
        m.district,
        m.nearbyStations,
        m.nearbyLandmarks,
        m.nearbyFacilities,
      ]
        .filter(Boolean)
        .join(" ");
      if (!NAMPO_RE.test(hay)) return false;
      if (NAMPO_EXCLUDE_RE.test(hay)) return false;
      return true;
    })
    .map((m) => ({
      id: m.id,
      name: m.name,
      location: m.location,
      district: m.district ?? null,
      regionMain: m.regionMain ?? null,
      regionSub: m.regionSub ?? null,
    }));
}

function backupPath(): string {
  const dir = join(process.cwd(), "scripts", "backups");
  mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return join(dir, `busan-nampo-regionSub-backup-${ts}.json`);
}

async function writeBackup(candidates: NampoCandidate[]): Promise<string> {
  const ids = candidates.map((c) => c.id);
  const rows = await prisma.media.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      location: true,
      regionMain: true,
      regionSub: true,
      district: true,
      updatedAt: true,
    },
  });

  const payload = {
    createdAt: new Date().toISOString(),
    purpose: "busan_nampo tagging pre-apply backup",
    targetRegionSub: "busan_nampo",
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      location: r.location,
      regionMain: r.regionMain,
      regionSub: r.regionSub,
      district: r.district,
      updatedAt: r.updatedAt.toISOString(),
    })),
  };

  const path = backupPath();
  writeFileSync(path, JSON.stringify(payload, null, 2), "utf8");
  return path;
}

async function applyTags(candidates: NampoCandidate[]): Promise<number> {
  let n = 0;
  for (const c of candidates) {
    await prisma.media.update({
      where: { id: c.id },
      data: { regionSub: "busan_nampo" },
    });
    n++;
  }
  return n;
}

async function verifyApplied(ids: string[]): Promise<void> {
  const rows = await prisma.media.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, regionSub: true },
  });
  const ok = rows.filter((r) => r.regionSub === "busan_nampo");
  console.log(`\n=== 적용 후 DB 확인 ===`);
  console.log(`busan_nampo: ${ok.length} / ${ids.length}`);
  for (const r of rows) {
    const mark = r.regionSub === "busan_nampo" ? "✓" : "✗";
    console.log(`  ${mark} [${r.id}] ${r.name} → ${r.regionSub ?? "(null)"}`);
  }

  const catalog = await loadCatalogFromDb();
  const brief = "부산 남포 광복 자갈치";
  const patch = buildScenarioPatchFromFreetextParse(parsePlannerFreetextBrief(brief));
  const scored = recommendPlannerMedia(
    catalog,
    {
      goal: patch.campaignGoal ?? null,
      regions: patch.regions,
      seoulZones: patch.seoulZones ?? [],
      busanZones: patch.busanZones ?? [],
      categories: patch.categories,
      ageKeys: patch.ageKeys ?? [],
      industryKey: patch.industryKey ?? null,
      budgetMan: patch.budgetMan,
      months: patch.months,
      goalFollowUp: patch.goalFollowUp,
      durationDays: patch.goalFollowUp?.eventDurationDays ?? undefined,
    },
    8,
  );

  console.log("\n=== 부산 남포 zone 추천 top8 ===");
  scored.forEach((row, i) => {
    console.log(
      `  ${i + 1}. ${row.media.name} | regionSub=${row.media.regionSub ?? "?"}`,
    );
  });
  const nampoTagged = scored.filter((row) => row.media.regionSub === "busan_nampo");
  console.log(
    `\n추천 결과 중 busan_nampo 태깅: ${nampoTagged.length} / ${scored.length}`,
  );
}

async function loadCatalogFromDb(): Promise<MediaItem[]> {
  const rows = await prisma.media.findMany({
    where: { isActive: true },
    include: {
      advertiserExecutions: {
        select: { advertiserName: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  return rows.map((row) => prismaMediaToMediaItem(row));
}

async function main() {
  const catalog = await loadCatalogFromDb();
  if (catalog.length === 0) {
    console.error("❌ 카탈로그 0건 — DB 연결 확인 (.env.local DATABASE_URL)");
    process.exit(1);
  }

  const candidates = findNampoCandidates(catalog);
  const busanCount = catalog.filter(
    (m) => m.regionMain === "busan" || m.region === "busan",
  ).length;

  console.log(
    `${APPLY ? "🟢 APPLY" : "🟡 DRY-RUN"} · busan_nampo 태깅`,
  );
  console.log(`부산 매체: ${busanCount}`);
  console.log(`busan_nampo 후보: ${candidates.length}`);
  console.log("");

  for (const m of candidates) {
    console.log(
      `- [${m.id}] ${m.name} | regionSub=${m.regionSub ?? "(null)"} | ${m.location}`,
    );
  }

  if (candidates.length === 0) {
    console.log("(후보 없음)");
    return;
  }

  const backupFile = await writeBackup(candidates);
  console.log(`\n📦 백업 저장: ${backupFile}`);

  if (!APPLY) {
    console.log("\n적용하려면: npx tsx --env-file=.env.local scripts/busan-nampo-tag-dry-run.ts --apply");
    return;
  }

  const updated = await applyTags(candidates);
  console.log(`\n✅ ${updated}건 regionSub → busan_nampo 적용`);
  await verifyApplied(candidates.map((c) => c.id));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
