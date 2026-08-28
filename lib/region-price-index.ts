import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";
import {
  mediaMonthlyPriceWon,
  resolveMediaZoneId,
} from "@/lib/media-price-transparency";
import { notifyRegionPriceTrend } from "@/lib/notifications-price";

function currentPeriodMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function rebuildRegionPriceIndices(): Promise<{
  zones: number;
  notified: number;
}> {
  if (!isDatabaseConfigured()) return { zones: 0, notified: 0 };
  const catalog = await fetchPublicMediaCatalogList();
  const periodMonth = currentPeriodMonth();

  const byZone = new Map<string, number[]>();
  for (const m of catalog) {
    const p = mediaMonthlyPriceWon(m);
    if (p <= 0) continue;
    const z = resolveMediaZoneId(m) ?? "other";
    const arr = byZone.get(z) ?? [];
    arr.push(p);
    byZone.set(z, arr);
  }

  const db = getPrisma();
  let notified = 0;

  for (const [regionZone, prices] of byZone) {
    if (prices.length < 2) continue;
    prices.sort((a, b) => a - b);
    const sum = prices.reduce((a, b) => a + b, 0);
    const avgPrice = Math.round(sum / prices.length);

    const prev = await db.regionPriceIndex.findFirst({
      where: {
        regionZone,
        periodMonth: { not: periodMonth },
      },
      orderBy: { periodMonth: "desc" },
    });

    let changePct: number | null = null;
    if (prev && prev.avgPrice > 0) {
      changePct = ((avgPrice - prev.avgPrice) / prev.avgPrice) * 100;
    }

    await db.regionPriceIndex.upsert({
      where: {
        regionZone_periodMonth: { regionZone, periodMonth },
      },
      create: {
        regionZone,
        periodMonth,
        avgPrice,
        minPrice: prices[0]!,
        maxPrice: prices[prices.length - 1]!,
        mediaCount: prices.length,
        changePct,
      },
      update: {
        avgPrice,
        minPrice: prices[0]!,
        maxPrice: prices[prices.length - 1]!,
        mediaCount: prices.length,
        changePct,
      },
    });

    if (changePct != null && Math.abs(changePct) >= 5) {
      notified += await notifyRegionPriceTrend({
        regionZone,
        changePct,
        avgPriceWon: avgPrice,
        periodMonth,
      });
    }
  }

  return { zones: byZone.size, notified };
}
