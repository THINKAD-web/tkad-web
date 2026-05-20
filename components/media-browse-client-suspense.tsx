import { Suspense } from "react";
import MediaBrowseClient from "@/components/media-browse-client";
import type { MediaItem } from "@/lib/media-data";

type Props = {
  catalog?: MediaItem[];
  hideHero?: boolean;
};

/** Wraps MediaBrowseClient for SSG/SSR pages that use useSearchParams. */
export function MediaBrowseClientSuspense({ catalog, hideHero }: Props) {
  return (
    <Suspense fallback={null}>
      <MediaBrowseClient catalog={catalog} hideHero={hideHero} />
    </Suspense>
  );
}
