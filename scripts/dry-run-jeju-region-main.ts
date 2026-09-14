/**
 * 제주 매체 regionMain/region 오표기 정정 — dry-run / apply
 *
 *   npx tsx --env-file=.env.local scripts/dry-run-jeju-region-main.ts
 *   npx tsx --env-file=.env.local scripts/dry-run-jeju-region-main.ts --apply
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL not set (.env.local)");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type Candidate = {
  id: string;
  name: string;
  location: string;
  regionMain: string | null;
  region: string;
};

/** 전국·복수 도시 노선 — regionMain=jeju 단일 지역으로 바꾸면 안 됨 */
const MULTI_CITY_RE =
  /서울\s*,|,\s*제주|전국|전역|광고주\s*선택|여러\s*도시/i;

async function findJejuMislabeled(): Promise<Candidate[]> {
  const rows = await prisma.media.findMany({
    where: {
      isActive: true,
      OR: [
        {
          regionMain: "jeju",
          NOT: { region: "jeju" },
        },
        {
          AND: [
            {
              OR: [
                { location: { contains: "제주", mode: "insensitive" } },
                { name: { contains: "제주", mode: "insensitive" } },
              ],
            },
            { NOT: { regionMain: "jeju" } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      location: true,
      regionMain: true,
      region: true,
    },
    orderBy: { name: "asc" },
  });
  return rows.filter(
    (m) =>
      !MULTI_CITY_RE.test(m.location) &&
      !MULTI_CITY_RE.test(m.name) &&
      !(m.regionMain === "national" || m.region === "national"),
  );
}

async function main() {
  const candidates = await findJejuMislabeled();

  console.log(
    `${APPLY ? "🟢 APPLY" : "🟡 DRY-RUN"} · 제주 regionMain 오표기 정정`,
  );
  console.log(`후보: ${candidates.length}건\n`);

  if (candidates.length === 0) {
    console.log("수정 대상 없음.");
    await pool.end();
    return;
  }

  for (const m of candidates) {
    console.log(
      `- [${m.id}] regionMain=${m.regionMain ?? "null"} region=${m.region}`,
    );
    console.log(`  name: ${m.name}`);
    console.log(`  location: ${m.location}`);
  }

  if (!APPLY) {
    console.log(
      "\n⚠️  DRY-RUN — 변경 없음. 적용하려면 --apply 와 확인 후 실행.",
    );
    await pool.end();
    return;
  }

  let updated = 0;
  for (const m of candidates) {
    await prisma.media.update({
      where: { id: m.id },
      data: {
        regionMain: m.regionMain === "jeju" ? m.regionMain : "jeju",
        region: "jeju",
      },
    });
    updated++;
  }
  console.log(`\n✅ ${updated}건 regionMain/region → jeju 로 갱신`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
