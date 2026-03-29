import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const db = getPrisma();
  const media = await db.media.findUnique({
    where: { id },
    include: {
      priceSnapshots: { orderBy: { effectiveFrom: "desc" }, take: 30 },
      bookings: { orderBy: { startsAt: "asc" }, take: 60 },
    },
  });
  if (!media) return json({ error: "Not found" }, 404);
  return json({ media });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const data: Prisma.MediaUpdateInput = {};
  if (body.name != null) data.name = String(body.name).trim();
  if (body.nameEn !== undefined)
    data.nameEn = String(body.nameEn ?? "").trim() || null;
  if (body.location != null) data.location = String(body.location).trim();
  if (body.region != null) data.region = String(body.region).trim();
  if (body.type != null) data.type = String(body.type).trim();
  if (body.price != null) data.price = Math.round(Number(body.price)) || 0;
  if (body.image !== undefined)
    data.image = String(body.image ?? "").trim() || null;
  if (body.width !== undefined)
    data.width = String(body.width ?? "").trim() || null;
  if (body.height !== undefined)
    data.height = String(body.height ?? "").trim() || null;

  if (body.description !== undefined)
    data.description = String(body.description ?? "").trim() || null;
  if (body.subCategory !== undefined)
    data.subCategory = String(body.subCategory ?? "").trim() || null;
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || !body.tags.every((x) => typeof x === "string")) {
      return json({ error: "tags must be string[]" }, 400);
    }
    data.tags = body.tags;
  }
  if (body.district !== undefined)
    data.district = String(body.district ?? "").trim() || null;
  if (body.city !== undefined)
    data.city = String(body.city ?? "").trim() || null;
  if (body.latitude !== undefined) {
    const n = Number(body.latitude);
    data.latitude = Number.isFinite(n) ? n : null;
  }
  if (body.longitude !== undefined) {
    const n = Number(body.longitude);
    data.longitude = Number.isFinite(n) ? n : null;
  }
  if (body.priceNote !== undefined)
    data.priceNote = String(body.priceNote ?? "").trim() || null;
  if (body.widthM !== undefined) {
    const n = Number(body.widthM);
    data.widthM = body.widthM === null || !Number.isFinite(n) ? null : n;
  }
  if (body.heightM !== undefined) {
    const n = Number(body.heightM);
    data.heightM = body.heightM === null || !Number.isFinite(n) ? null : n;
  }
  if (body.resolution !== undefined)
    data.resolution = String(body.resolution ?? "").trim() || null;
  if (body.operatingHours !== undefined)
    data.operatingHours = String(body.operatingHours ?? "").trim() || null;
  if (body.dailyFootfall !== undefined) {
    const n = Math.round(Number(body.dailyFootfall));
    data.dailyFootfall =
      body.dailyFootfall === null || !Number.isFinite(n) ? null : n;
  }
  if (body.weekdayFootfall !== undefined) {
    const n = Math.round(Number(body.weekdayFootfall));
    data.weekdayFootfall =
      body.weekdayFootfall === null || !Number.isFinite(n) ? null : n;
  }
  if (body.targetAge !== undefined)
    data.targetAge = String(body.targetAge ?? "").trim() || null;
  if (body.impressions !== undefined) {
    const n = Math.round(Number(body.impressions));
    data.impressions =
      body.impressions === null || !Number.isFinite(n) ? null : n;
  }
  if (body.reach !== undefined) {
    const n = Number(body.reach);
    data.reach = body.reach === null || !Number.isFinite(n) ? null : n;
  }
  if (body.frequency !== undefined) {
    const n = Number(body.frequency);
    data.frequency = body.frequency === null || !Number.isFinite(n) ? null : n;
  }
  if (body.cpm !== undefined) {
    const n = Number(body.cpm);
    data.cpm = body.cpm === null || !Number.isFinite(n) ? null : n;
  }
  if (body.engagementRate !== undefined) {
    const n = Number(body.engagementRate);
    data.engagementRate =
      body.engagementRate === null || !Number.isFinite(n) ? null : n;
  }
  if (body.visibilityScore !== undefined) {
    const n = Math.round(Number(body.visibilityScore));
    data.visibilityScore = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  }
  if (body.effectMemo !== undefined)
    data.effectMemo = String(body.effectMemo ?? "").trim() || null;
  if (body.extractedImages !== undefined) {
    if (
      !Array.isArray(body.extractedImages) ||
      !body.extractedImages.every((x) => typeof x === "string")
    ) {
      return json({ error: "extractedImages must be string[]" }, 400);
    }
    data.extractedImages = body.extractedImages;
  }

  const db = getPrisma();
  try {
    const media = await db.media.update({ where: { id }, data });
    return json({ media });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const db = getPrisma();
  try {
    await db.media.delete({ where: { id } });
    return json({ ok: true });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}
