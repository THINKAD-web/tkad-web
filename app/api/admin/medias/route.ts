import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { isAdminAuthDebugEnabled } from "@/lib/admin-session";
import { enrichNewMediaLocationFromKakao } from "@/lib/media-location-enrich";
import { maybeEstimateDailyFootfall } from "@/lib/media-daily-footfall-estimate";
import { maybeAutoFillNearbyMediaFields } from "@/lib/media-nearby-facilities";
import { getPrisma } from "@/lib/prisma";
import {
  CATALOG_MEDIA_TYPES,
  isValidCatalogMediaType,
} from "@/lib/media-auto-categorize";

export const dynamic = "force-dynamic";

function optStr(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === "string") return v.trim() || null;
  return undefined;
}

function optNum(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function optInt(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : undefined;
}

function optStrArr(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) return undefined;
  if (!v.every((x) => typeof x === "string")) return undefined;
  return v;
}

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const db = getPrisma();
  const { searchParams } = new URL(request.url);
  const take = Math.min(Number(searchParams.get("take") ?? 200) || 200, 500);
  const medias = await db.media.findMany({
    orderBy: { updatedAt: "desc" },
    take,
  });
  return json({ medias });
}

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const name = String(body.name ?? "").trim();
  const location = String(body.location ?? "").trim();
  const region = String(body.region ?? "").trim();
  const type = String(body.type ?? "").trim();
  const price = Number(body.price ?? 0);
  if (!name || !location || !region || !type) {
    return json({ error: "name, location, region, type required" }, 400);
  }
  if (!isValidCatalogMediaType(type)) {
    return json(
      {
        error: `type must be one of: ${CATALOG_MEDIA_TYPES.join(", ")}`,
      },
      400,
    );
  }

  const data: Prisma.MediaCreateInput = {
    name,
    nameEn: String(body.nameEn ?? "").trim() || null,
    location,
    region,
    type,
    price: Number.isFinite(price) ? Math.round(price) : 0,
    image: String(body.image ?? "").trim() || null,
    width: String(body.width ?? "").trim() || null,
    height: String(body.height ?? "").trim() || null,
  };

  const desc = optStr(body.description);
  if (desc !== undefined) data.description = desc;
  const sc = optStr(body.subCategory);
  if (sc !== undefined) data.subCategory = sc;
  const tags = optStrArr(body.tags);
  if (tags !== undefined) data.tags = tags;
  const dist = optStr(body.district);
  if (dist !== undefined) data.district = dist;
  const city = optStr(body.city);
  if (city !== undefined) data.city = city;
  const lat = optNum(body.latitude);
  if (lat !== undefined) data.latitude = lat;
  const lng = optNum(body.longitude);
  if (lng !== undefined) data.longitude = lng;
  const pn = optStr(body.priceNote);
  if (pn !== undefined) data.priceNote = pn;
  const wm = optNum(body.widthM);
  if (wm !== undefined) data.widthM = wm;
  const hm = optNum(body.heightM);
  if (hm !== undefined) data.heightM = hm;
  const res = optStr(body.resolution);
  if (res !== undefined) data.resolution = res;
  const oh = optStr(body.operatingHours);
  if (oh !== undefined) data.operatingHours = oh;
  const df = optInt(body.dailyFootfall);
  if (df !== undefined) data.dailyFootfall = df;
  const wf = optInt(body.weekdayFootfall);
  if (wf !== undefined) data.weekdayFootfall = wf;
  const ta = optStr(body.targetAge);
  if (ta !== undefined) data.targetAge = ta;
  const imp = optInt(body.impressions);
  if (imp !== undefined) data.impressions = imp;
  const reach = optNum(body.reach);
  if (reach !== undefined) data.reach = reach;
  const freq = optNum(body.frequency);
  if (freq !== undefined) data.frequency = freq;
  const cpm = optNum(body.cpm);
  if (cpm !== undefined) data.cpm = cpm;
  const er = optNum(body.engagementRate);
  if (er !== undefined) data.engagementRate = er;
  const vs = optInt(body.visibilityScore);
  if (vs !== undefined && vs !== null) data.visibilityScore = vs;
  const em = optStr(body.effectMemo);
  if (em !== undefined) data.effectMemo = em;
  const ex = optStrArr(body.extractedImages);
  if (ex !== undefined) data.extractedImages = ex;
  const pa = optStr(body.pastAdvertisers);
  if (pa !== undefined) data.pastAdvertisers = pa;
  const nf = optStr(body.nearbyFacilities);
  if (nf !== undefined) data.nearbyFacilities = nf;
  const ns = optStr(body.nearbyStations);
  if (ns !== undefined) data.nearbyStations = ns;
  const nl = optStr(body.nearbyLandmarks);
  if (nl !== undefined) data.nearbyLandmarks = nl;

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }

  const filled = await enrichNewMediaLocationFromKakao({
    location: data.location,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    city: data.city ?? null,
    district: data.district ?? null,
  });
  data.latitude = filled.latitude;
  data.longitude = filled.longitude;
  data.city = filled.city;
  data.district = filled.district;
  data.addressVerified = filled.addressVerified;

  const nearbyAuto = await maybeAutoFillNearbyMediaFields({
    existingFacilities: data.nearbyFacilities ?? null,
    existingStations: data.nearbyStations ?? null,
    existingLandmarks: data.nearbyLandmarks ?? null,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
  });
  if (nearbyAuto) {
    if (nearbyAuto.nearbyFacilities != null) {
      data.nearbyFacilities = nearbyAuto.nearbyFacilities;
    }
    if (nearbyAuto.nearbyStations != null) {
      data.nearbyStations = nearbyAuto.nearbyStations;
    }
    if (nearbyAuto.nearbyLandmarks != null) {
      data.nearbyLandmarks = nearbyAuto.nearbyLandmarks;
    }
    data.autoPopulatedAt = nearbyAuto.autoPopulatedAt;
  }

  const foot = await maybeEstimateDailyFootfall({
    existingDaily: data.dailyFootfall ?? null,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    city: data.city ?? null,
    district: data.district ?? null,
  });
  if (foot != null) {
    data.dailyFootfall = foot;
  }

  const db = getPrisma();
  const media = await db.media.create({ data });

  await db.mediaPriceSnapshot.create({
    data: {
      mediaId: media.id,
      price: media.price,
      note: "initial",
    },
  });

  if (isAdminAuthDebugEnabled()) {
    console.log("[admin-api] media POST persisted", {
      id: media.id,
      name: media.name,
    });
  }

  return json({ media }, 201);
}
