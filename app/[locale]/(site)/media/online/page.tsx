import { Suspense } from "react";
import { MediaBrowsePageSkeleton } from "@/components/media/media-card-skeleton";
import { MediaSearchPage } from "@/components/media/media-search-page";
import { resolveLocaleParam } from "@/lib/resolve-locale";

/** ISR shell — no `searchParams` so filters do not force per-request SSR. */
export const revalidate = 3600;

type Props = {
  params: Promise<{ locale: string }>;
};

/**
 * `/media/online` — online ads catalog browse (PR4).
 * Filtered catalog loads client-side via `/api/public/media` (see `media-search-page.tsx`).
 */
export default async function MediaOnlinePage({ params }: Props) {
  await resolveLocaleParam(params);

  return (
    <Suspense fallback={<MediaBrowsePageSkeleton />}>
      <MediaSearchPage appShell browseChannel="online" />
    </Suspense>
  );
}
