import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { isAdminAuthDebugEnabled } from "@/lib/admin-session";
import { getPrisma } from "@/lib/prisma";
import { enrichQuickAddMediaFromKakao } from "@/lib/media-location-enrich";
import { maybeEstimateDailyFootfall } from "@/lib/media-daily-footfall-estimate";
import { maybeAutoFillNearbyMediaFields } from "@/lib/media-nearby-facilities";
import {
  mapQuickAddToDb,
  validateQuickAddItems,
} from "@/lib/media-quick-add";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "요청 본문은 객체여야 합니다." }, 400);
  }

  const itemsRaw = (body as { items?: unknown }).items;
  if (!Array.isArray(itemsRaw)) {
    return json({ error: "items 배열이 필요합니다." }, 400);
  }

  const validated = validateQuickAddItems(itemsRaw);
  if (!validated.ok) {
    return json({ error: validated.error }, 400);
  }

  const db = getPrisma();
  const created: { id: string; name: string }[] = [];

  await db.$transaction(async (tx) => {
    for (const row of validated.items) {
      const { row: enriched, addressVerified: geoVerified } =
        await enrichQuickAddMediaFromKakao(row);
      const autoNear = await maybeAutoFillNearbyMediaFields({
        existingFacilities: enriched.nearby_facilities,
        existingStations: enriched.nearby_stations,
        existingLandmarks: enriched.nearby_landmarks,
        latitude: enriched.latitude,
        longitude: enriched.longitude,
      });
      let withNearby = enriched;
      if (autoNear) {
        withNearby = {
          ...withNearby,
          nearby_facilities:
            autoNear.nearbyFacilities ?? withNearby.nearby_facilities,
          nearby_stations:
            autoNear.nearbyStations ?? withNearby.nearby_stations,
          nearby_landmarks:
            autoNear.nearbyLandmarks ?? withNearby.nearby_landmarks,
        };
      }
      const foot = await maybeEstimateDailyFootfall({
        existingDaily: withNearby.daily_footfall,
        latitude: withNearby.latitude,
        longitude: withNearby.longitude,
        city: withNearby.city,
        district: withNearby.district,
      });
      const withFoot =
        foot != null
          ? { ...withNearby, daily_footfall: foot }
          : withNearby;
      const base = mapQuickAddToDb(withFoot);
      const media = await tx.media.create({
        data: {
          ...base,
          addressVerified: geoVerified,
          autoPopulatedAt: autoNear?.autoPopulatedAt ?? null,
        },
      });
      await tx.mediaPriceSnapshot.create({
        data: {
          mediaId: media.id,
          price: media.price,
          note: base.priceNote?.slice(0, 200) || "quick-add",
        },
      });
      created.push({ id: media.id, name: media.name });
    }
  });

  if (isAdminAuthDebugEnabled()) {
    console.log("[admin-api] quick-add persisted", {
      count: created.length,
      ids: created.map((c) => c.id),
    });
  }

  return json({ ok: true, count: created.length, created }, 201);
}
