import MediaMapPageClient from "@/components/media-map/media-map-page-client";
import { resolveLocaleParam } from "@/lib/resolve-locale";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MediaMapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await resolveLocaleParam(params);
  return <MediaMapPageClient />;
}
