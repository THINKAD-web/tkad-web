import MediaMapPageClient from "@/components/media-map/media-map-page-client";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MediaMapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await resolveLocaleParam(params);
  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-media-page">
        <MediaMapPageClient />
      </div>
    </HomeLandingDayNight>
  );
}
