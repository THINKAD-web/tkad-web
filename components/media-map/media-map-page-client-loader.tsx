"use client";

import dynamic from "next/dynamic";
import { MediaMapRouteSkeleton } from "@/components/discovery/discovery-route-skeletons";
import { prefetchMapBasemapChunk } from "@/lib/lazy-chunk-prefetch";

void prefetchMapBasemapChunk();

const MediaMapPageClient = dynamic(
  () => import("@/components/media-map/media-map-page-client"),
  {
    ssr: false,
    loading: () => <MediaMapRouteSkeleton />,
  },
);

/** 지도 페이지 클라이언트 번들 — basemap 청크는 dynamic 게이트 전에 prefetch */
export default function MediaMapPageClientLoader() {
  void prefetchMapBasemapChunk();
  return <MediaMapPageClient />;
}
