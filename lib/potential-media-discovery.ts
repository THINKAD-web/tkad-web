import type { PotentialMediaSource } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { searchKakaoKeywordPlaces } from "@/lib/kakao-local-keyword-search";
import {
  isGooglePlacesConfigured,
  searchGooglePlacesText,
} from "@/lib/google-places-search";

const SEARCH_KEYWORDS = ["전광판", "옥외광고", "디지털 사이니지", "빌보드"];

/** 서울·수도권 주요 상권 중심 */
const SEARCH_CENTERS: { label: string; lat: number; lng: number }[] = [
  { label: "강남", lat: 37.4979, lng: 127.0276 },
  { label: "홍대", lat: 37.5563, lng: 126.922 },
  { label: "성수", lat: 37.5445, lng: 127.0557 },
  { label: "여의도", lat: 37.5219, lng: 126.9245 },
  { label: "잠실", lat: 37.5133, lng: 127.1001 },
  { label: "부산 서면", lat: 35.1579, lng: 129.0595 },
];

export type DiscoverPotentialMediaResult = {
  discovered: number;
  inserted: number;
  skippedDuplicate: number;
  sources: { kakao: number; google: number };
};

async function upsertPlace(input: {
  source: PotentialMediaSource;
  externalPlaceId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  contactInfo: { phone?: string; email?: string; url?: string } | null;
}): Promise<"inserted" | "duplicate"> {
  const db = getPrisma();
  const existing = await db.potentialMedia.findUnique({
    where: {
      foundFrom_externalPlaceId: {
        foundFrom: input.source,
        externalPlaceId: input.externalPlaceId,
      },
    },
    select: { id: true },
  });
  if (existing) return "duplicate";

  const contact =
    input.contactInfo &&
    (input.contactInfo.phone || input.contactInfo.email || input.contactInfo.url)
      ? input.contactInfo
      : null;

  await db.potentialMedia.create({
    data: {
      name: input.name.slice(0, 200),
      address: input.address.slice(0, 500),
      lat: input.lat,
      lng: input.lng,
      foundFrom: input.source,
      externalPlaceId: input.externalPlaceId,
      contactInfo: contact ?? undefined,
      outreachStatus: contact?.phone || contact?.email ? "CONTACT_FOUND" : "NEW",
    },
  });
  return "inserted";
}

export async function discoverPotentialMedia(): Promise<DiscoverPotentialMediaResult> {
  if (!isDatabaseConfigured()) {
    return {
      discovered: 0,
      inserted: 0,
      skippedDuplicate: 0,
      sources: { kakao: 0, google: 0 },
    };
  }

  let discovered = 0;
  let inserted = 0;
  let skippedDuplicate = 0;
  let kakaoCount = 0;
  let googleCount = 0;

  for (const center of SEARCH_CENTERS) {
    for (const keyword of SEARCH_KEYWORDS) {
      const kakaoHits = await searchKakaoKeywordPlaces({
        query: keyword,
        lat: center.lat,
        lng: center.lng,
        radiusM: 12000,
      });
      kakaoCount += kakaoHits.length;

      for (const hit of kakaoHits) {
        discovered += 1;
        const result = await upsertPlace({
          source: "KAKAO_MAP",
          externalPlaceId: hit.externalPlaceId,
          name: hit.name,
          address: hit.address,
          lat: hit.lat,
          lng: hit.lng,
          contactInfo: hit.phone ? { phone: hit.phone } : null,
        });
        if (result === "inserted") inserted += 1;
        else skippedDuplicate += 1;
      }

      if (isGooglePlacesConfigured()) {
        const googleHits = await searchGooglePlacesText({
          query: `${keyword} ${center.label}`,
          lat: center.lat,
          lng: center.lng,
          radiusM: 12000,
        });
        googleCount += googleHits.length;
        for (const hit of googleHits) {
          discovered += 1;
          const result = await upsertPlace({
            source: "GOOGLE_MAP",
            externalPlaceId: hit.externalPlaceId,
            name: hit.name,
            address: hit.address,
            lat: hit.lat,
            lng: hit.lng,
            contactInfo: null,
          });
          if (result === "inserted") inserted += 1;
          else skippedDuplicate += 1;
        }
      }
    }
  }

  return {
    discovered,
    inserted,
    skippedDuplicate,
    sources: { kakao: kakaoCount, google: googleCount },
  };
}
