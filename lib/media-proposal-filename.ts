import type { MediaItem } from "@/lib/media-data";

function defaultDownloadFilename(media: MediaItem, isKo: boolean): string {
  const base = (isKo ? media.name : media.nameEn || media.name).replace(
    /[\\/:*?"<>|]/g,
    "_",
  );
  return `${base}${isKo ? "_제안서" : "_proposal"}.pdf`;
}

export function mediaProposalDownloadFilename(
  media: MediaItem,
  isKo = true,
): string {
  return media.proposalFileName?.trim() || defaultDownloadFilename(media, isKo);
}
