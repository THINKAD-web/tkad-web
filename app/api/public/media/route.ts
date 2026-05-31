import { NextRequest } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { prismaMediaToMediaItem } from "@/lib/public-media-catalog";
import { attachMediaTrustToMediaItems } from "@/lib/media-trust-catalog";
import { attachPublicMediaCatalogExtras } from "@/lib/attach-public-media-catalog-extras";
import {
  buildPublicMediaOrderBy,
  buildPublicMediaWhere,
  parsePublicMediaQuery,
} from "@/lib/public-media-query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = parsePublicMediaQuery(request.nextUrl.searchParams);

  if (!isDatabaseConfigured()) {
    return Response.json({ data: [], pagination: { page: 1, total: 0, limit: params.limit ?? 24 } });
  }

  try {
    const db = getPrisma();
    const where = buildPublicMediaWhere(params);
    const orderBy = buildPublicMediaOrderBy(params.sort);
    const page = params.page ?? 1;
    const limit = params.limit ?? 24;
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      db.media.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          advertiserExecutions: {
            select: { advertiserName: true },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      db.media.count({ where }),
    ]);

    const rowsWithExtras = await attachPublicMediaCatalogExtras(db, rows);
    const base = rowsWithExtras.map(prismaMediaToMediaItem);
    const data = await attachMediaTrustToMediaItems(base);

    return Response.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error("[api/public/media]", e);
    return Response.json({ error: "Failed to fetch media" }, { status: 500 });
  }
}
