import type { Client, Project } from "@/lib/client-portal-mock";

/** Matches case-study style categories for client-facing copy */
export type CampaignMapMediaType =
  | "billboard"
  | "digital"
  | "transport"
  | "special";

export type CampaignMapPin = {
  id: string;
  projectId: string;
  lat: number;
  lng: number;
  /** Percent (0–100) for fallback map pin position */
  fallbackX: number;
  fallbackY: number;
  mediaType: CampaignMapMediaType;
  spotNameKo: string;
  spotNameEn: string;
  creativeCaptionKo: string;
  creativeCaptionEn: string;
  imageUrl: string;
  impressionsToday: number;
  impressionsTotal: number;
  lastUpdatedIso: string;
};

/** Static placements for demo project P-2026-001 (Seoul corridor) */
const PINS_P2026_001: readonly CampaignMapPin[] = [
  {
    id: "pin-gangnam-digital",
    projectId: "P-2026-001",
    lat: 37.4979,
    lng: 127.0276,
    fallbackX: 42,
    fallbackY: 58,
    mediaType: "digital",
    spotNameKo: "강남역 인근 디지털 사이니지",
    spotNameEn: "Digital signage near Gangnam Station",
    creativeCaptionKo: "갤럭시 S 런칭 — 야간 하이라이트 크리에이티브",
    creativeCaptionEn: "Galaxy S launch — night-mode hero creative",
    imageUrl: "https://picsum.photos/seed/tkad-gn-digital/960/540",
    impressionsToday: 182_000,
    impressionsTotal: 4_120_000,
    lastUpdatedIso: "2026-03-28T07:45:00+09:00",
  },
  {
    id: "pin-coex-billboard",
    projectId: "P-2026-001",
    lat: 37.5113,
    lng: 127.059,
    fallbackX: 68,
    fallbackY: 38,
    mediaType: "billboard",
    spotNameKo: "코엑스 인근 대형 빌보드",
    spotNameEn: "Large-format billboard near COEX",
    creativeCaptionKo: "코엑스 광역 가시거리 프리미엄 패널",
    creativeCaptionEn: "Premium panel with COEX district visibility",
    imageUrl: "https://picsum.photos/seed/tkad-coex-bb/960/540",
    impressionsToday: 96_400,
    impressionsTotal: 2_890_000,
    lastUpdatedIso: "2026-03-28T07:42:00+09:00",
  },
  {
    id: "pin-teheran-led",
    projectId: "P-2026-001",
    lat: 37.5012,
    lng: 127.0365,
    fallbackX: 55,
    fallbackY: 48,
    mediaType: "digital",
    spotNameKo: "테헤란로 로드사이드 LED",
    spotNameEn: "Teheran-ro roadside LED",
    creativeCaptionKo: "출퇴근 피크 타임 동영상 소재 A/B",
    creativeCaptionEn: "Peak-hour video creative A/B",
    imageUrl: "https://picsum.photos/seed/tkad-th-led/960/540",
    impressionsToday: 124_800,
    impressionsTotal: 3_050_000,
    lastUpdatedIso: "2026-03-28T07:40:00+09:00",
  },
  {
    id: "pin-bus-shelter",
    projectId: "P-2026-001",
    lat: 37.5089,
    lng: 127.0631,
    fallbackX: 72,
    fallbackY: 52,
    mediaType: "transport",
    spotNameKo: "삼성역 인근 버스쉘터",
    spotNameEn: "Bus shelter near Samseong Station",
    creativeCaptionKo: "정류장 정차 대기 노출 — 정적 + QR 연계",
    creativeCaptionEn: "Dwell-time exposure — static + QR bridge",
    imageUrl: "https://picsum.photos/seed/tkad-bus-sh/960/540",
    impressionsToday: 58_200,
    impressionsTotal: 1_410_000,
    lastUpdatedIso: "2026-03-28T07:38:00+09:00",
  },
];

const PINS_BY_PROJECT: Readonly<Record<string, readonly CampaignMapPin[]>> = {
  "P-2026-001": PINS_P2026_001,
};

export function getMonitoringPinsForClient(client: Client): CampaignMapPin[] {
  const activeIds = new Set(
    client.projects
      .filter((p) => p.status === "in_progress")
      .map((p) => p.id),
  );
  const out: CampaignMapPin[] = [];
  for (const p of client.projects) {
    if (!activeIds.has(p.id)) continue;
    const extra = PINS_BY_PROJECT[p.id];
    if (extra) out.push(...extra);
  }
  return out;
}

export function getInProgressProjects(client: Client): Project[] {
  return client.projects.filter((p) => p.status === "in_progress");
}

export function sumPinImpressionsToday(pins: readonly CampaignMapPin[]): number {
  return pins.reduce((a, p) => a + p.impressionsToday, 0);
}

export function sumPinImpressionsTotal(pins: readonly CampaignMapPin[]): number {
  return pins.reduce((a, p) => a + p.impressionsTotal, 0);
}
