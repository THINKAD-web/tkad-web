/**
 * 제주 매체 hotspot_tags 초기 시드 — dry-run / apply
 *
 *   npx tsx --env-file=.env.local scripts/seed-jeju-hotspot-tags.ts
 *   npx tsx --env-file=.env.local scripts/seed-jeju-hotspot-tags.ts --apply
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import type { MediaHotspotTag } from "@/lib/matching/region-hotspot";
import { normalizeHotspotTagsForSave } from "@/lib/matching/region-hotspot";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL not set (.env.local)");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type Rule = {
  label: string;
  test: (name: string, location: string) => boolean;
  tags: MediaHotspotTag[];
};

/** STEP2 제안 매핑 — 앞쪽 규칙 우선 */
const RULES: Rule[] = [
  {
    label: "제주공항",
    test: (name, loc) => /제주\s*공항|airport/i.test(`${name} ${loc}`),
    tags: [
      { regionId: "jeju", zoneId: "jeju_airport", type: "airport", weight: 1.2 },
      { regionId: "jeju", zoneId: "jeju_airport", type: "tourist", weight: 1.0 },
      {
        regionId: "jeju",
        zoneId: "jeju_airport",
        type: "transit_corridor",
        weight: 1.0,
      },
    ],
  },
  {
    label: "노형/중앙로/광양",
    test: (name, loc) => /노형|중앙\s*로|광양/i.test(`${name} ${loc}`),
    tags: [
      {
        regionId: "jeju",
        zoneId: "jeju_downtown",
        type: "commercial",
        weight: 1.0,
      },
      {
        regionId: "jeju",
        zoneId: "jeju_downtown",
        type: "residential",
        weight: 1.0,
      },
    ],
  },
  {
    label: "시내 버스",
    test: (name, loc) => /시내\s*버스|간선\s*버스/i.test(`${name} ${loc}`),
    tags: [
      {
        regionId: "jeju",
        zoneId: "jeju_transit",
        type: "transit_corridor",
        weight: 1.0,
      },
    ],
  },
  {
    label: "서귀포/중문",
    test: (name, loc) => /서귀포|중문/i.test(`${name} ${loc}`),
    tags: [
      { regionId: "jeju", zoneId: "jeju_seogwipo", type: "tourist", weight: 1.0 },
    ],
  },
];

function inferTags(name: string, location: string): { rule: string; tags: MediaHotspotTag[] } | null {
  for (const rule of RULES) {
    if (rule.test(name, location)) {
      return { rule: rule.label, tags: rule.tags };
    }
  }
  return null;
}

async function main() {
  const rows = await prisma.media.findMany({
    where: { regionMain: "jeju", isActive: true },
    select: {
      id: true,
      name: true,
      location: true,
      hotspotTags: true,
    },
    orderBy: { name: "asc" },
  });

  console.log(
    `${APPLY ? "🟢 APPLY" : "🟡 DRY-RUN"} · 제주 hotspot_tags 시드`,
  );
  console.log(`제주 활성 매체: ${rows.length}건\n`);

  const planned: {
    id: string;
    name: string;
    location: string;
    rule: string;
    tags: MediaHotspotTag[];
    hadExisting: boolean;
  }[] = [];

  for (const m of rows) {
    const hit = inferTags(m.name, m.location);
    if (!hit) continue;
    planned.push({
      id: m.id,
      name: m.name,
      location: m.location,
      rule: hit.rule,
      tags: hit.tags,
      hadExisting: m.hotspotTags != null,
    });
  }

  console.log(`태깅 대상: ${planned.length}건\n`);

  for (const p of planned) {
    console.log(`- [${p.id}] ${p.name}`);
    console.log(`  location: ${p.location}`);
    console.log(`  rule: ${p.rule}${p.hadExisting ? " (기존 hotspot_tags 덮어씀)" : ""}`);
    console.log(`  tags: ${JSON.stringify(p.tags)}`);
  }

  const unmatched = rows.filter(
    (m) => !planned.some((p) => p.id === m.id),
  );
  if (unmatched.length > 0) {
    console.log(`\n매핑 없음 (${unmatched.length}건):`);
    for (const m of unmatched) {
      console.log(`  - ${m.name} (${m.location})`);
    }
  }

  if (!APPLY) {
    console.log(
      "\n⚠️  DRY-RUN — 변경 없음. 적용하려면 --apply 와 재한님 확인 후 실행.",
    );
    await pool.end();
    return;
  }

  let updated = 0;
  for (const p of planned) {
    await prisma.media.update({
      where: { id: p.id },
      data: { hotspotTags: normalizeHotspotTagsForSave(p.tags) },
    });
    updated++;
  }
  console.log(`\n✅ ${updated}건 hotspot_tags 갱신`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
