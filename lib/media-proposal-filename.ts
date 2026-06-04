import type { MediaItem } from "@/lib/media-data";

function defaultDownloadFilename(media: MediaItem, isKo: boolean): string {
  const base = (isKo ? media.name : media.nameEn || media.name)
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 40);
  const date = new Date().toISOString().slice(0, 10);
  const word = isKo ? "매체제안서" : "media_proposal";
  return `THINKAD_${word}_${base}_${date}.pdf`;
}

export function mediaProposalDownloadFilename(
  media: MediaItem,
  isKo = true,
): string {
  return media.proposalFileName?.trim() || defaultDownloadFilename(media, isKo);
}
