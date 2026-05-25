"use client";

import { useEffect } from "react";
import MediaBrowseClient from "@/components/media-browse-client";
import type { MediaItem } from "@/lib/media-data";

type Props = {
  catalog: MediaItem[];
};

/**
 * /media 필터·인터랙션 전용 클라이언트 래퍼.
 * 서버 렌더 목록(#media-ssr-catalog)은 hydrate 후 숨김.
 */
export function MediaBrowseFiltersClient({ catalog }: Props) {
  useEffect(() => {
    const el = document.getElementById("media-ssr-catalog");
    if (el) el.hidden = true;
  }, []);

  return <MediaBrowseClient catalog={catalog} />;
}
