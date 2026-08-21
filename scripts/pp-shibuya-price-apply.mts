/**
 * PP — 시부야 Q'S EYE 가격 KRW 정정 (승인 후 1회 실행)
 * Usage: DATABASE_URL=... npx tsx scripts/pp-shibuya-price-apply.mts
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { krwWonToJpy } from "../lib/media-display-currency.ts";

const SHIBUYA_ID = "cmsyguc6s000u04l2ybgpbbwp";

const PROPOSED_OPTIONS = [
  {
    label: "15초·시간당 4회·1일",
    price: 2_664_298,
    period: "day",
    description: "15초간 시간당 4회, 1일 300,000엔",
  },
  {
    label: "15초·시간당 4회·1주",
    price: 13_321_492,
    period: "week",
    description: "15초간 시간당 4회, 1주 1,500,000엔",
  },
  {
    label: "15초·시간당 4회·2주",
    price: 24_511_545,
    period: "biweekly",
    description: "15초간 시간당 4회, 2주 2,760,000엔",
  },
  {
    label: "15초·시간당 4회·4주",
    price: 33_836_590,
    period: "month",
    description: "15초간 시간당 4회, 4주 3,810,000엔",
  },
  {
    label: "15초·시간당 2회·1주",
    price: 6_660_746,
    period: "week",
    description: "15초간 시간당 2회, 1주 750,000엔",
  },
  {
    label: "15초·시간당 2회·2주",
    price: 12_255_773,
    period: "biweekly",
    description: "15초간 시간당 2회, 2주 1,380,000엔",
  },
  {
    label: "15초·시간당 2회·4주",
    price: 16_918_295,
    period: "month",
    description: "15초간 시간당 2회, 4주 1,905,000엔",
  },
] as const;

const EXPECTED_JPY = [300_000, 1_500_000, 2_760_000, 3_810_000, 750_000, 1_380_000, 1_905_000];

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.production") });

async function main() {
  const url = normalizePgDatabaseUrl(process.env.DATABASE_URL ?? "");
  if (!url) throw new Error("DATABASE_URL required");
  const pool = new Pool({ connectionString: url });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  for (let i = 0; i < PROPOSED_OPTIONS.length; i++) {
    const jpy = krwWonToJpy(PROPOSED_OPTIONS[i].price);
    if (jpy !== EXPECTED_JPY[i]) {
      throw new Error(
        `Pre-flight round-trip failed opt ${i + 1}: got ¥${jpy}, want ¥${EXPECTED_JPY[i]}`,
      );
    }
  }

  const updated = await db.media.update({
    where: { id: SHIBUYA_ID },
    data: {
      price: 33_836_590,
      priceOptions: [...PROPOSED_OPTIONS],
    },
    select: { id: true, name: true, price: true, priceOptions: true, slug: true },
  });

  console.log("Updated:", updated.id, updated.name);
  console.log("price:", updated.price);
  for (const o of PROPOSED_OPTIONS) {
    const jpy = krwWonToJpy(o.price);
    console.log(`  ${o.label}: KRW ${o.price.toLocaleString()} → ¥${jpy.toLocaleString()}`);
  }
  console.log("\nRevalidate: redeploy OO code + visit detail or admin-save to bust ISR.");
  console.log("slug:", updated.slug ?? SHIBUYA_ID);

  await db.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
