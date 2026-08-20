import { NextRequest } from "next/server";
import { revalidateMediaCaches } from "@/lib/media-cache-revalidate";
import { assertAdminDb, json, jsonWithHeaders } from "@/lib/admin-guard";
import { isAdminAuthDebugEnabled } from "@/lib/admin-session";
import { enrichQuickAddRowForPersist } from "@/lib/media-quick-add-enrich-one";
import {
  mediaDbRowToQuickAddJson,
  mediaQuickAddCreateToPrismaUpdate,
  quickAddJsonWithAliasKeys,
  splitQuickAddInstallLocations,
  validateQuickAddItem,
} from "@/lib/media-quick-add";
import { persistMediaInstallLocations } from "@/lib/persist-media-install-locations";
import { getPrisma } from "@/lib/prisma";
import { stripLockedFields } from "@/lib/media/locked-fields";
import { logLockdownAttempt } from "@/lib/media/audit-log";
import {
  gateMediaMetricsWrite,
  metricsWriteErrorBody,
  metricsWriteNeedsAckBody,
  readAcknowledgeMetricsWarnings,
  validateMappedMediaMetrics,
} from "@/lib/media-metrics-write";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  const db = getPrisma();
  const media = await db.media.findUnique({ where: { id } });
  if (!media) return json({ error: "Not found" }, 404);

  const quick = mediaDbRowToQuickAddJson(media);
  const payload = quickAddJsonWithAliasKeys(quick);

  return json({ id: media.id, json: payload });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "요청 본문은 객체여야 합니다." }, 400);
  }

  const bodyRecord = body as Record<string, unknown>;
  const acknowledgeMetricsWarnings =
    readAcknowledgeMetricsWarnings(bodyRecord);
  const { cleaned, stripped } = stripLockedFields(bodyRecord);
  if (stripped.length > 0) {
    logLockdownAttempt({
      timestamp: new Date().toISOString(),
      mediaId: id,
      source: "json_edit",
      strippedFields: stripped,
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });
  }
  const strippedHeader =
    stripped.length > 0 ? stripped.join(",") : undefined;

  const validated = validateQuickAddItem(cleaned, 0);
  if (!validated.ok) {
    return json({ error: validated.error }, 400);
  }

  const db = getPrisma();
  const before = await db.media.findUnique({ where: { id } });
  if (!before) return json({ error: "Not found" }, 404);

  const { createPayload, addressVerified, autoPopulatedAt } =
    await enrichQuickAddRowForPersist(validated.item);
  const metrics = validateMappedMediaMetrics(createPayload, {
    dailyFootfall: before.dailyFootfall,
    impressions: before.impressions,
    cpm: before.cpm,
  });
  const gate = gateMediaMetricsWrite(metrics, {
    acknowledgeWarnings: acknowledgeMetricsWarnings,
  });
  if (gate.kind === "error") {
    return json(metricsWriteErrorBody(gate.result), 400);
  }
  if (gate.kind === "needs_ack") {
    return json(metricsWriteNeedsAckBody(gate.result), 409);
  }
  const { installLocations } = splitQuickAddInstallLocations(createPayload);

  const data = mediaQuickAddCreateToPrismaUpdate(createPayload);
  data.addressVerified = addressVerified;
  if (autoPopulatedAt != null) {
    data.autoPopulatedAt = autoPopulatedAt;
  }

  const media = await db.media.update({
    where: { id },
    data,
  });

  if (installLocations !== undefined) {
    await persistMediaInstallLocations(db, id, installLocations);
  }

  if (media.price !== before.price) {
    await db.mediaPriceSnapshot.create({
      data: {
        mediaId: id,
        price: media.price,
        note: "json-edit",
      },
    });
  }

  if (isAdminAuthDebugEnabled()) {
    console.log("[admin-api] media JSON PUT", { id: media.id, name: media.name });
  }

  revalidateMediaCaches({ id, slug: media.slug });

  const refreshed = await db.media.findUnique({ where: { id } });
  const forJson = refreshed ?? media;
  const quick = mediaDbRowToQuickAddJson(forJson);
  return jsonWithHeaders(
    {
      ok: true,
      media: forJson,
      json: quickAddJsonWithAliasKeys(quick),
    },
    200,
    strippedHeader
      ? { "X-Locked-Fields-Stripped": strippedHeader }
      : undefined,
  );
}
