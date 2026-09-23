/**
 * Public media catalog ISR/CDN cache invalidation only — no DB writes, no recompute.
 *
 * POST body (one of):
 * - `{ refs: [{ id, slug? }] }` — explicit media refs (detail + list tags).
 * - `{ dryRun?: boolean, limit?: number, cursor?: string }` — scan public-active
 *   catalog in id order, skip rows still missing en columns, process next chunk.
 *
 * Auth: admin session (`assertAdminDb`).
 */
import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { mediaNeedsEnColumnBackfill } from "@/lib/media-ai-translate";
import { revalidateMediaCachesBulk } from "@/lib/media-cache-revalidate";
import { publicActiveMediaWhere } from "@/lib/media-review-status";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_BATCH_LIMIT = 50;
const MAX_BATCH_LIMIT = 100;
const SCAN_PAGE_SIZE = 200;

type Ref = { id: string; slug?: string | null };

type Body = {
  refs?: { id?: unknown; slug?: unknown }[];
  dryRun?: boolean;
  limit?: unknown;
  cursor?: unknown;
};

function parseRefs(raw: Body["refs"]): Ref[] {
  if (!Array.isArray(raw)) return [];
  const out: Ref[] = [];
  for (const item of raw) {
    if (!item || typeof item.id !== "string" || !item.id.trim()) continue;
    const slug =
      typeof item.slug === "string"
        ? item.slug
        : item.slug === null
          ? null
          : undefined;
    out.push({ id: item.id.trim(), slug });
  }
  return out;
}

function clampLimit(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_BATCH_LIMIT;
  return Math.min(Math.floor(n), MAX_BATCH_LIMIT);
}

function parseCursor(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value.trim();
}

type EnRow = {
  id: string;
  slug: string | null;
  nameEn: string | null;
  locationEn: string | null;
  descriptionEn: string | null;
  description: string | null;
};

function isEnReadyForPublicLocale(row: EnRow): boolean {
  return !mediaNeedsEnColumnBackfill(row);
}

async function fetchEnReadyChunk(
  limit: number,
  cursor?: string,
): Promise<{
  refs: Ref[];
  nextCursor: string | null;
  exhausted: boolean;
}> {
  const db = getPrisma();
  const refs: Ref[] = [];
  let scanCursor = cursor;
  let exhausted = false;

  while (refs.length < limit) {
    const extra: Prisma.MediaWhereInput = scanCursor
      ? { id: { gt: scanCursor } }
      : {};
    const page = await db.media.findMany({
      where: publicActiveMediaWhere(extra),
      orderBy: { id: "asc" },
      take: SCAN_PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        nameEn: true,
        locationEn: true,
        descriptionEn: true,
        description: true,
      },
    });

    if (page.length === 0) {
      exhausted = true;
      break;
    }

    for (const row of page) {
      scanCursor = row.id;
      if (!isEnReadyForPublicLocale(row)) continue;
      refs.push({ id: row.id, slug: row.slug });
      if (refs.length >= limit) break;
    }

    if (page.length < SCAN_PAGE_SIZE) {
      exhausted = true;
      break;
    }
  }

  return {
    refs,
    nextCursor: refs.length > 0 ? refs[refs.length - 1]!.id : scanCursor ?? null,
    exhausted,
  };
}

async function countEnReadyPublicMedia(): Promise<number> {
  const db = getPrisma();
  const rows = await db.media.findMany({
    where: publicActiveMediaWhere(),
    select: {
      nameEn: true,
      locationEn: true,
      descriptionEn: true,
      description: true,
    },
  });
  return rows.filter((r) => !mediaNeedsEnColumnBackfill(r)).length;
}

async function hydrateRefs(refs: Ref[]): Promise<Ref[]> {
  if (refs.every((r) => r.slug !== undefined)) return refs;
  const db = getPrisma();
  const ids = refs.map((r) => r.id);
  const rows = await db.media.findMany({
    where: { id: { in: ids } },
    select: { id: true, slug: true },
  });
  const slugById = new Map(rows.map((r) => [r.id, r.slug]));
  return refs.map((r) => ({
    id: r.id,
    slug: r.slug !== undefined ? r.slug : slugById.get(r.id) ?? null,
  }));
}

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const dryRun = body.dryRun === true;
  const explicitRefs = parseRefs(body.refs);

  if (explicitRefs.length > 0) {
    const refs = await hydrateRefs(explicitRefs);
    if (dryRun) {
      return json({
        ok: true,
        mode: "refs",
        dryRun: true,
        count: refs.length,
        refs,
      });
    }
    revalidateMediaCachesBulk(refs);
    return json({
      ok: true,
      mode: "refs",
      dryRun: false,
      count: refs.length,
      revalidated: true,
      refs: refs.map((r) => ({ id: r.id, slug: r.slug ?? null })),
    });
  }

  const limit = clampLimit(body.limit);
  const cursor = parseCursor(body.cursor);
  const { refs, nextCursor, exhausted } = await fetchEnReadyChunk(limit, cursor);

  if (dryRun) {
    const totalEnReady = await countEnReadyPublicMedia();
    return json({
      ok: true,
      mode: "batch",
      dryRun: true,
      limit,
      cursor: cursor ?? null,
      chunkCount: refs.length,
      totalEnReady,
      nextCursor,
      exhausted,
      sample: refs.slice(0, 10),
    });
  }

  if (refs.length === 0) {
    return json({
      ok: true,
      mode: "batch",
      dryRun: false,
      limit,
      cursor: cursor ?? null,
      count: 0,
      revalidated: false,
      nextCursor,
      exhausted,
    });
  }

  revalidateMediaCachesBulk(refs);
  return json({
    ok: true,
    mode: "batch",
    dryRun: false,
    limit,
    cursor: cursor ?? null,
    count: refs.length,
    revalidated: true,
    nextCursor,
    exhausted,
    refs: refs.map((r) => ({ id: r.id, slug: r.slug ?? null })),
  });
}
