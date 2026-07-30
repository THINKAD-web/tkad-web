import type { MediaItem } from "@/lib/media-data";

export type MediaProposalSpecRow = [icon: string, label: string, value: string];

export function formatDailyFootfallForProposal(
  media: Pick<MediaItem, "dailyFootTraffic" | "dailyFootfall">,
  locale: string,
  isKo: boolean,
): string {
  const n =
    media.dailyFootTraffic > 0
      ? media.dailyFootTraffic
      : (media.dailyFootfall ?? 0);
  if (n <= 0) return "—";
  return `${n.toLocaleString(locale)}${isKo ? "명" : ""}`;
}

export function formatPanelResolutionForProposal(
  media: Pick<MediaItem, "resolution">,
): string {
  const trimmed = media.resolution?.trim();
  return trimmed || "—";
}

export function formatPhysicalSizeForProposal(
  media: Pick<MediaItem, "size">,
): string {
  const trimmed = media.size?.trim();
  return trimmed || "—";
}

export function buildMediaProposalOverviewRows(
  media: MediaItem,
  opts: {
    isKo: boolean;
    locale: string;
    categoryLabel: string;
    locationLine: string;
    priceWon: number;
  },
): { left: MediaProposalSpecRow[]; right: MediaProposalSpecRow[] } {
  const { isKo, locale, categoryLabel, locationLine, priceWon } = opts;

  const left: MediaProposalSpecRow[] = [
    ["pin", isKo ? "위치" : "Location", locationLine],
    ["tag", isKo ? "유형" : "Type", categoryLabel],
    ["ruler", isKo ? "규격" : "Size", formatPhysicalSizeForProposal(media)],
    [
      "clock",
      isKo ? "운영시간" : "Hours",
      media.operatingHours || (isKo ? "24시간" : "24h"),
    ],
  ];

  const right: MediaProposalSpecRow[] = [
    [
      "users",
      isKo ? "일일 유동인구(추정)" : "Daily footfall (est.)",
      formatDailyFootfallForProposal(media, locale, isKo),
    ],
    [
      "display",
      isKo ? "패널 해상도" : "Panel resolution",
      formatPanelResolutionForProposal(media),
    ],
    [
      "calendar",
      isKo ? "최소 집행" : "Min. period",
      isKo ? "1개월~" : "1 month+",
    ],
    [
      "won",
      isKo ? "월 단가" : "Monthly",
      `₩${priceWon.toLocaleString(locale)}`,
    ],
  ];

  return { left, right };
}
