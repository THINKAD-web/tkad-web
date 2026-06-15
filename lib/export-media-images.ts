/**
 * PDF/PPTX보내기용 매체 썸네일 — 서버에서 fetch 후 data URL 맵 생성.
 * Content-Type 헤더·확장자와 실제 바이트 불일치(JPEG인데 image/png) 시 jsPDF 깨짐 방지.
 */
import { fetchMediaImageDataUrl } from "@/lib/server-media-image";

export type ExportThumbRow = { thumbUrl?: string | null };

/** data URL → jsPDF addImage 포맷 (매직 바이트 우선) */
export function dataUrlImageFormat(d: string): "PNG" | "WEBP" | "JPEG" {
  try {
    const base64 = d.includes(",") ? (d.split(",", 2)[1] ?? "") : d;
    const head = Buffer.from(base64.slice(0, 32), "base64");
    if (head.length >= 2 && head[0] === 0xff && head[1] === 0xd8) return "JPEG";
    if (head.length >= 2 && head[0] === 0x89 && head[1] === 0x50) return "PNG";
    if (
      head.length >= 12 &&
      head.toString("ascii", 0, 4) === "RIFF" &&
      head.toString("ascii", 8, 12) === "WEBP"
    ) {
      return "WEBP";
    }
  } catch {
    /* fall through to header */
  }
  if (d.startsWith("data:image/png")) return "PNG";
  if (d.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

/** 포트폴리오·견적 라인 등에서 썸네일 URL 목록 → data URL 맵 */
export async function loadExportThumbMap(
  rows: readonly ExportThumbRow[],
): Promise<Map<string, string>> {
  const thumbUrls = [
    ...new Set(
      rows.map((r) => r.thumbUrl).filter((u): u is string => Boolean(u?.trim())),
    ),
  ];
  const thumbEntries = await Promise.all(
    thumbUrls.map(async (u) => [u, await fetchMediaImageDataUrl(u)] as const),
  );
  return new Map<string, string>(
    thumbEntries.filter((e): e is readonly [string, string] => Boolean(e[1])),
  );
}
