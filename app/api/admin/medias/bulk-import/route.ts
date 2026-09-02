import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidateMediaCachesBulk } from "@/lib/media-cache-revalidate";
import { assertAdminDb, json, jsonWithHeaders } from "@/lib/admin-guard";
import { isAdminAuthDebugEnabled } from "@/lib/admin-session";
import { getPrisma } from "@/lib/prisma";
import { enrichQuickAddRowForPersist } from "@/lib/media-quick-add-enrich-one";
import {
  mediaQuickAddCreateToPrismaUpdate,
  splitQuickAddInstallLocations,
  validateQuickAddItems,
  type QuickAddMediaJson,
} from "@/lib/media-quick-add";
import { persistMediaInstallLocations } from "@/lib/persist-media-install-locations";
import { stripLockedFields } from "@/lib/media/locked-fields";
import { maybeAutoRecomputeMediaMetrics } from "@/lib/media/engine/auto-recompute";
import { logLockdownAttempt } from "@/lib/media/audit-log";
import {
  gateMediaMetricsWrite,
  metricsWriteErrorBody,
  validateMappedMediaMetrics,
} from "@/lib/media-metrics-write";
import { resolveCatalogChannelForMediaWrite } from "@/lib/catalog-channel";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ImportOutcome =
  | { kind: "created"; id: string; name: string }
  | { kind: "updated"; id: string; name: string }
  | { kind: "failed"; name: string; error: string };

/**
 * 매체 일괄 import (upsert).
 *
 * 동작:
 *   - body: { items: QuickAddMediaJson[], matchKey?: "name" | "id", dryRun?: boolean }
 *   - matchKey="name" (기본): `media_name` 으로 찾아 있으면 update, 없으면 create.
 *   - matchKey="id": 각 item 의 `id` 필드 (camelCase 그대로) 로 매칭. 없으면 실패.
 *   - dryRun: DB 변경 없이 어떤 작업이 일어날지만 리포트.
 *
 * 신규 등록은 quick-add POST 와 동일하게 카카오 좌표·주변 시설·유동인구 보강을 수행.
 * 기존 매체 update 도 동일한 enrich 로직을 거쳐 누락 필드를 채움 (이미 값이 있으면 보존).
 */
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
  const matchKeyRaw = (body as { matchKey?: unknown }).matchKey;
  const matchKey: "name" | "id" =
    matchKeyRaw === "id" ? "id" : "name";
  const dryRun = (body as { dryRun?: unknown }).dryRun === true;

  // matchKey="id" 면 각 item 의 id 필드를 별도로 추출 (validateQuickAddItem 가 모르는 필드라 별도 보존)
  const explicitIds: (string | null)[] = itemsRaw.map((it) => {
    if (it && typeof it === "object") {
      const v = (it as Record<string, unknown>).id;
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
  });

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
        mediaId: explicitIds[index] ?? `bulk-import-row-${index}`,
        source: "bulk_import",
        strippedFields: stripped,
        ip: request.headers.get("x-forwarded-for") ?? undefined,
      });
    }
    return cleaned;
  });

  const validated = validateQuickAddItems(sanitizedItems);
  if (!validated.ok) {
    return json({ error: validated.error }, 400);
  }

  const db = getPrisma();
  const outcomes: ImportOutcome[] = [];

  for (let i = 0; i < validated.items.length; i++) {
    const row = validated.items[i] as QuickAddMediaJson;
    const explicitId = explicitIds[i];
    try {
      // 매칭: id 우선(명시적), 그 외 name
      const existing = await (async () => {
        if (matchKey === "id") {
          if (!explicitId) return null;
          return db.media.findUnique({ where: { id: explicitId } });
        }
        // name 매칭 — 활성·비활성 무관 (관리자 의도)
        return db.media.findFirst({ where: { name: row.media_name } });
      })();

      if (matchKey === "id" && !explicitId) {
        outcomes.push({
          kind: "failed",
          name: row.media_name,
          error: "matchKey=id 인데 item.id 가 비어있습니다.",
        });
        continue;
      }

      const { createPayload, addressVerified, autoPopulatedAt } =
        await enrichQuickAddRowForPersist(row);

      const metrics = validateMappedMediaMetrics(
        createPayload,
        existing
          ? {
              dailyFootfall: existing.dailyFootfall,
              impressions: existing.impressions,
              cpm: existing.cpm,
            }
          : undefined,
      );
      // error = 해당 행만 실패 (배치 전체 롤백 아님, 경고를 error로 다운그레이드하지 않음).
      // Package+과대 규모는 모달이 없으므로 행 실패로 승격.
      const gate = gateMediaMetricsWrite(metrics, {
        requireAckForWarnings: false,
        rejectPackageScaleOnBatch: true,
      });
      if (gate.kind === "error") {
        outcomes.push({
          kind: "failed",
          name: row.media_name,
          error: metricsWriteErrorBody(gate.result).error,
        });
        continue;
      }

      if (existing) {
        if (dryRun) {
          outcomes.push({
            kind: "updated",
            id: existing.id,
            name: existing.name,
          });
          continue;
        }
        const { installLocations } =
          splitQuickAddInstallLocations(createPayload);
        const data = mediaQuickAddCreateToPrismaUpdate(createPayload);
        data.addressVerified = addressVerified;
        if (autoPopulatedAt != null) {
          data.autoPopulatedAt = autoPopulatedAt;
        }
        const updated = await db.media.update({
          where: { id: existing.id },
          data,
        });
        if (installLocations !== undefined) {
          await persistMediaInstallLocations(
            db,
            updated.id,
            installLocations,
          );
        }
        await maybeAutoRecomputeMediaMetrics(db, updated.id);
        if (updated.price !== existing.price) {
          await db.mediaPriceSnapshot.create({
            data: {
              mediaId: updated.id,
              price: updated.price,
              note: "bulk-import-update",
            },
          });
        }
        outcomes.push({
          kind: "updated",
          id: updated.id,
          name: updated.name,
        });
      } else {
        if (dryRun) {
          outcomes.push({
            kind: "created",
            id: "(신규)",
            name: row.media_name,
          });
          continue;
        }
        const { prismaFields, installLocations } =
          splitQuickAddInstallLocations(createPayload);
        const created = await db.media.create({
          data: {
            ...prismaFields,
            priceOptions: prismaFields.priceOptions ?? Prisma.JsonNull,
            addressVerified,
            autoPopulatedAt,
            catalogChannel: resolveCatalogChannelForMediaWrite({
              type: prismaFields.type,
            }),
          },
        });
        if (installLocations !== undefined) {
          await persistMediaInstallLocations(
            db,
            created.id,
            installLocations,
          );
        }
        await maybeAutoRecomputeMediaMetrics(db, created.id);
        await db.mediaPriceSnapshot.create({
          data: {
            mediaId: created.id,
            price: created.price,
            note: "bulk-import-create",
          },
        });
        outcomes.push({
          kind: "created",
          id: created.id,
          name: created.name,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      outcomes.push({
        kind: "failed",
        name: row.media_name,
        error: msg,
      });
    }
  }

  if (!dryRun) {
    const affected = outcomes
      .filter(
        (o): o is Extract<ImportOutcome, { kind: "created" | "updated" }> =>
          o.kind === "created" || o.kind === "updated",
      )
      .map((o) => ({ id: o.id }));
    revalidateMediaCachesBulk(affected);
  }

  if (isAdminAuthDebugEnabled()) {
    console.log("[admin-api] medias bulk-import", {
      total: outcomes.length,
      created: outcomes.filter((o) => o.kind === "created").length,
      updated: outcomes.filter((o) => o.kind === "updated").length,
      failed: outcomes.filter((o) => o.kind === "failed").length,
      matchKey,
      dryRun,
    });
  }

  const counts = {
    created: outcomes.filter((o) => o.kind === "created").length,
    updated: outcomes.filter((o) => o.kind === "updated").length,
    failed: outcomes.filter((o) => o.kind === "failed").length,
  };

  const strippedHeader =
    strippedAll.length > 0 ? [...new Set(strippedAll)].join(",") : undefined;

  return jsonWithHeaders(
    {
      ok: true,
      matchKey,
      dryRun,
      counts,
      outcomes,
    },
    200,
    strippedHeader
      ? { "X-Locked-Fields-Stripped": strippedHeader }
      : undefined,
  );
}
