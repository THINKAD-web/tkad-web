import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "THINKAD 싱커드",
    short_name: "싱커드",
    description: "대한민국 No.1 OOH 광고 플랫폼",
    start_url: "/ko",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#020202",
    theme_color: "#020202",
    lang: "ko",
    dir: "ltr",
    categories: ["business", "productivity", "marketing"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    shortcuts: [
      {
        name: "매체 검색",
        short_name: "매체",
        description: "전국 OOH 매체를 검색하고 비교합니다.",
        url: "/ko/media",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "플래너",
        short_name: "플래너",
        description: "예산·기간 기반 캠페인 플래닝.",
        url: "/ko/planner",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "지도에서 찾기",
        short_name: "지도",
        description: "위치 기반 매체 탐색.",
        url: "/ko/media/map",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "문의하기",
        short_name: "문의",
        description: "OOH 광고 견적 / 상담 요청.",
        url: "/ko/contact",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
