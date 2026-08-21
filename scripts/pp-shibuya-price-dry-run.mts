/**
 * PP — 시부야 Q'S EYE 가격 데이터 dry-run (쓰기 없음)
 * Usage: DATABASE_URL=... npx tsx scripts/pp-shibuya-price-dry-run.mts
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { krwWonToJpy } from "../lib/media-display-currency.ts";

const RATE = 0.1126;
const SHIBUYA_ID = "cmsyguc6s000u04l2ybgpbbwp";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.production") });
config({ path: resolve(root, ".env.local"), override: false });

function createDb() {
  const url = normalizePgDatabaseUrl(process.env.DATABASE_URL ?? "");
  if (!url) throw new Error("DATABASE_URL required");
  const pool = new Pool({ connectionString: url });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

type PriceOption = {
  label: string;
  price: number;
  period?: string;
  description?: string;
};

/** description에서 «300,000엔» / «3,810,000엔» 추출 */
function extractJpyFromDescription(desc: string | undefined): number | null {
  if (!desc?.trim()) return null;
  const m = desc.match(/([\d,]+)\s*엔/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** 역환율: round(krw×rate)=jpy 가 되도록 krw 후보 (표시 round-trip 검증용) */
function proposeKrwFromJpy(jpy: number, rate = RATE): number {
  const exact = jpy / rate;
  const floor = Math.floor(exact);
  const ceil = Math.ceil(exact);
  for (const krw of [Math.round(exact), floor, ceil, floor - 1, ceil + 1]) {
    if (krw > 0 && krwWonToJpy(krw) === jpy) return krw;
  }
  return Math.round(exact);
}

function verifyRoundTrip(krw: number, expectedJpy: number): boolean {
  return krwWonToJpy(krw) === expectedJpy;
}

async function main() {
  const db = createDb();
  const host = process.env.DATABASE_URL?.match(/@([^/]+)/)?.[1] ?? "?";
  console.log(`DB host: ${host}`);
  console.log(`KRW_JPY_RATE (dry-run): ${RATE}\n`);

  const row = await db.media.findUnique({
    where: { id: SHIBUYA_ID },
    select: {
      id: true,
      name: true,
      country: true,
      price: true,
      priceOptions: true,
    },
  });
  if (!row) {
    console.error("Shibuya record not found");
    process.exit(1);
  }

  const opts = (row.priceOptions ?? []) as PriceOption[];
  console.log(`=== ${row.name} (${row.id}) country=${row.country} ===\n`);
  console.log(
    "| # | label | description JPY | stored price | match? | proposed KRW | round-trip ¥ | OK |",
  );
  console.log("|---|-------|-----------------|--------------|--------|--------------|--------------|-----|");

  const proposals: { label: string; stored: number; jpy: number; proposed: number; ok: boolean }[] =
    [];

  opts.forEach((o, i) => {
    const jpy = extractJpyFromDescription(o.description);
    const match = jpy != null && o.price === jpy;
    const proposed = jpy != null ? proposeKrwFromJpy(jpy) : 0;
    const roundTrip = jpy != null ? krwWonToJpy(proposed) : null;
    const ok = jpy != null && verifyRoundTrip(proposed, jpy);
    proposals.push({
      label: o.label,
      stored: o.price,
      jpy: jpy ?? 0,
      proposed,
      ok,
    });
    console.log(
      `| ${i + 1} | ${o.label.slice(0, 20)}… | ${jpy?.toLocaleString("en-US") ?? "—"} | ${o.price.toLocaleString("en-US")} | ${match ? "✓ 동일" : "✗"} | ${proposed.toLocaleString("en-US")} | ¥${roundTrip?.toLocaleString("en-US") ?? "—"} | ${ok ? "✓" : "✗"} |`,
    );
  });

  const mediaPriceJpy = extractJpyFromDescription(
    opts.find((o) => o.price === row.price)?.description ??
      opts.find((o) => o.label.includes("4주") && o.label.includes("4회"))?.description,
  );
  const fourWeekOpt = opts.find(
    (o) => o.label.includes("4회·4주") || (o.period === "month" && o.label.includes("4회")),
  );
  const sidebarJpy =
    extractJpyFromDescription(fourWeekOpt?.description) ??
    mediaPriceJpy ??
    3_810_000;
  const proposedMediaPrice = proposeKrwFromJpy(sidebarJpy);

  console.log("\n=== Media.price (sidebar SSOT) ===");
  console.log(`현재: ${row.price.toLocaleString("en-US")}`);
  console.log(`description 기준 JPY: ¥${sidebarJpy.toLocaleString("en-US")} (4주 4회 옵션)`);
  console.log(`제안 KRW: ${proposedMediaPrice.toLocaleString("en-US")}`);
  console.log(
    `round-trip: ¥${krwWonToJpy(proposedMediaPrice).toLocaleString("en-US")} ${verifyRoundTrip(proposedMediaPrice, sidebarJpy) ? "✓" : "✗"}`,
  );
  console.log(
    `\n현재 Media.price === stored 4주옵션 price: ${row.price === fourWeekOpt?.price ? "yes (둘 다 엔화숫자)" : "no"}`,
  );

  // 다른 매체 스캔: description «N엔» 과 price === N
  const all = await db.$queryRaw<
    { id: string; name: string; country: string | null; price: number; price_options: unknown }[]
  >`
    SELECT id, name, country, price, price_options
    FROM media
    WHERE price_options IS NOT NULL
      AND price_options::text ILIKE '%엔%'
  `;

  type Suspect = {
    id: string;
    name: string;
    country: string | null;
    optionLabel: string;
    stored: number;
    jpyFromDesc: number;
  };
  const suspects: Suspect[] = [];

  for (const m of all) {
    if (m.id === SHIBUYA_ID) continue;
    const options = (m.price_options ?? []) as PriceOption[];
    for (const o of options) {
      const jpy = extractJpyFromDescription(o.description);
      if (jpy != null && o.price === jpy) {
        suspects.push({
          id: m.id,
          name: m.name,
          country: m.country,
          optionLabel: o.label,
          stored: o.price,
          jpyFromDesc: jpy,
        });
      }
    }
    // media.price도 description 옵션과 엔화 일치?
    for (const o of options) {
      const jpy = extractJpyFromDescription(o.description);
      if (jpy != null && m.price === jpy && m.price === o.price) {
        /* already counted via option */
      }
    }
  }

  console.log("\n=== 동일 패턴 다른 매체 (price === description JPY, 수정 안 함) ===");
  if (suspects.length === 0) {
    console.log("없음 — 시부야가 유일");
  } else {
    for (const s of suspects) {
      console.log(
        `- ${s.id} | ${s.name} | country=${s.country ?? "?"} | ${s.optionLabel} | stored=${s.stored}`,
      );
    }
  }

  console.log("\n=== JSON proposal (승인 후 UPDATE 참고용, 실행 안 함) ===");
  console.log(
    JSON.stringify(
      {
        id: SHIBUYA_ID,
        proposedMediaPrice,
        proposedPriceOptions: opts.map((o) => {
          const jpy = extractJpyFromDescription(o.description);
          return {
            label: o.label,
            currentPrice: o.price,
            proposedPrice: jpy != null ? proposeKrwFromJpy(jpy) : o.price,
            descriptionJpy: jpy,
            roundTripYen: jpy != null ? krwWonToJpy(proposeKrwFromJpy(jpy)) : null,
          };
        }),
      },
      null,
      2,
    ),
  );

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
