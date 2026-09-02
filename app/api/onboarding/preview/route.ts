import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-session";
import { getUserPreferenceByUserId } from "@/lib/user-preference";
import { recommendMediaForPreference } from "@/lib/onboarding-recommend";
import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";
import {
  getPrimaryMediaImageUrl,
} from "@/lib/media-data";
import { resolveMediaDisplayPill } from "@/lib/media-display-labels";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const locale = searchParams.get("locale") === "en" ? "en" : "ko";

  const pref = await getUserPreferenceByUserId(user.id);
  const catalog = await fetchPublicMediaCatalogList();
  const items = recommendMediaForPreference(
    pref ?? {
      onboardingRole: null,
      industries: [],
      budgetRange: null,
      onboardingCompletedAt: null,
    },
    catalog,
    3,
  );

  const isKo = locale === "ko";
  return NextResponse.json({
    items: items.map((m) => {
      const name = isKo ? m.name : m.nameEn || m.name;
      const location = isKo ? m.location : m.locationEn || m.location;
      const typeLabel = resolveMediaDisplayPill(m, isKo ? "ko" : "en");
      return {
        id: m.id,
        href: mediaItemDetailPath(m),
        name,
        location,
        type: typeLabel,
        price:
          m.price > 0 ? formatCatalogPriceFieldWon(m.price, locale) : undefined,
        imageSrc: getPrimaryMediaImageUrl(m),
        isVerified: m.isVerified,
      };
    }),
  });
}
