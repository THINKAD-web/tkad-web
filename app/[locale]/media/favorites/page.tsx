export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { MediaFavoritesPageClient } from "@/components/media-favorites-page-client";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

export default async function MediaFavoritesPage() {
  const catalog = await fetchPublicMediaCatalog();

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-media-page min-h-[60vh] bg-card">
        <Suspense fallback={null}>
          <MediaFavoritesPageClient catalog={catalog} />
        </Suspense>
      </div>
    </HomeLandingDayNight>
  );
}
