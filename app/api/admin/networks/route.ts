import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

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

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const db = getPrisma();
  const rows = await db.mediaNetwork.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { locations: true } } },
  });
  return json({ networks: rows });
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
  if (!body || typeof body !== "object") {
    return json({ error: "Invalid body" }, 400);
  }
  const o = body as Record<string, unknown>;
  const name = str(o.name);
  const type = str(o.type);
  if (!name || !type) {
    return json({ error: "name and type required" }, 400);
  }
  const totalLocations = optInt(o.totalLocations) ?? 0;
  const minUnits = optInt(o.minUnits) ?? 1;
  const locationsRaw = Array.isArray(o.locations) ? o.locations : [];
  const locCreate: Prisma.MediaNetworkLocationCreateWithoutNetworkInput[] = [];
  for (const x of locationsRaw) {
    if (!x || typeof x !== "object") continue;
    const l = x as Record<string, unknown>;
    const locName = str(l.name);
    if (!locName) continue;
    const lat = l.latitude != null ? Number(l.latitude) : null;
    const lng = l.longitude != null ? Number(l.longitude) : null;
    locCreate.push({
      name: locName,
      address: str(l.address) || null,
      latitude: lat != null && Number.isFinite(lat) ? lat : null,
      longitude: lng != null && Number.isFinite(lng) ? lng : null,
    });
  }

  let packageOptions:
    | Prisma.NullableJsonNullValueInput
    | Prisma.InputJsonValue
    | undefined = undefined;
  if ("packageOptions" in o) {
    const r = coalescePackageOptions(o.packageOptions);
    if (!r.ok) return json({ error: r.error }, 400);
    packageOptions =
      r.value === undefined
        ? undefined
        : r.value === null
          ? Prisma.DbNull
          : r.value;
  }

  const db = getPrisma();
  const created = await db.mediaNetwork.create({
    data: {
      name,
      nameEn: str(o.nameEn) || null,
      description: str(o.description) || null,
      type,
      pricePerUnit: optInt(o.pricePerUnit) ?? null,
      pricePackage: optInt(o.pricePackage) ?? null,
      minUnits: Math.max(1, minUnits),
      totalLocations: Math.max(0, totalLocations),
      regions: strArr(o.regions),
      image: str(o.image) || null,
      galleryImages: strArr(o.galleryImages),
      features: str(o.features) || null,
      packageOptions,
      isActive: o.isActive === false ? false : true,
      locations:
        locCreate.length > 0
          ? { create: locCreate }
          : undefined,
    },
    include: { locations: true },
  });
  return json({ network: created }, 201);
}
