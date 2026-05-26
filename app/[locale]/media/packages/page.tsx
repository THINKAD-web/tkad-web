import { fetchActiveMediaPackages } from "@/lib/media-package-db";
import { PackagesPageClient } from "@/components/packages/packages-page-client";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ locale: string }> };

export default async function MediaPackagesPage({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);
  const isKo = locale.startsWith("ko");
  const packages = await fetchActiveMediaPackages();

  return <PackagesPageClient packages={packages} isKo={isKo} />;
}
