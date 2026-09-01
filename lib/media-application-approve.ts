import { Prisma } from "@prisma/client";
import type { MediaApplication } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { geocodeAddressWithKakao } from "@/lib/kakao-address-geocode";
import { maybeEstimateDailyFootfall } from "@/lib/media-daily-footfall-estimate";
import { maybeAutoFillNearbyMediaFields } from "@/lib/media-nearby-facilities";
import { enrichQuickAddMediaFromKakao } from "@/lib/media-location-enrich";
import {
  mapQuickAddToDb,
  type QuickAddMediaJson,
} from "@/lib/media-quick-add";
import { validateMappedMediaMetrics } from "@/lib/media-metrics-write";
import { resolveCatalogChannelForMediaWrite } from "@/lib/catalog-channel";
import { onMediaApplicationApproved } from "@/lib/media-owner-incentives";
import { notifyMediaOwnerApplicationApproved } from "@/lib/media-owner-notify";

function applicationToQuickAdd(
  app: MediaApplication,
  fullAddress: string,
): QuickAddMediaJson {
  const widthM =
    app.widthCm != null && app.widthCm > 0 ? app.widthCm / 100 : null;
  const heightM =
    app.heightCm != null && app.heightCm > 0 ? app.heightCm / 100 : null;

  const catalogType =
    app.mediaType === "dooh"
      ? "dooh"
      : app.mediaType === "static"
        ? "static"
        : app.isDigital
          ? "dooh"
          : "static";

  const imgs = [
    app.photoFrontUrl,
    app.photoSideUrl,
    app.photoNightUrl,
  ].filter(Boolean);

  const applicantNote = [
    `[매체사 신청] ${app.companyName} / ${app.contactName} (${app.contactEmail})`,
    app.notes?.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    media_name: app.mediaName,
    description:
      applicantNote ||
      `매체사 셀프 등록 신청 (${app.companyName})`,
    sub_category: app.isDigital ? "디지털 옥외" : "옥외광고",
    tags: ["매체사신청"],
    full_address: fullAddress,
    district: app.district ?? "",
    city: app.city ?? "",
    latitude: app.latitude,
    longitude: app.longitude,
    price_per_month: app.monthlyPrice,
    price_note:
      app.minFlightDays != null
        ? `최소 집행 ${app.minFlightDays}일 (신청서)`
        : "매체사 신청",
    width_m: widthM,
    height_m: heightM,
    resolution: null,
    operating_hours: app.operatingHours ?? "",
    daily_footfall: app.dailyFootfall,
    weekday_footfall: null,
    target_age: "",
    impressions: null,
    reach: null,
    frequency: null,
    cpm: null,
    engagement_rate: null,
    visibility_score: 50,
    effect_memo: app.hasLighting ? "조명 있음 (신청)" : "",
    extracted_images: imgs,
    nearby_facilities: "",
    nearby_stations: "",
    nearby_landmarks: "",
    past_advertisers: "",
    type: catalogType,
  };
}

export async function approveMediaApplication(
  applicationId: string,
): Promise<{ mediaId: string; mediaName: string }> {
  const db = getPrisma();
  const app = await db.mediaApplication.findUnique({
    where: { id: applicationId },
  });
  if (!app) {
    throw new Error("신청을 찾을 수 없습니다.");
  }
  if (app.status === "APPROVED" && app.createdMediaId) {
    return { mediaId: app.createdMediaId, mediaName: app.mediaName };
  }
  if (app.status === "REJECTED") {
    throw new Error("반려된 신청은 승인할 수 없습니다.");
  }

  const fullAddress = [app.address, app.addressDetail]
    .filter(Boolean)
    .join(" ")
    .trim();

  let row = applicationToQuickAdd(app, fullAddress);

  if ((!row.latitude || !row.longitude) && fullAddress) {
    const geo = await geocodeAddressWithKakao(fullAddress);
    if (geo) {
      row = {
        ...row,
        latitude: geo.latitude,
        longitude: geo.longitude,
        city: row.city || geo.city,
        district: row.district || geo.district,
        full_address: geo.addressName || fullAddress,
      };
    }
  }

  const { row: enriched, addressVerified: geoVerified } =
    await enrichQuickAddMediaFromKakao(row);

  const autoNear = await maybeAutoFillNearbyMediaFields({
    existingFacilities: enriched.nearby_facilities,
    existingStations: enriched.nearby_stations,
    existingLandmarks: enriched.nearby_landmarks,
    latitude: enriched.latitude,
    longitude: enriched.longitude,
  });

  let withNearby = enriched;
  if (autoNear) {
    withNearby = {
      ...withNearby,
      nearby_facilities:
        autoNear.nearbyFacilities ?? withNearby.nearby_facilities,
      nearby_stations: autoNear.nearbyStations ?? withNearby.nearby_stations,
      nearby_landmarks:
        autoNear.nearbyLandmarks ?? withNearby.nearby_landmarks,
    };
  }

  const foot = await maybeEstimateDailyFootfall({
    existingDaily: withNearby.daily_footfall,
    latitude: withNearby.latitude,
    longitude: withNearby.longitude,
    city: withNearby.city,
    district: withNearby.district,
  });
  const withFoot =
    foot != null ? { ...withNearby, daily_footfall: foot } : withNearby;

  const base = mapQuickAddToDb(withFoot);
  const metrics = validateMappedMediaMetrics(base);
  if (!metrics.ok) {
    throw new Error(
      `메트릭 검증 실패: ${metrics.errors.map((e) => e.message).join("; ")}`,
    );
  }

  let ownerUserId: string | null = app.userId ?? null;
  if (!ownerUserId && app.contactEmail) {
    const linked = await db.user.findFirst({
      where: {
        email: app.contactEmail.trim().toLowerCase(),
        deletedAt: null,
      },
      select: { id: true },
    });
    ownerUserId = linked?.id ?? null;
  }

  const result = await db.$transaction(async (tx) => {
    const media = await tx.media.create({
      data: {
        ...base,
        priceOptions: base.priceOptions ?? Prisma.JsonNull,
        addressVerified: geoVerified || Boolean(app.latitude),
        autoPopulatedAt: autoNear?.autoPopulatedAt ?? null,
        isActive: true,
        availability: "available",
        ownerUserId,
        catalogChannel: resolveCatalogChannelForMediaWrite({}),
      },
    });
    await tx.mediaPriceSnapshot.create({
      data: {
        mediaId: media.id,
        price: media.price,
        note: "media-application-approve",
      },
    });
    await tx.mediaApplication.update({
      where: { id: applicationId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        createdMediaId: media.id,
      },
    });
    return media;
  });

  void onMediaApplicationApproved({
    ownerUserId,
    contactEmail: app.contactEmail,
  }).catch((err) => console.error("[approve] incentives", err));

  if (ownerUserId) {
    void notifyMediaOwnerApplicationApproved({
      ownerUserId,
      mediaName: result.name,
      contactPhone: app.contactPhone,
    }).catch((err) => console.error("[approve] alimtalk", err));
  }

  return { mediaId: result.id, mediaName: result.name };
}
