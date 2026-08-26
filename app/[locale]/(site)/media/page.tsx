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
 * `/media` — static app shell (ISR 1h).
 * Filtered catalog loads client-side via `/api/public/media` (see `media-search-page.tsx`).
 * JSON-LD + metadata remain in `media/layout.tsx` / `generateMetadata`.
 */
export default async function MediaPage({ params }: Props) {
  await resolveLocaleParam(params);

  return (
    <Suspense fallback={<MediaBrowsePageSkeleton />}>
      <MediaSearchPage appShell initialMedia={[]} />
    </Suspense>
  );
}
