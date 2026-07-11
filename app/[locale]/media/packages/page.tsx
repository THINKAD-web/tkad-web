import { fetchActiveMediaPackages } from "@/lib/media-package-db";
import { fetchPackageLandingPreviews } from "@/lib/media-landing-previews";
import { PackagesPageClient } from "@/components/packages/packages-page-client";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getPublicMediaCountLabel } from "@/lib/trust-metrics";
import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ locale: string }> };

export default async function MediaPackagesPage({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);
  const isKo = locale.startsWith("ko");
  const [packages, verifiedCountLabel] = await Promise.all([
    fetchActiveMediaPackages(),
    getPublicMediaCountLabel("verified"),
  ]);
  const previews = await fetchPackageLandingPreviews(packages);

  return (
    <HomeLandingDayNight>
      <PackagesPageClient
        packages={packages}
        previews={previews}
        isKo={isKo}
        verifiedCountLabel={verifiedCountLabel}
      />
    </HomeLandingDayNight>
  );
}
