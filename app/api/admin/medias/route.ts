import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { revalidateMediaCaches } from "@/lib/media-cache-revalidate";
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
import { normalizePriceOptionsForPrisma } from "@/lib/admin-media-price-options";
import { normalizePartialPeriodRatesForPrisma } from "@/lib/admin-partial-period-rates";
import { normalizeCoverageDistrictCodesInput } from "@/lib/geo/normalize-coverage-codes";
import { persistMediaCoverageDistrictCodes } from "@/lib/persist-media-coverage-district-codes";
import {
  parseInstallLocationsBody,
  resolveMediaCoordsForSave,
  type MediaInstallLocation,
} from "@/lib/media-install-locations";
import { persistMediaInstallLocations } from "@/lib/persist-media-install-locations";
import { attachInstallLocationsById } from "@/lib/read-media-install-locations";
import { attachCoverageDistrictCodesById } from "@/lib/read-media-coverage-district-codes";
import { applyNormalizedMediaLocation } from "@/lib/apply-media-location-normalize";
import { assignUniqueMediaSlug } from "@/lib/assign-media-slug";

export const dynamic = "force-dynamic";

function prismaMediaPostErrorMessage(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2021") {
      return "DB에 필요한 테이블이 없습니다. `prisma migrate deploy`(또는 스키마 동기화)를 실행한 뒤 다시 시도해 주세요.";
    }
    if (err.code === "P1001") {
      return "데이터베이스에 연결할 수 없습니다. DATABASE_URL·Neon 상태·방화벽을 확인해 주세요.";
    }
    if (err.code === "P2002") {
      return "동일한 값이 이미 등록되어 있습니다. (중복 제약)";
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "매체 저장 중 오류가 발생했습니다.";
}

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
  const q = searchParams.get("q")?.trim();

  const where: Prisma.MediaWhereInput | undefined = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { nameEn: { contains: q, mode: "insensitive" } },
          { location: { contains: q, mode: "insensitive" } },
          { district: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
        ],
      }
    : undefined;

  const medias = await db.media.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take,
  });
  const mediasWithCoverage = await attachCoverageDistrictCodesById(db, medias);
  const mediasWithExtras = await attachInstallLocationsById(
    db,
    mediasWithCoverage,
  );
  return json({ medias: mediasWithExtras });
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

  const covRaw =
    type === "mobile"
      ? Array.isArray(body.coverageDistrictCodes)
        ? body.coverageDistrictCodes
        : []
      : [];
  const covNorm = normalizeCoverageDistrictCodesInput(covRaw);
  if (covNorm === null) {
    return json(
      {
        error:
          "coverageDistrictCodes: 전국 시·군·구 5자리 행정구역 코드 문자열 배열만 허용됩니다.",
      },
      400,
    );
  }

  let installLocationsToPersist: MediaInstallLocation[] | null | undefined;

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
  const mediaCategory = optStrArr(body.mediaCategory);
  if (mediaCategory !== undefined) data.mediaCategory = mediaCategory;
  const mediaMainCategory = optStr(body.mediaMainCategory);
  if (mediaMainCategory !== undefined) data.mediaMainCategory = mediaMainCategory;
  const mediaSubCategory = optStr(body.mediaSubCategory);
  if (mediaSubCategory !== undefined) data.mediaSubCategory = mediaSubCategory;
  const regionMain = optStr(body.regionMain);
  if (regionMain !== undefined) data.regionMain = regionMain;
  const regionSub = optStr(body.regionSub);
  if (regionSub !== undefined) data.regionSub = regionSub;
  const targetCategory = optStrArr(body.targetCategory);
  if (targetCategory !== undefined) data.targetCategory = targetCategory;
  const dist = optStr(body.district);
  if (dist !== undefined) data.district = dist;
  const city = optStr(body.city);
  if (city !== undefined) data.city = city;
  const rz = optStr(body.regionZone);
  if (rz !== undefined) data.regionZone = rz;
  const lat = optNum(body.latitude);
  if (lat !== undefined) data.latitude = lat;
  const lng = optNum(body.longitude);
  if (lng !== undefined) data.longitude = lng;
  if (body.installLocations !== undefined) {
    const parsed = parseInstallLocationsBody(body.installLocations);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    installLocationsToPersist = parsed.value;
    const resolved = resolveMediaCoordsForSave({
      installLocations: parsed.value,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    });
    data.latitude = resolved.latitude;
    data.longitude = resolved.longitude;
  }
  delete (data as { installLocations?: unknown }).installLocations;
  const pn = optStr(body.priceNote);
  if (pn !== undefined) data.priceNote = pn;
  const po = normalizePriceOptionsForPrisma(body);
  if (po.kind === "error") {
    return json({ error: po.message }, 400);
  }
  if (po.kind === "ok") {
    data.priceOptions = po.data;
  }
  const ppr = normalizePartialPeriodRatesForPrisma(body);
  if (ppr.kind === "error") {
    return json({ error: ppr.message }, 400);
  }
  if (ppr.kind === "ok") {
    data.partialPeriodRates = ppr.data;
  }
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
  if (typeof body.isVerified === "boolean") {
    data.isVerified = body.isVerified;
  }

  try {
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

    const locNorm = {
      location: data.location,
      city: data.city ?? null,
      district: data.district ?? null,
      region: data.region,
      regionZone: data.regionZone ?? null,
    };
    applyNormalizedMediaLocation(locNorm);
    data.region = locNorm.region;
    data.regionZone = locNorm.regionZone;
    if (locNorm.city) data.city = locNorm.city;
    if (locNorm.district) data.district = locNorm.district;

    const db = getPrisma();
    if (!data.slug) {
      data.slug = await assignUniqueMediaSlug(db, name, data.nameEn);
    }
    const media = await db.$transaction(async (tx) => {
      const m = await tx.media.create({ data });
      await persistMediaCoverageDistrictCodes(
        tx,
        m.id,
        type === "mobile" ? covNorm : [],
      );
      if (installLocationsToPersist !== undefined) {
        await persistMediaInstallLocations(tx, m.id, installLocationsToPersist);
      }
      return m;
    });
    const [withCov] = await attachCoverageDistrictCodesById(db, [media]);
    const [mediaForClient] = await attachInstallLocationsById(db, [withCov]);

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

    revalidateMediaCaches({ id: media.id, slug: media.slug });

    return json({ media: mediaForClient }, 201);
  } catch (err) {
    console.error("[admin-api] media POST failed", err);
    return json({ error: prismaMediaPostErrorMessage(err) }, 500);
  }
}
