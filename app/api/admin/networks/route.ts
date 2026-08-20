import { NextRequest } from "next/server";
import { assertAdminDb, adminDbQueryFailed, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import {
  coerceNetworkInt,
  normalizePriceWon,
  normalizePricePackageFields,
  parseAndBuildNetworkCreateBodyFromObject,
  type NetworkCreateBody,
} from "@/lib/network-quick-add";
import {
  metricsWriteErrorBody,
  validateNetworkAggregateFootfall,
  validateNetworkLocationFootfall,
} from "@/lib/media-metrics-write";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function toPackageOptions(
  raw: unknown,
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return Prisma.DbNull;
  return raw as Prisma.InputJsonValue;
}

function toPrismaCreateData(
  d: NetworkCreateBody,
): Prisma.MediaNetworkCreateInput {
  const pkg = normalizePricePackageFields(d.pricePackage, d.priceNote);
  return {
    name: d.name,
    nameEn: d.nameEn,
    description: d.description,
    type: d.type,
    pricePerUnit: normalizePriceWon(coerceNetworkInt(d.pricePerUnit)),
    pricePackage: pkg.pricePackage,
    priceNote: pkg.priceNote,
    minUnits: Math.max(1, coerceNetworkInt(d.minUnits) ?? 1),
    totalLocations: Math.max(0, coerceNetworkInt(d.totalLocations) ?? 0),
    regions: d.regions,
    city: d.city,
    district: d.district,
    image: d.image,
    galleryImages: d.galleryImages,
    features: d.features,
    packageOptions: toPackageOptions(d.packageOptions),
    visibilityScore: coerceNetworkInt(d.visibilityScore),
    dailyFootfall: coerceNetworkInt(d.dailyFootfall),
    targetAge: d.targetAge,
    effectMemo: d.effectMemo,
    operatingHours: d.operatingHours,
    tags: d.tags,
    venueType: d.venueType ?? null,
    mediaMainCategory: d.mediaMainCategory ?? null,
    mediaSubCategory: d.mediaSubCategory ?? null,
    regionMain: d.regionMain ?? null,
    regionSub: d.regionSub ?? null,
    targetCategory: d.targetCategory ?? [],
    isActive: d.isActive,
    locations:
      d.locations.length > 0
        ? {
            create: d.locations.map((l) => ({
              name: l.name,
              address: l.address,
              fullAddress: l.fullAddress,
              regionMain: l.regionMain,
              regionSub: l.regionSub,
              unitCount: Math.max(1, coerceNetworkInt(l.unitCount) ?? 1),
              latitude: l.latitude,
              longitude: l.longitude,
              priceNote: l.priceNote,
              dailyFootfall: coerceNetworkInt(l.dailyFootfall),
              note: l.note,
            })),
          }
        : undefined,
  };
}

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const db = getPrisma();
  const rows = await db.mediaNetwork.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { locations: true } },
      locations: { select: { name: true } },
    },
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

  const built = parseAndBuildNetworkCreateBodyFromObject(body);
  if (!built.ok) {
    return json({ error: built.error }, 400);
  }
  const payload = built.body!;

  const agg = validateNetworkAggregateFootfall(payload.dailyFootfall);
  if (!agg.ok) {
    return json(metricsWriteErrorBody(agg), 400);
  }
  for (const loc of payload.locations) {
    const locMetrics = validateNetworkLocationFootfall(loc.dailyFootfall);
    if (!locMetrics.ok) {
      return json(
        {
          ...metricsWriteErrorBody(locMetrics),
          error: `${loc.name}: ${metricsWriteErrorBody(locMetrics).error}`,
        },
        400,
      );
    }
  }

  const db = getPrisma();
  try {
    const created = await db.mediaNetwork.create({
      data: toPrismaCreateData(payload),
      include: { locations: true },
    });
    return json({ network: created }, 201);
  } catch (e) {
    console.error("[admin/networks POST]", e);
    return adminDbQueryFailed(e);
  }
}
