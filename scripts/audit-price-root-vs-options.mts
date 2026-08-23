#!/usr/bin/env npx tsx
/**
 * 이슈3 영향 범위 — m.price(루트) vs priceOptions 기준 월액(원) 불일치 집계.
 *
 * READ-ONLY. 상권표(`region-subdivision`)는 `catalogPriceFieldToWon(m.price)` 를 쓰고,
 * 매체 라인·플래너는 `resolveCatalogLineMonthlyPriceWon` (priceOptions 우선)을 쓴다.
 *
 * Usage:
 *   npx tsx scripts/audit-price-root-vs-options.mts
 *   AUDIT_BASE=https://tkad.co.kr npx tsx scripts/audit-price-root-vs-options.mts
 *
 * Writes: scripts/.audit-price-root-vs-options/report.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { MediaItem } from "../lib/media-data.ts";
import { isKoreaMediaCountry } from "../lib/media-country.ts";
import {
  catalogPriceFieldToWon,
  priceToMonthlyEquivalentWon,
} from "../lib/media-price-format.ts";
import {
  isPackageTotalPriceOptions,
  isPerUnitGradePriceOptions,
  resolveCatalogLineMonthlyPriceWon,
} from "../lib/media-quantity.ts";
import { isNetworkCatalogItem } from "../lib/matching-network-helpers.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, ".audit-price-root-vs-options");
const BASE = process.env.AUDIT_BASE ?? "https://tkad.co.kr";

/** 상권표가 쓰는 값 — 기간 환산 없음 (버그 경로) */
function subdivisionRawRootWon(m: MediaItem): number {
  return catalogPriceFieldToWon(m.price ?? 0);
}

/** 플래너·매체 라인 SSOT */
function plannerResolvedMonthlyWon(m: MediaItem): number {
  return resolveCatalogLineMonthlyPriceWon(m, { priceOptionIndex: 0 });
}

/** 루트 가격을 월 환산 (비교용 — 공정한 월정가 대조) */
function rootMonthlyEquivalentWon(m: MediaItem): number {
  return priceToMonthlyEquivalentWon(
    catalogPriceFieldToWon(m.price ?? 0),
    m.pricePeriod,
  );
}

function priceKind(m: MediaItem): string {
  if (isNetworkCatalogItem(m)) return "network";
  if (isPerUnitGradePriceOptions(m)) return "grade";
  if (isPackageTotalPriceOptions(m)) return "package";
  if ((m.priceOptions?.length ?? 0) > 0) return "options_other";
  return "single";
}

function pctDelta(a: number, b: number): number | null {
  if (a <= 0 && b <= 0) return 0;
  const base = Math.max(a, b, 1);
  return Math.round((Math.abs(a - b) / base) * 1000) / 10;
}

type AuditRow = {
  id: string;
  name: string;
  country: string;
  priceKind: string;
  pricePeriod: string | undefined;
  hasPriceOptions: boolean;
  rootPriceWon: number;
  rootMonthlyEquivWon: number;
  resolvedMonthlyWon: number;
  subdivisionRawWon: number;
  deltaSubdivisionVsResolved: number;
  deltaMonthlyEquivVsResolved: number;
  pctSubdivisionVsResolved: number | null;
};

async function fetchCatalog(): Promise<MediaItem[]> {
  const res = await fetch(`${BASE}/api/public/media-catalog`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`catalog HTTP ${res.status} from ${BASE}`);
  const data = (await res.json()) as unknown;
  const items = Array.isArray(data)
    ? data
    : ((data as { items?: MediaItem[] }).items ??
      (data as { data?: MediaItem[] }).data ??
      []);
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("empty catalog");
  }
  return items as MediaItem[];
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const catalog = await fetchCatalog();
  const active = catalog.filter((m) => m.id && (m.price ?? 0) > 0);

  const domestic = active.filter((m) => isKoreaMediaCountry(m.country));
  const overseas = active.filter((m) => !isKoreaMediaCountry(m.country));

  const rows: AuditRow[] = [];

  for (const m of active) {
    const rootPriceWon = catalogPriceFieldToWon(m.price ?? 0);
    const rootMonthlyEquivWon = rootMonthlyEquivalentWon(m);
    const resolvedMonthlyWon = plannerResolvedMonthlyWon(m);
    const subdivisionRawWon = subdivisionRawRootWon(m);
    const hasPriceOptions = (m.priceOptions?.length ?? 0) > 0;

    rows.push({
      id: m.id,
      name: m.name,
      country: m.country ?? "KR",
      priceKind: priceKind(m),
      pricePeriod: m.pricePeriod,
      hasPriceOptions,
      rootPriceWon,
      rootMonthlyEquivWon,
      resolvedMonthlyWon,
      subdivisionRawWon,
      deltaSubdivisionVsResolved: subdivisionRawWon - resolvedMonthlyWon,
      deltaMonthlyEquivVsResolved: rootMonthlyEquivWon - resolvedMonthlyWon,
      pctSubdivisionVsResolved: pctDelta(subdivisionRawWon, resolvedMonthlyWon),
    });
  }

  const mismatchSubdivision = (list: MediaItem[]) =>
    list.filter((m) => {
      const r = rows.find((x) => x.id === m.id)!;
      return r.subdivisionRawWon !== r.resolvedMonthlyWon;
    });

  const mismatchMonthlyEquiv = (list: MediaItem[]) =>
    list.filter((m) => {
      const r = rows.find((x) => x.id === m.id)!;
      return r.rootMonthlyEquivWon !== r.resolvedMonthlyWon;
    });

  const withOptions = (list: MediaItem[]) =>
    list.filter((m) => (m.priceOptions?.length ?? 0) > 0);

  const domesticActive = domestic;
  const domesticWithOptions = withOptions(domesticActive);
  const domesticMismatchSub = mismatchSubdivision(domesticActive);
  const domesticMismatchSubWithOptions = mismatchSubdivision(
    domesticWithOptions,
  );
  const domesticMismatchMonthly = mismatchMonthlyEquiv(domesticActive);
  const domesticMismatchMonthlyWithOptions = mismatchMonthlyEquiv(
    domesticWithOptions,
  );

  const zeroPlannerMonthly = active.filter((m) => {
    const item = { ...m, sampleImages: m.sampleImages ?? [] } as MediaItem;
    return plannerResolvedMonthlyWon(item) <= 0;
  });

  const topDomestic = domesticMismatchSub
    .map((m) => rows.find((r) => r.id === m.id)!)
    .sort(
      (a, b) =>
        Math.abs(b.deltaSubdivisionVsResolved) -
        Math.abs(a.deltaSubdivisionVsResolved),
    )
    .slice(0, 15);

  const report = {
    generatedAt: new Date().toISOString(),
    source: `${BASE}/api/public/media-catalog`,
    totals: {
      catalogItems: catalog.length,
      activePriced: active.length,
      domesticActive: domesticActive.length,
      overseasActive: overseas.length,
      domesticWithPriceOptions: domesticWithOptions.length,
      overseasWithPriceOptions: withOptions(overseas).length,
    },
    /** 이슈3 정확 경로: 상권표 raw m.price ≠ 플래너 resolved */
    issue3_subdivisionRawVsResolved: {
      domestic: {
        mismatch: domesticMismatchSub.length,
        mismatchWithPriceOptions: domesticMismatchSubWithOptions.length,
        pctOfDomestic:
          domesticActive.length > 0
            ? Math.round(
                (domesticMismatchSub.length / domesticActive.length) * 1000,
              ) / 10
            : 0,
        pctOfDomesticWithOptions:
          domesticWithOptions.length > 0
            ? Math.round(
                (domesticMismatchSubWithOptions.length /
                  domesticWithOptions.length) *
                  1000,
              ) / 10
            : 0,
      },
      overseas: {
        mismatch: mismatchSubdivision(overseas).length,
        mismatchWithPriceOptions: mismatchSubdivision(withOptions(overseas))
          .length,
      },
      all: {
        mismatch: mismatchSubdivision(active).length,
      },
    },
    /** 공정 비교: 루트 월환산 vs resolved (기간 정규화 후) */
    rootMonthlyEquivVsResolved: {
      domestic: {
        mismatch: domesticMismatchMonthly.length,
        mismatchWithPriceOptions: domesticMismatchMonthlyWithOptions.length,
      },
      overseas: {
        mismatch: mismatchMonthlyEquiv(overseas).length,
      },
    },
    zeroPlannerMonthlyPrice: {
      all: zeroPlannerMonthly.length,
      domestic: zeroPlannerMonthly.filter((m) =>
        isKoreaMediaCountry(m.country),
      ).length,
      overseas: zeroPlannerMonthly.filter(
        (m) => !isKoreaMediaCountry(m.country),
      ).length,
      items: zeroPlannerMonthly.map((m) => ({
        id: m.id,
        name: m.name,
        price: m.price,
        pricePeriod: m.pricePeriod,
        priceOptions: m.priceOptions,
        type: m.type,
      })),
    },
    byPriceKind_domestic_mismatchSubdivision: Object.fromEntries(
      ["single", "package", "grade", "network", "options_other"].map((k) => [
        k,
        domesticMismatchSub.filter((m) => priceKind(m) === k).length,
      ]),
    ),
    byPricePeriod_domestic_mismatchSubdivision: Object.fromEntries(
      [...new Set(domesticMismatchSub.map((m) => m.pricePeriod ?? "month"))].map(
        (p) => [
          p,
          domesticMismatchSub.filter((m) => (m.pricePeriod ?? "month") === p)
            .length,
        ],
      ),
    ),
    topDomesticByAbsDelta: topDomestic,
    samples: {
      domesticMismatchSubdivision: domesticMismatchSub.slice(0, 8).map((m) => {
        const r = rows.find((x) => x.id === m.id)!;
        return {
          id: r.id,
          name: r.name,
          priceKind: r.priceKind,
          root: r.rootPriceWon,
          resolved: r.resolvedMonthlyWon,
          delta: r.deltaSubdivisionVsResolved,
        };
      }),
    },
  };

  writeFileSync(
    join(OUT_DIR, "report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  console.log(JSON.stringify(report.totals, null, 2));
  console.log(
    "issue3 domestic mismatch (subdivision raw vs resolved):",
    report.issue3_subdivisionRawVsResolved.domestic,
  );
  console.log(
    "root monthly-equiv vs resolved (domestic):",
    report.rootMonthlyEquivVsResolved.domestic,
  );
  console.log(
    "zero plannerMonthly (가격 미등록):",
    report.zeroPlannerMonthlyPrice,
  );
  console.log(`\nWrote ${join(OUT_DIR, "report.json")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
