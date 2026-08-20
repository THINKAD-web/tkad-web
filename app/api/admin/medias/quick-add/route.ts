import { NextRequest } from "next/server";
import { assertAdminDb, json, jsonWithHeaders } from "@/lib/admin-guard";
import { isAdminAuthDebugEnabled } from "@/lib/admin-session";
import { getPrisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { enrichQuickAddMediaFromKakao } from "@/lib/media-location-enrich";
import { maybeEstimateDailyFootfall } from "@/lib/media-daily-footfall-estimate";
import { maybeAutoFillNearbyMediaFields } from "@/lib/media-nearby-facilities";
import {
  mapQuickAddToDb,
  splitQuickAddInstallLocations,
  validateQuickAddItems,
} from "@/lib/media-quick-add";
import { persistMediaInstallLocations } from "@/lib/persist-media-install-locations";
import {
  gateMediaMetricsWrite,
  metricsWriteErrorBody,
  metricsWriteNeedsAckBody,
  readAcknowledgeMetricsWarnings,
  validateMappedMediaMetrics,
} from "@/lib/media-metrics-write";
import { logLockdownAttempt } from "@/lib/media/audit-log";

export const dynamic = "force-dynamic";

function prismaQuickAddErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: string }).code;
    if (code === "P2002") {
      return "동일한 값이 이미 등록되어 있습니다. (중복 제약)";
    }
    if (code === "P1001") {
      return "데이터베이스에 연결할 수 없습니다. Neon 연결 문자열·방화벽을 확인해 주세요.";
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "매체 저장 중 오류가 발생했습니다.";
}

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

  const strippedAll: string[] = [];
  const sanitizedItems = itemsRaw.map((item, index) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      return item;
    }
    const { cleaned, stripped } = stripLockedFields(
      item as Record<string, unknown>,
    );
    if (stripped.length > 0) {
      strippedAll.push(...stripped);
      logLockdownAttempt({
        timestamp: new Date().toISOString(),
        mediaId: `quick-add-row-${index}`,
        source: "quick_add",
        strippedFields: stripped,
        ip: request.headers.get("x-forwarded-for") ?? undefined,
      });
    }
    return cleaned;
  });

  const acknowledgeMetricsWarnings = readAcknowledgeMetricsWarnings(body);

  const validated = validateQuickAddItems(sanitizedItems);
  if (!validated.ok) {
    return json({ error: validated.error }, 400);
  }

  try {
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
        const metrics = validateMappedMediaMetrics(base);
        const gate = gateMediaMetricsWrite(metrics, {
          acknowledgeWarnings: acknowledgeMetricsWarnings,
        });
        if (gate.kind === "error") {
          const err = new Error("METRICS_ERROR");
          (err as Error & { metricsResult: typeof metrics }).metricsResult =
            metrics;
          throw err;
        }
        if (gate.kind === "needs_ack") {
          const err = new Error("METRICS_WARNINGS");
          (err as Error & { metricsResult: typeof metrics }).metricsResult =
            metrics;
          throw err;
        }
        const { prismaFields, installLocations } =
          splitQuickAddInstallLocations(base);
        const media = await tx.media.create({
          data: {
            ...prismaFields,
            priceOptions: prismaFields.priceOptions ?? Prisma.JsonNull,
            addressVerified: geoVerified,
            autoPopulatedAt: autoNear?.autoPopulatedAt ?? null,
          },
        });
        if (installLocations !== undefined) {
          await persistMediaInstallLocations(
            tx,
            media.id,
            installLocations,
          );
        }
        await tx.mediaPriceSnapshot.create({
          data: {
            mediaId: media.id,
            price: media.price,
            note: prismaFields.priceNote?.slice(0, 200) || "quick-add",
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

    const strippedHeader =
      strippedAll.length > 0 ? [...new Set(strippedAll)].join(",") : undefined;

    return jsonWithHeaders(
      { ok: true, count: created.length, created },
      201,
      strippedHeader
        ? { "X-Locked-Fields-Stripped": strippedHeader }
        : undefined,
    );
  } catch (err) {
    if (err instanceof Error) {
      const metrics = (
        err as Error & {
          metricsResult?: ReturnType<typeof validateMappedMediaMetrics>;
        }
      ).metricsResult;
      if (err.message === "METRICS_ERROR" && metrics) {
        return json(metricsWriteErrorBody(metrics), 400);
      }
      if (err.message === "METRICS_WARNINGS" && metrics) {
        return json(metricsWriteNeedsAckBody(metrics), 409);
      }
    }
    console.error("[admin-api] quick-add failed", err);
    return json(
      { error: prismaQuickAddErrorMessage(err) },
      500,
    );
  }
}
