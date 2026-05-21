import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { formatManWon } from "@/lib/media-price-transparency";
import { regionZoneLabel, type MediaRegionZoneId } from "@/lib/media-regions";

export async function notifyFavoriteUsersPriceChange(opts: {
  mediaId: string;
  mediaName: string;
  oldPriceWon: number;
  newPriceWon: number;
}): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  if (opts.oldPriceWon === opts.newPriceWon) return 0;

  const db = getPrisma();
  const favs = await db.userFavoriteMedia.findMany({
    where: { mediaId: opts.mediaId },
    select: { userId: true },
  });

  const direction = opts.newPriceWon < opts.oldPriceWon ? "인하" : "인상";
  const pct =
    opts.oldPriceWon > 0
      ? Math.round(
          ((opts.newPriceWon - opts.oldPriceWon) / opts.oldPriceWon) * 100,
        )
      : 0;

  let sent = 0;
  for (const { userId } of favs) {
    const n = await createNotification({
      userId,
      type: "PRICE_CHANGE",
      title: `찜한 매체 단가 ${direction}`,
      body: `${opts.mediaName} — ${formatManWon(opts.oldPriceWon, "ko")} → ${formatManWon(opts.newPriceWon, "ko")} (${pct > 0 ? "+" : ""}${pct}%)`,
      link: `/media/${opts.mediaId}`,
      dedupeKey: `price_change:${opts.mediaId}:${opts.newPriceWon}`,
    });
    if (n) sent += 1;
  }
  return sent;
}

export async function notifyRegionPriceTrend(opts: {
  regionZone: string;
  changePct: number;
  avgPriceWon: number;
  periodMonth: string;
}): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  const db = getPrisma();
  const subs = await db.userRegionPriceAlert.findMany({
    where: { regionZone: opts.regionZone },
    select: { userId: true },
  });

  const label = regionZoneLabel(
    opts.regionZone as MediaRegionZoneId,
    "ko",
  );
  const direction = opts.changePct < 0 ? "인하" : "상승";
  let sent = 0;

  for (const { userId } of subs) {
    const n = await createNotification({
      userId,
      type: "REGION_PRICE_TREND",
      title: `${label} 평균 단가 ${direction}`,
      body: `이번 달 ${label} OOH 평균이 ${Math.abs(Math.round(opts.changePct))}% ${direction}했습니다. (평균 ${formatManWon(opts.avgPriceWon, "ko")})`,
      link: `/pricing-guide`,
      dedupeKey: `region_trend:${opts.regionZone}:${opts.periodMonth}`,
    });
    if (n) sent += 1;
  }
  return sent;
}
