import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAdminMediaRow,
  parseAdminMediaListFromApiJson,
  prismaMediaToAdminDto,
} from "./admin-media-dto.ts";
import { isQuoteWizardSelectableMedia } from "./pricing-unavailable.ts";

describe("normalizeAdminMediaRow", () => {
  it("preserves catalogChannel for online rows (quote picker gate)", () => {
    const row = normalizeAdminMediaRow({
      id: "online-1",
      name: "구글 검색광고·전환",
      location: "온라인",
      region: "전국",
      type: null,
      price: null,
      catalogChannel: "online",
      mediaMainCategory: "online",
    });
    assert.ok(row);
    assert.equal(row.catalogChannel, "online");
    assert.equal(isQuoteWizardSelectableMedia(row), false);
  });

  it("preserves catalogChannel from snake_case API", () => {
    const row = normalizeAdminMediaRow({
      id: "online-2",
      name: "Test",
      location: "L",
      region: "R",
      catalog_channel: "online",
    });
    assert.ok(row);
    assert.equal(row.catalogChannel, "online");
  });

  it("parseAdminMediaListFromApiJson filters online from wizard-selectable set", () => {
    const { medias, error } = parseAdminMediaListFromApiJson({
      medias: [
        {
          id: "off-1",
          name: "Offline",
          location: "Seoul",
          region: "서울",
          type: "dooh",
          price: 1000000,
          catalogChannel: "offline",
        },
        {
          id: "on-1",
          name: "Online",
          location: "Online",
          region: "전국",
          type: null,
          price: null,
          catalogChannel: "online",
        },
      ],
    });
    assert.equal(error, null);
    const selectable = medias.filter(isQuoteWizardSelectableMedia);
    assert.equal(selectable.length, 1);
    assert.equal(selectable[0]?.id, "off-1");
  });

  it("stays aligned with prismaMediaToAdminDto for catalogChannel + mediaMainCategory", () => {
    const prismaLike = {
      id: "x",
      name: "N",
      nameEn: null,
      locationEn: null,
      country: "KR",
      location: "L",
      region: "R",
      regionZone: null,
      type: null,
      price: null,
      catalogChannel: "online",
      image: null,
      width: null,
      height: null,
      description: null,
      descriptionEn: null,
      subCategory: null,
      mediaCategory: [],
      targetCategory: [],
      tags: [],
      district: null,
      city: null,
      latitude: null,
      longitude: null,
      priceNote: null,
      widthM: null,
      heightM: null,
      resolution: null,
      operatingHours: null,
      dailyFootfall: null,
      weekdayFootfall: null,
      targetAge: null,
      impressions: null,
      reach: null,
      frequency: null,
      cpm: null,
      engagementRate: null,
      visibilityScore: 0,
      effectMemo: null,
      extractedImages: [],
      pastAdvertisers: null,
      nearbyFacilities: null,
      nearbyStations: null,
      nearbyLandmarks: null,
      addressVerified: false,
      isVerified: false,
      autoPopulatedAt: null,
      availability: "available",
      instantBookingEnabled: false,
      isActive: true,
      reviewStatus: "clean",
      reviewReason: null,
      flaggedAt: null,
      isFeatured: false,
      featuredOrder: null,
      isPopular: false,
      popularOrder: null,
      priceOptions: null,
      partialPeriodRates: null,
      coverageDistrictCodes: [],
      proposalUrl: null,
      proposalFileName: null,
      hasProposal: false,
      mediaMainCategory: "online",
      mediaSubCategory: null,
      pricingMode: "fixed",
      regionMain: null,
      regionSub: null,
    } as Parameters<typeof prismaMediaToAdminDto>[0];

    const fromPrisma = prismaMediaToAdminDto(prismaLike);
    const fromNormalize = normalizeAdminMediaRow(prismaLike);
    assert.ok(fromNormalize);
    assert.equal(fromNormalize.catalogChannel, fromPrisma.catalogChannel);
    assert.equal(fromNormalize.mediaMainCategory, fromPrisma.mediaMainCategory);
  });
});
