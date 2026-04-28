import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "THINKAD | 싱커드 - 한국 OOH 광고 에이전시",
    short_name: "싱커드",
    description:
      "대한민국 No.1 OOH 광고 에이전시. 전국 옥외광고 매체 검색 및 캠페인 컨설팅.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#D6D9E6",
    theme_color: "#0D1B2E",
    lang: "ko",
    dir: "ltr",
    categories: ["business", "productivity", "marketing"],
    icons: [
      {
        src: "/pwa-icon/192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // 홈 화면 길게 누르면 노출되는 바로가기 (Android / 일부 iOS)
    shortcuts: [
      {
        name: "매체 검색",
        short_name: "매체",
        description: "전국 OOH 매체를 검색하고 비교합니다.",
        url: "/media",
        icons: [{ src: "/pwa-icon/192", sizes: "192x192" }],
      },
      {
        name: "플래너",
        short_name: "플래너",
        description: "예산·기간 기반 캠페인 플래닝.",
        url: "/planner",
        icons: [{ src: "/pwa-icon/192", sizes: "192x192" }],
      },
      {
        name: "지도에서 찾기",
        short_name: "지도",
        description: "위치 기반 매체 탐색.",
        url: "/media/map",
        icons: [{ src: "/pwa-icon/192", sizes: "192x192" }],
      },
      {
        name: "문의하기",
        short_name: "문의",
        description: "OOH 광고 견적 / 상담 요청.",
        url: "/contact",
        icons: [{ src: "/pwa-icon/192", sizes: "192x192" }],
      },
    ],
  };
}
