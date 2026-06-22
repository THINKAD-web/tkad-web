/**
 * Phase 1 검증 — 병합 카탈로그 browse + 네트워크 지점명 검색
 * Usage: npx tsx scripts/test-merged-media-browse.mts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../.env") });
config({ path: resolve(__dirname, "../.env.local") });

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`  OK: ${msg}`);
}

async function main() {
  const { isDatabaseConfigured, getPrisma } = await import("../lib/prisma.ts");
  if (!isDatabaseConfigured()) {
    console.log("SKIP: DB not configured");
    return;
  }

  const { fetchPlannerMediaCatalog } = await import(
    "../lib/public-media-catalog.ts"
  );
  const { filterMediaByDiscoveryChips } = await import(
    "../lib/media-discovery-client-filter.ts"
  );
  const { countMergedMediaBrowse, queryMergedMediaBrowse } = await import(
    "../lib/merged-media-browse.ts"
  );
  const { buildPublicNetworkWhere } = await import(
    "../lib/public-network-query.ts"
  );

  const db = getPrisma();

  {
    const { data, total } = await queryMergedMediaBrowse({
      q: "교보문고",
      sort: "popular",
      page: 1,
      limit: 30,
    });
    assert(
      data.some(
        (m) => m.catalogSource === "network" && m.name.includes("교보문고"),
      ),
      `"교보문고" → 네트워크 카드 (${total}건)`,
    );
  }

  {
    const { data, total } = await queryMergedMediaBrowse({
      q: "광화문점",
      sort: "popular",
      page: 1,
      limit: 30,
    });
    assert(
      data.some((m) => m.name.includes("교보문고")),
      `"광화문점" → 교보문고 네트워크 (${total}건)`,
    );
  }

  {
    const { catalog } = await fetchPlannerMediaCatalog();
    const plannerCount = filterMediaByDiscoveryChips(catalog, {
      query: "강남역",
    }).length;
    const mergedCount = await countMergedMediaBrowse({ q: "강남역" });
    assert(
      plannerCount === mergedCount,
      `"강남역" 플래너=${plannerCount} merged=${mergedCount}`,
    );
  }

  {
    const netHits = await db.mediaNetwork.count({
      where: buildPublicNetworkWhere({ q: "광화문점" }),
    });
    assert(
      netHits >= 1,
      `buildPublicNetworkWhere "광화문점" → ${netHits} network(s)`,
    );
  }

  {
    const { total } = await queryMergedMediaBrowse({
      sort: "popular",
      page: 1,
      limit: 1,
    });
    assert(total >= 540, `merged catalog total ≥ 540 (${total})`);
  }

  console.log("\nAll merged browse checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
