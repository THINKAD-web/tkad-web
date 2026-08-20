import { NextResponse } from "next/server";
import { getMediaById, type MediaItem } from "@/lib/media-data";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { prismaMediaToMediaItem } from "@/lib/public-media-catalog";
import { publicActiveMediaWhere } from "@/lib/media-review-status";

const MAX_IDS = 24;

function parseIds(param: string | null): string[] {
  if (!param?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of param.split(",")) {
    const id = part.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_IDS) break;
  }
  return out;
}

/** Active media rows for the given ids, in request order (public browse fields). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = parseIds(searchParams.get("ids"));
  if (ids.length === 0) {
    return NextResponse.json({ items: [] as MediaItem[] });
  }

  if (isDatabaseConfigured()) {
    try {
      const db = getPrisma();
      const rows = await db.media.findMany({
        where: publicActiveMediaWhere({ id: { in: ids } }),
        include: {
          advertiserExecutions: {
            select: { advertiserName: true },
            orderBy: { createdAt: "desc" },
          },
        },
      });
      const byId = new Map(rows.map((r) => [r.id, prismaMediaToMediaItem(r)]));
      const items: MediaItem[] = [];
      for (const id of ids) {
        const m = byId.get(id);
        if (m) items.push(m);
      }
      return NextResponse.json({ items });
    } catch {
      // fall through to static catalog
    }
  }

  const items: MediaItem[] = [];
  for (const id of ids) {
    const m = getMediaById(id);
    if (m) items.push(m);
  }
  return NextResponse.json({ items });
}
