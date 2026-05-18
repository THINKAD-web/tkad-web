export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import { redirect } from "@/i18n/navigation";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { MediaFavoritesPageClient } from "@/components/media-favorites-page-client";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getCurrentUser } from "@/lib/user-session";

type Props = { params: Promise<{ locale: string }> };

/** 로그인 사용자 찜 목록 → 마이페이지 허브(저장한 매체 탭) */
export default async function MediaFavoritesPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const user = await getCurrentUser();
  if (user) {
    redirect({ href: "/my?tab=favorites", locale });
  }

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
