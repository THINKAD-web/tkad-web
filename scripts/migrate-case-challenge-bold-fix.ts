/**
 * published F&B/K-pop/뷰티 challengeKo — bold+조사 접착 4 span 1회성 교정.
 *
 *   npx tsx scripts/migrate-case-challenge-bold-fix.ts           # dry-run
 *   npx tsx scripts/migrate-case-challenge-bold-fix.ts --apply   # DB 반영
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { guardInsightMarkdownBoldParticles } from "../lib/insight-markdown-bold-guard";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL not set (.env.local)");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/** challengeKo 내 정확히 4 span — 닫는 ** 뒤 공백 삽입 (의미·강조 동일) */
const CHALLENGE_REPLACEMENTS: Record<
  string,
  { label: string; from: string; to: string }[]
> = {
  cmpmpw1fm0003s82jyw0ig1tr: [
    {
      label: "F&B",
      from: '**"매장 반경 500m 안에서 결정하게 만든다"**는',
      to: '**"매장 반경 500m 안에서 결정하게 만든다"** 는',
    },
    {
      label: "F&B",
      from: '"는 ** 로컬 밀착 메시지**를',
      to: '"는 **로컬 밀착 메시지**를',
    },
  ],
  cmpmpv6s30002s82jlxjmt4i7: [
    {
      label: "K-pop",
      from: "**스크린도어 광고(PSD)**와",
      to: "**스크린도어 광고(PSD)** 와",
    },
  ],
  cmpmpteu40000s82j3r7yo6iw: [
    {
      label: "뷰티",
      from: "**'목격되는 광고'**의",
      to: "**'목격되는 광고'** 의",
    },
    {
      label: "뷰티",
      from: "**동영상 소재 송출이 가능한 DOOH(디지털 사이니지)**를",
      to: "**동영상 소재 송출이 가능한 DOOH(디지털 사이니지)** 를",
    },
  ],
};

function applyReplacements(text: string, replacements: { from: string; to: string }[]) {
  let next = text;
  for (const { from, to } of replacements) {
    if (!next.includes(from)) continue;
    next = next.replace(from, to);
  }
  return next;
}

async function main() {
  const ids = Object.keys(CHALLENGE_REPLACEMENTS);
  const rows = await prisma.successCase.findMany({
    where: { id: { in: ids }, status: "published" },
    select: { id: true, industry: true, challengeKo: true },
  });

  if (rows.length === 0) {
    console.error("대상 published 사례 없음.");
    process.exit(1);
  }

  type Update = {
    id: string;
    label: string;
    before: string;
    after: string;
    spans: { from: string; to: string }[];
  };

  const updates: Update[] = [];

  for (const id of ids) {
    const row = rows.find((r) => r.id === id);
    if (!row) {
      console.warn(`skip missing ${id}`);
      continue;
    }
    const specs = CHALLENGE_REPLACEMENTS[id]!;
    const afterManual = applyReplacements(row.challengeKo, specs);
    const after = guardInsightMarkdownBoldParticles(afterManual);
    if (after.trim() === row.challengeKo.trim()) continue;

    const matched = specs.filter((s) => row.challengeKo.includes(s.from));
    updates.push({
      id,
      label: specs[0]!.label,
      before: row.challengeKo,
      after,
      spans: matched.map((s) => ({ from: s.from, to: s.to })),
    });
  }

  const backupDir = join(process.cwd(), "scripts", ".backups");
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(backupDir, `case-challenge-bold-fix-${stamp}.json`);
  writeFileSync(backupPath, JSON.stringify({ updates }, null, 2), "utf8");

  console.log(`${APPLY ? "🟢 APPLY" : "🟡 DRY-RUN"} · ${updates.length}건 갱신 예정`);
  console.log(`백업: ${backupPath}\n`);

  for (const u of updates) {
    console.log(`  [${u.label}] ${u.id}`);
    for (const s of u.spans) {
      console.log(`    · ${s.from} → ${s.to}`);
    }
    if (APPLY) {
      await prisma.successCase.update({
        where: { id: u.id },
        data: { challengeKo: u.after },
      });
    }
  }

  if (!APPLY && updates.length > 0) {
    console.log("\n실제 반영: npx tsx scripts/migrate-case-challenge-bold-fix.ts --apply");
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
