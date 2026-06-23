import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import {
  enrichNetworkLocations,
  resolveNetworkRegionsArray,
} from "@/lib/network-location-enrich";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

function optInt(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : undefined;
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());
}

function optStrNull(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return typeof v === "string" ? v.trim() || null : undefined;
}

function coalescePackageOptions(
  v: unknown,
): { ok: true; value: Prisma.InputJsonValue | null | undefined } | { ok: false; error: string } {
  if (v === undefined) return { ok: true, value: undefined };
  if (v === null) return { ok: true, value: null };
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return { ok: true, value: null };
    try {
      return { ok: true, value: JSON.parse(t) as Prisma.InputJsonValue };
    } catch {
      return { ok: false, error: "Invalid packageOptions JSON" };
    }
  }
  return { ok: true, value: v as Prisma.InputJsonValue };
}

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const db = getPrisma();
  const row = await db.mediaNetwork.findUnique({
    where: { id },
    include: { locations: { orderBy: { createdAt: "asc" } } },
  });
  if (!row) return json({ error: "Not found" }, 404);
  return json({ network: row });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body || typeof body !== "object") {
    return json({ error: "Invalid body" }, 400);
  }
  const o = body as Record<string, unknown>;
  const db = getPrisma();
  const existing = await db.mediaNetwork.findUnique({ where: { id } });
  if (!existing) return json({ error: "Not found" }, 404);

  let packageOptionsUpdate:
    | Prisma.NullableJsonNullValueInput
    | Prisma.InputJsonValue
    | undefined = undefined;
  if ("packageOptions" in o) {
    const r = coalescePackageOptions(o.packageOptions);
    if (!r.ok) return json({ error: r.error }, 400);
    packageOptionsUpdate =
      r.value === undefined
        ? undefined
        : r.value === null
          ? Prisma.DbNull
          : r.value;
  }

  const updateData: Prisma.MediaNetworkUpdateInput = {
    name: str(o.name) || existing.name,
    nameEn: o.nameEn !== undefined ? str(o.nameEn) || null : undefined,
    description:
      o.description !== undefined ? str(o.description) || null : undefined,
    type: str(o.type) || existing.type,
    pricePerUnit:
      o.pricePerUnit !== undefined ? optInt(o.pricePerUnit) ?? null : undefined,
    pricePackage:
      o.pricePackage !== undefined ? optInt(o.pricePackage) ?? null : undefined,
    priceNote: o.priceNote !== undefined ? str(o.priceNote) || null : undefined,
    minUnits:
      o.minUnits !== undefined
        ? Math.max(1, optInt(o.minUnits) ?? 1)
        : undefined,
    totalLocations:
      o.totalLocations !== undefined
        ? Math.max(0, optInt(o.totalLocations) ?? 0)
        : undefined,
    city: o.city !== undefined ? str(o.city) || null : undefined,
    district: o.district !== undefined ? str(o.district) || null : undefined,
    image: o.image !== undefined ? str(o.image) || null : undefined,
    galleryImages:
      o.galleryImages !== undefined ? strArr(o.galleryImages) : undefined,
    features: o.features !== undefined ? str(o.features) || null : undefined,
    packageOptions: packageOptionsUpdate,
    isActive: typeof o.isActive === "boolean" ? o.isActive : undefined,
    visibilityScore:
      o.visibilityScore !== undefined
        ? optInt(o.visibilityScore) ?? null
        : undefined,
    dailyFootfall:
      o.dailyFootfall !== undefined
        ? optInt(o.dailyFootfall) ?? null
        : undefined,
    targetAge: o.targetAge !== undefined ? str(o.targetAge) || null : undefined,
    effectMemo:
      o.effectMemo !== undefined ? str(o.effectMemo) || null : undefined,
    operatingHours:
      o.operatingHours !== undefined
        ? str(o.operatingHours) || null
        : undefined,
    tags: o.tags !== undefined ? strArr(o.tags) : undefined,
    venueType: optStrNull(o.venueType),
    mediaMainCategory: optStrNull(o.mediaMainCategory),
    mediaSubCategory: optStrNull(o.mediaSubCategory),
    regionMain: optStrNull(o.regionMain),
    regionSub: optStrNull(o.regionSub),
    targetCategory:
      o.targetCategory !== undefined ? strArr(o.targetCategory) : undefined,
  };

  const locationsRaw = o.locations;
  if (Array.isArray(locationsRaw)) {
    const enriched = enrichNetworkLocations(
      locationsRaw
        .filter((x) => x && typeof x === "object")
        .map((x) => {
          const l = x as Record<string, unknown>;
          return {
            name: str(l.name),
            address: str(l.address) || null,
            fullAddress: str(l.fullAddress) || null,
            regionMain: str(l.regionMain) || null,
            regionSub: str(l.regionSub) || null,
            unitCount: optInt(l.unitCount) ?? 1,
            latitude: l.latitude != null ? Number(l.latitude) : null,
            longitude: l.longitude != null ? Number(l.longitude) : null,
            priceNote: str(l.priceNote) || null,
            dailyFootfall: optInt(l.dailyFootfall) ?? null,
            note: str(l.note) || null,
          };
        }),
    );

    const manualRegions =
      o.regions !== undefined ? strArr(o.regions) : strArr(existing.regions);
    updateData.regions = resolveNetworkRegionsArray(
      manualRegions.length > 0 ? manualRegions : undefined,
      enriched,
    );
    updateData.totalLocations = enriched.length;

    const locCreate: Prisma.MediaNetworkLocationCreateManyInput[] =
      enriched.map((l) => ({
        networkId: id,
        name: l.name,
        address: l.address,
        fullAddress: l.fullAddress,
        regionMain: l.regionMain,
        regionSub: l.regionSub,
        unitCount: l.unitCount,
        latitude: l.latitude,
        longitude: l.longitude,
        priceNote: l.priceNote,
        dailyFootfall: l.dailyFootfall,
        note: l.note,
      }));

    await db.$transaction(async (tx) => {
      await tx.mediaNetworkLocation.deleteMany({ where: { networkId: id } });
      await tx.mediaNetwork.update({ where: { id }, data: updateData });
      if (locCreate.length > 0) {
        await tx.mediaNetworkLocation.createMany({ data: locCreate });
      }
    });
  } else {
    if (o.regions !== undefined) {
      const manual = strArr(o.regions);
      updateData.regions =
        manual.length > 0
          ? manual
          : resolveNetworkRegionsArray(undefined, []);
    }
    await db.mediaNetwork.update({
      where: { id },
      data: updateData,
    });
  }

  const updated = await db.mediaNetwork.findUnique({
    where: { id },
    include: { locations: { orderBy: { createdAt: "asc" } } },
  });
  return json({ network: updated });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const db = getPrisma();
  try {
    await db.mediaNetwork.delete({ where: { id } });
  } catch {
    return json({ error: "Not found" }, 404);
  }
  return json({ ok: true });
}
