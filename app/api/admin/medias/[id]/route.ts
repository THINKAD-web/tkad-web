import type { Prisma } from "@prisma/client";
import { MediaAvailability } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { isAdminAuthDebugEnabled } from "@/lib/admin-session";
import { kakaoFillForMediaPatch } from "@/lib/media-location-enrich";
import { applyNormalizedMediaLocation } from "@/lib/apply-media-location-normalize";
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
import { attachCoverageDistrictCodesById } from "@/lib/read-media-coverage-district-codes";
import { persistMediaCoverageDistrictCodes } from "@/lib/persist-media-coverage-district-codes";
import { notifyFavoriteUsersMediaAvailability } from "@/lib/notifications";
import { notifyFavoriteUsersPriceChange } from "@/lib/notifications-price";
import {
  bunnyPublicUrlsRemoved,
  collectMediaImageUrls,
  deleteBunnyPublicUrls,
} from "@/lib/bunny-storage";
import {
  parseInstallLocationsBody,
  parseMediaInstallLocations,
  resolveMediaCoordsForSave,
  type MediaInstallLocation,
} from "@/lib/media-install-locations";
import { persistMediaInstallLocations } from "@/lib/persist-media-install-locations";
import { attachInstallLocationsById } from "@/lib/read-media-install-locations";

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
      advertiserExecutions: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!media) return json({ error: "Not found" }, 404);
  const [mediaWithCoverage] = await attachCoverageDistrictCodesById(db, [media]);
  const [mediaWithExtras] = await attachInstallLocationsById(db, [
    mediaWithCoverage,
  ]);
  return json({ media: mediaWithExtras });
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

  const db = getPrisma();
  const existing = await db.media.findUnique({ where: { id } });
  if (!existing) return json({ error: "Not found" }, 404);

  const data: Prisma.MediaUpdateInput = {};
  let installLocationsToPersist: MediaInstallLocation[] | null | undefined;
  if (body.name != null) data.name = String(body.name).trim();
  if (body.nameEn !== undefined)
    data.nameEn = String(body.nameEn ?? "").trim() || null;
  if (body.location != null) data.location = String(body.location).trim();
  if (body.region != null) data.region = String(body.region).trim();
  if (body.regionZone !== undefined) {
    if (body.regionZone === null) data.regionZone = null;
    else data.regionZone = String(body.regionZone).trim() || null;
  }
  if (body.type != null) {
    const nextType = String(body.type).trim();
    if (!isValidCatalogMediaType(nextType)) {
      return json(
        {
          error: `type must be one of: ${CATALOG_MEDIA_TYPES.join(", ")}`,
        },
        400,
      );
    }
    data.type = nextType;
  }
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
  if (body.mediaCategory !== undefined) {
    if (
      !Array.isArray(body.mediaCategory) ||
      !body.mediaCategory.every((x) => typeof x === "string")
    ) {
      return json({ error: "mediaCategory must be string[]" }, 400);
    }
    data.mediaCategory = body.mediaCategory;
  }
  if (body.mediaMainCategory !== undefined) {
    data.mediaMainCategory =
      body.mediaMainCategory === null
        ? null
        : String(body.mediaMainCategory).trim() || null;
  }
  if (body.mediaSubCategory !== undefined) {
    data.mediaSubCategory =
      body.mediaSubCategory === null
        ? null
        : String(body.mediaSubCategory).trim() || null;
  }
  if (body.regionMain !== undefined) {
    data.regionMain =
      body.regionMain === null
        ? null
        : String(body.regionMain).trim() || null;
  }
  if (body.regionSub !== undefined) {
    data.regionSub =
      body.regionSub === null
        ? null
        : String(body.regionSub).trim() || null;
  }
  if (body.targetCategory !== undefined) {
    if (
      !Array.isArray(body.targetCategory) ||
      !body.targetCategory.every((x) => typeof x === "string")
    ) {
      return json({ error: "targetCategory must be string[]" }, 400);
    }
    data.targetCategory = body.targetCategory;
  }
  if (body.coverageDistrictCodes !== undefined) {
    const normalized = normalizeCoverageDistrictCodesInput(
      body.coverageDistrictCodes,
    );
    if (normalized === null) {
      return json(
        {
          error:
            "coverageDistrictCodes: 전국 시·군·구 5자리 행정구역 코드 문자열 배열만 허용됩니다.",
        },
        400,
      );
    }
    data.coverageDistrictCodes = normalized;
  }
  if (body.district !== undefined)
    data.district = String(body.district ?? "").trim() || null;
  if (body.city !== undefined)
    data.city = String(body.city ?? "").trim() || null;
  if (body.latitude !== undefined) {
    if (body.latitude === null) {
      data.latitude = null;
    } else {
      const n = Number(body.latitude);
      data.latitude = Number.isFinite(n) ? n : null;
    }
  }
  if (body.longitude !== undefined) {
    if (body.longitude === null) {
      data.longitude = null;
    } else {
      const n = Number(body.longitude);
      data.longitude = Number.isFinite(n) ? n : null;
    }
  }
  if (body.installLocations !== undefined) {
    const parsed = parseInstallLocationsBody(body.installLocations);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    installLocationsToPersist = parsed.value;
  }
  if (body.priceNote !== undefined)
    data.priceNote = String(body.priceNote ?? "").trim() || null;

  const priceOpts = normalizePriceOptionsForPrisma(body);
  if (priceOpts.kind === "error") {
    return json({ error: priceOpts.message }, 400);
  }
  if (priceOpts.kind === "ok") {
    data.priceOptions = priceOpts.data;
  }

  const partialRates = normalizePartialPeriodRatesForPrisma(body);
  if (partialRates.kind === "error") {
    return json({ error: partialRates.message }, 400);
  }
  if (partialRates.kind === "ok") {
    data.partialPeriodRates = partialRates.data;
  }

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
  if (body.pastAdvertisers !== undefined) {
    if (body.pastAdvertisers === null) {
      data.pastAdvertisers = null;
    } else {
      data.pastAdvertisers = String(body.pastAdvertisers).trim() || null;
    }
  }
  if (body.extractedImages !== undefined) {
    if (
      !Array.isArray(body.extractedImages) ||
      !body.extractedImages.every((x) => typeof x === "string")
    ) {
      return json({ error: "extractedImages must be string[]" }, 400);
    }
    data.extractedImages = body.extractedImages;
  }

  if (body.availability != null) {
    const a = String(body.availability);
    if (!Object.values(MediaAvailability).includes(a as MediaAvailability)) {
      return json({ error: "Invalid availability" }, 400);
    }
    data.availability = a as MediaAvailability;
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      return json({ error: "isActive must be boolean" }, 400);
    }
    data.isActive = body.isActive;
  }

  if (body.instantBookingEnabled !== undefined) {
    if (typeof body.instantBookingEnabled !== "boolean") {
      return json({ error: "instantBookingEnabled must be boolean" }, 400);
    }
    data.instantBookingEnabled = body.instantBookingEnabled;
  }

  if (body.isFeatured !== undefined) {
    if (typeof body.isFeatured !== "boolean") {
      return json({ error: "isFeatured must be boolean" }, 400);
    }
    data.isFeatured = body.isFeatured;
    if (!body.isFeatured) {
      data.featuredOrder = null;
    }
  }
  if (body.featuredOrder !== undefined) {
    if (body.featuredOrder === null) {
      data.featuredOrder = null;
    } else {
      const n = Math.round(Number(body.featuredOrder));
      if (!Number.isFinite(n)) {
        return json(
          { error: "featuredOrder must be a number or null" },
          400,
        );
      }
      data.featuredOrder = n;
    }
  }

  if (body.isPopular !== undefined) {
    if (typeof body.isPopular !== "boolean") {
      return json({ error: "isPopular must be boolean" }, 400);
    }
    data.isPopular = body.isPopular;
    if (!body.isPopular) {
      data.popularOrder = null;
    }
  }
  if (body.popularOrder !== undefined) {
    if (body.popularOrder === null) {
      data.popularOrder = null;
    } else {
      const n = Math.round(Number(body.popularOrder));
      if (!Number.isFinite(n)) {
        return json(
          { error: "popularOrder must be a number or null" },
          400,
        );
      }
      data.popularOrder = n;
    }
  }

  if (body.nearbyFacilities !== undefined) {
    if (body.nearbyFacilities === null) {
      data.nearbyFacilities = null;
    } else {
      data.nearbyFacilities = String(body.nearbyFacilities).trim() || null;
    }
  }
  if (body.nearbyStations !== undefined) {
    if (body.nearbyStations === null) {
      data.nearbyStations = null;
    } else {
      data.nearbyStations = String(body.nearbyStations).trim() || null;
    }
  }
  if (body.nearbyLandmarks !== undefined) {
    if (body.nearbyLandmarks === null) {
      data.nearbyLandmarks = null;
    } else {
      data.nearbyLandmarks = String(body.nearbyLandmarks).trim() || null;
    }
  }
  if (body.addressVerified !== undefined) {
    if (typeof body.addressVerified !== "boolean") {
      return json({ error: "addressVerified must be boolean" }, 400);
    }
    data.addressVerified = body.addressVerified;
  }
  if (body.isVerified !== undefined) {
    if (typeof body.isVerified !== "boolean") {
      return json({ error: "isVerified must be boolean" }, 400);
    }
    data.isVerified = body.isVerified;
  }

  if ("location" in body) {
    const trimmed = String(body.location ?? "").trim();
    const geo = await kakaoFillForMediaPatch(body, trimmed);
    if (geo) Object.assign(data, geo);
  }

  let mergedLat: number | null = existing.latitude;
  if ("latitude" in body) {
    if (body.latitude === null) mergedLat = null;
    else {
      const n = Number(body.latitude);
      mergedLat = Number.isFinite(n) ? n : null;
    }
  } else if (data.latitude !== undefined) {
    const v = data.latitude;
    mergedLat =
      v === null
        ? null
        : typeof v === "number" && Number.isFinite(v)
          ? v
          : existing.latitude;
  }

  let mergedLng: number | null = existing.longitude;
  if ("longitude" in body) {
    if (body.longitude === null) mergedLng = null;
    else {
      const n = Number(body.longitude);
      mergedLng = Number.isFinite(n) ? n : null;
    }
  } else if (data.longitude !== undefined) {
    const v = data.longitude;
    mergedLng =
      v === null
        ? null
        : typeof v === "number" && Number.isFinite(v)
          ? v
          : existing.longitude;
  }

  let mergedInstalls = parseMediaInstallLocations(existing.installLocations);
  if (body.installLocations !== undefined) {
    const parsed = parseInstallLocationsBody(body.installLocations);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    mergedInstalls = parsed.value ?? [];
    installLocationsToPersist = parsed.value;
  }

  const coordsResolved = resolveMediaCoordsForSave({
    installLocations: mergedInstalls.length > 0 ? mergedInstalls : null,
    latitude: mergedLat,
    longitude: mergedLng,
  });
  mergedLat = coordsResolved.latitude;
  mergedLng = coordsResolved.longitude;
  if (mergedInstalls.length > 0 || body.installLocations !== undefined) {
    data.latitude = coordsResolved.latitude;
    data.longitude = coordsResolved.longitude;
  }

  const mergedNearby =
    "nearbyFacilities" in body
      ? body.nearbyFacilities === null || body.nearbyFacilities === undefined
        ? null
        : String(body.nearbyFacilities).trim() || null
      : existing.nearbyFacilities;

  const mergedStations =
    "nearbyStations" in body
      ? body.nearbyStations === null || body.nearbyStations === undefined
        ? null
        : String(body.nearbyStations).trim() || null
      : existing.nearbyStations;

  const mergedLandmarks =
    "nearbyLandmarks" in body
      ? body.nearbyLandmarks === null || body.nearbyLandmarks === undefined
        ? null
        : String(body.nearbyLandmarks).trim() || null
      : existing.nearbyLandmarks;

  const nearbyKeysTouched =
    "nearbyFacilities" in body ||
    "nearbyStations" in body ||
    "nearbyLandmarks" in body;

  const needNearbyAuto =
    !mergedNearby?.trim() ||
    !mergedStations?.trim() ||
    !mergedLandmarks?.trim();

  if (
    !nearbyKeysTouched &&
    mergedLat != null &&
    mergedLng != null &&
    needNearbyAuto
  ) {
    const auto = await maybeAutoFillNearbyMediaFields({
      existingFacilities: mergedNearby,
      existingStations: mergedStations,
      existingLandmarks: mergedLandmarks,
      latitude: mergedLat,
      longitude: mergedLng,
    });
    if (auto) {
      if (auto.nearbyFacilities != null) data.nearbyFacilities = auto.nearbyFacilities;
      if (auto.nearbyStations != null) data.nearbyStations = auto.nearbyStations;
      if (auto.nearbyLandmarks != null) data.nearbyLandmarks = auto.nearbyLandmarks;
      data.autoPopulatedAt = auto.autoPopulatedAt;
    }
  }

  let mergedCity: string | null = existing.city;
  if ("city" in body) {
    mergedCity =
      body.city === null || body.city === undefined
        ? null
        : String(body.city).trim() || null;
  } else if (Object.prototype.hasOwnProperty.call(data, "city")) {
    const c = data.city as string | null | undefined;
    mergedCity =
      c === null || c === undefined ? null : String(c).trim() || null;
  }

  let mergedDistrict: string | null = existing.district;
  if ("district" in body) {
    mergedDistrict =
      body.district === null || body.district === undefined
        ? null
        : String(body.district).trim() || null;
  } else if (Object.prototype.hasOwnProperty.call(data, "district")) {
    const d = data.district as string | null | undefined;
    mergedDistrict =
      d === null || d === undefined ? null : String(d).trim() || null;
  }

  let mergedDaily: number | null = existing.dailyFootfall;
  if ("dailyFootfall" in body) {
    if (body.dailyFootfall === null) mergedDaily = null;
    else {
      const n = Math.round(Number(body.dailyFootfall));
      mergedDaily = Number.isFinite(n) ? n : null;
    }
  }

  if (
    !("dailyFootfall" in body) &&
    mergedLat != null &&
    mergedLng != null &&
    (mergedDaily == null || mergedDaily === 0)
  ) {
    const est = await maybeEstimateDailyFootfall({
      existingDaily: mergedDaily,
      latitude: mergedLat,
      longitude: mergedLng,
      city: mergedCity,
      district: mergedDistrict,
    });
    if (est != null) data.dailyFootfall = est;
  }

  const resolvedType =
    typeof body.type === "string" ? String(body.type).trim() : existing.type;
  if (resolvedType !== "mobile") {
    data.coverageDistrictCodes = [];
  }

  const dataAsRecord = data as Record<string, unknown>;
  const coverageCodesForSql = Object.prototype.hasOwnProperty.call(
    dataAsRecord,
    "coverageDistrictCodes",
  )
    ? (dataAsRecord.coverageDistrictCodes as string[])
    : undefined;
  if (Object.prototype.hasOwnProperty.call(dataAsRecord, "coverageDistrictCodes")) {
    delete dataAsRecord.coverageDistrictCodes;
  }

  const mergedLocation =
    data.location != null ? String(data.location) : existing.location;
  const mergedRegion =
    data.region != null ? String(data.region) : existing.region;
  const mergedRegionZone =
    body.regionZone !== undefined
      ? body.regionZone === null
        ? null
        : String(body.regionZone).trim() || null
      : existing.regionZone;

  const locNorm = {
    location: mergedLocation,
    city: mergedCity,
    district: mergedDistrict,
    region: mergedRegion,
    regionZone: mergedRegionZone,
  };
  applyNormalizedMediaLocation(locNorm);
  data.region = locNorm.region;
  data.regionZone = locNorm.regionZone;
  if (locNorm.city) data.city = locNorm.city;
  if (locNorm.district) data.district = locNorm.district;

  let bunnyUrlsToPurge: string[] = [];
  if (body.extractedImages !== undefined || body.image !== undefined) {
    const nextImage =
      body.image !== undefined
        ? String(body.image ?? "").trim() || null
        : existing.image;
    const nextExtracted =
      body.extractedImages !== undefined
        ? (body.extractedImages as string[])
        : existing.extractedImages;
    bunnyUrlsToPurge = bunnyPublicUrlsRemoved(
      collectMediaImageUrls(existing.image, existing.extractedImages),
      collectMediaImageUrls(nextImage, nextExtracted),
    );
  }

  delete (data as { installLocations?: unknown }).installLocations;

  try {
    const media = await db.$transaction(async (tx) => {
      const updated = await tx.media.update({
        where: { id },
        data: data as Prisma.MediaUpdateInput,
      });
      if (coverageCodesForSql !== undefined) {
        await persistMediaCoverageDistrictCodes(tx, id, coverageCodesForSql);
      }
      if (installLocationsToPersist !== undefined) {
        await persistMediaInstallLocations(tx, id, installLocationsToPersist);
      }
      return updated;
    });
    const [withCov] = await attachCoverageDistrictCodesById(db, [media]);
    const [mediaForClient] = await attachInstallLocationsById(db, [withCov]);
    if (isAdminAuthDebugEnabled()) {
      console.log("[admin-api] media PATCH persisted", {
        id: media.id,
        name: media.name,
      });
    }
    if (
      body.availability != null &&
      media.availability !== existing.availability
    ) {
      void notifyFavoriteUsersMediaAvailability(
        media.id,
        media.name,
        existing.availability,
        media.availability,
      );
    }
    if (body.price != null && media.price !== existing.price) {
      void notifyFavoriteUsersPriceChange({
        mediaId: media.id,
        mediaName: media.name,
        oldPriceWon: existing.price,
        newPriceWon: media.price,
      }).catch((err) => console.error("[admin/media] price alert", err));
    }
    try {
      for (const locale of ["ko", "en"] as const) {
        revalidatePath(`/${locale}/compare`);
        revalidatePath(`/${locale}/media`);
        revalidatePath(`/${locale}/media/${media.slug ?? id}`);
        if (media.slug && media.slug !== id) {
          revalidatePath(`/${locale}/media/${id}`);
        }
        revalidatePath(`/${locale}/planner`);
        revalidatePath(`/${locale}/quote`);
      }
    } catch {
      /* revalidatePath는 일부 환경에서만 동작 */
    }
    if (bunnyUrlsToPurge.length > 0) {
      void deleteBunnyPublicUrls(bunnyUrlsToPurge);
    }
    return json({ media: mediaForClient });
  } catch (err) {
    // 기존 구현은 모든 오류를 404로 감춰서(Prisma 스키마 불일치 포함) 디버깅이 어려웠음.
    // 운영/개발 모두에서 최소한의 힌트를 제공한다.
    const message =
      err instanceof Error && err.message
        ? err.message
        : "매체 업데이트 중 오류가 발생했습니다.";
    // Prisma validation/unknown field 등의 경우 500이 맞다.
    return json({ error: message }, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const db = getPrisma();
  const existing = await db.media.findUnique({ where: { id } });
  if (!existing) return json({ error: "Not found" }, 404);

  const bunnyUrls = collectMediaImageUrls(
    existing.image,
    existing.extractedImages,
  );

  try {
    await db.media.delete({ where: { id } });
    if (bunnyUrls.length > 0) {
      void deleteBunnyPublicUrls(bunnyUrls);
    }
    return json({ ok: true });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}
