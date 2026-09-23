"use client";

import dynamic from "next/dynamic";
import { MediaMapRouteSkeleton } from "@/components/discovery/discovery-route-skeletons";

const MediaMapPageClient = dynamic(
  () => import("@/components/media-map/media-map-page-client"),
  {
    ssr: false,
    loading: () => <MediaMapRouteSkeleton />,
  },
);

/** 지도 페이지 클라이언트 번들 — 서버 ISR 셸과 분리 */
export default function MediaMapPageClientLoader() {
  return <MediaMapPageClient />;
}
