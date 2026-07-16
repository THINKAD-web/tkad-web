/**
 * 인천 regionSub 3건 정리 — dry-run / 백업 / 적용
 *
 *   npx tsx --env-file=.env.local scripts/incheon-regionSub-tag-apply.ts
 *   npx tsx --env-file=.env.local scripts/incheon-regionSub-tag-apply.ts --apply
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");

const PATCHES: { id: string; regionSub: string; reason: string }[] = [
  {
    id: "cmqrp5lq8000004i8dr4ysajj",
    regionSub: "incheon_airport",
    reason: "공항철도 인천공항T2역 → incheon_airport",
  },
  {
    id: "cmqrpvzn200010ai3wthj2nhw",
    regionSub: "incheon_airport",
    reason: "공항철도 계양역 → incheon_airport",
  },
  {
    id: "cmr1kidch00000aj575bp4lag",
    regionSub: "incheon_downtown",
    reason: "검단 라페온 오분류 수정 → incheon_downtown",
  },
];

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL not set (.env.local)");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function backupPath(): string {
  const dir = join(process.cwd(), "scripts", "backups");
  mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return join(dir, `incheon-regionSub-backup-${ts}.json`);
}

async function main() {
  const ids = PATCHES.map((p) => p.id);
  const rows = await prisma.media.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      location: true,
      regionMain: true,
      regionSub: true,
    },
  });

  if (rows.length !== PATCHES.length) {
    const found = new Set(rows.map((r) => r.id));
    const missing = ids.filter((id) => !found.has(id));
    console.error(`Missing media ids: ${missing.join(", ")}`);
    process.exit(1);
  }

  const backup = {
    createdAt: new Date().toISOString(),
    patches: PATCHES,
    before: rows,
  };
  const path = backupPath();
  writeFileSync(path, JSON.stringify(backup, null, 2), "utf8");
  console.log(`Backup: ${path}`);

  console.log("\nDry-run:");
  for (const patch of PATCHES) {
    const row = rows.find((r) => r.id === patch.id)!;
    console.log(
      `  [${row.id}] ${row.name}\n    ${row.regionSub ?? "(null)"} → ${patch.regionSub} (${patch.reason})`,
    );
  }

  if (!APPLY) {
    console.log("\n(dry-run only — pass --apply to write)");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  let updated = 0;
  for (const patch of PATCHES) {
    await prisma.media.update({
      where: { id: patch.id },
      data: { regionSub: patch.regionSub },
    });
    updated++;
  }

  const verify = await prisma.media.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, regionSub: true },
  });

  console.log(`\n✅ ${updated}건 regionSub 적용`);
  for (const patch of PATCHES) {
    const row = verify.find((r) => r.id === patch.id)!;
    const ok = row.regionSub === patch.regionSub;
    console.log(
      `  ${ok ? "✓" : "✗"} [${row.id}] ${row.name} → ${row.regionSub ?? "(null)"}`,
    );
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
