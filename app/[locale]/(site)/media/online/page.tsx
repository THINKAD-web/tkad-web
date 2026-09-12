import { Suspense } from "react";
import { MediaBrowsePageSkeleton } from "@/components/media/media-card-skeleton";
import { MediaSearchPage } from "@/components/media/media-search-page";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { fetchDefaultMediaBrowsePage } from "@/lib/media-browse-initial-page";

/** ISR shell — no `searchParams` so filters do not force per-request SSR. */
export const revalidate = 3600;

type Props = {
  params: Promise<{ locale: string }>;
};

/**
 * `/media/online` — online ads catalog browse (PR4), pre-populated with the
 * first (unfiltered, default-sort) page so SSR HTML/crawlers see real listings
 * instead of an empty loading skeleton. Filtered catalog still loads
 * client-side via `/api/public/media` (see `media-search-page.tsx`).
 */
export default async function MediaOnlinePage({ params }: Props) {
  await resolveLocaleParam(params);
  const { initialMedia, initialCatalogItems, initialTotal } =
    await fetchDefaultMediaBrowsePage("online");

  return (
    <Suspense fallback={<MediaBrowsePageSkeleton />}>
      <MediaSearchPage
        appShell
        browseChannel="online"
        initialMedia={initialMedia}
        initialCatalogItems={initialCatalogItems}
        initialTotal={initialTotal}
      />
    </Suspense>
  );
}
