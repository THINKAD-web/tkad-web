import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
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
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
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
    minUnits:
      o.minUnits !== undefined
        ? Math.max(1, optInt(o.minUnits) ?? 1)
        : undefined,
    totalLocations:
      o.totalLocations !== undefined
        ? Math.max(0, optInt(o.totalLocations) ?? 0)
        : undefined,
    regions: o.regions !== undefined ? strArr(o.regions) : undefined,
    image: o.image !== undefined ? str(o.image) || null : undefined,
    galleryImages:
      o.galleryImages !== undefined ? strArr(o.galleryImages) : undefined,
    features: o.features !== undefined ? str(o.features) || null : undefined,
    packageOptions: packageOptionsUpdate,
    isActive: typeof o.isActive === "boolean" ? o.isActive : undefined,
  };

  const locationsRaw = o.locations;
  if (Array.isArray(locationsRaw)) {
    const locCreate: Prisma.MediaNetworkLocationCreateManyInput[] = [];
    for (const x of locationsRaw) {
      if (!x || typeof x !== "object") continue;
      const l = x as Record<string, unknown>;
      const locName = str(l.name);
      if (!locName) continue;
      const lat = l.latitude != null ? Number(l.latitude) : null;
      const lng = l.longitude != null ? Number(l.longitude) : null;
      locCreate.push({
        networkId: id,
        name: locName,
        address: str(l.address) || null,
        latitude: lat != null && Number.isFinite(lat) ? lat : null,
        longitude: lng != null && Number.isFinite(lng) ? lng : null,
      });
    }
    await db.$transaction(async (tx) => {
      await tx.mediaNetworkLocation.deleteMany({ where: { networkId: id } });
      await tx.mediaNetwork.update({ where: { id }, data: updateData });
      if (locCreate.length > 0) {
        await tx.mediaNetworkLocation.createMany({ data: locCreate });
      }
    });
  } else {
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
