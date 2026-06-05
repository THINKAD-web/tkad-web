/**
 * 정적 지도 스냅샷 (서버 PDF용) — Google Static Maps 우선, Kakao 폴백.
 *
 * Kakao 동적 지도는 JS-SDK 기반이라 서버 렌더 불가하고, REST staticmap 도
 * 불안정하다. Google Static Maps API 는 단일 GET 으로 PNG 를 반환해 가장 안정적.
 */
import { fetchKakaoStaticMapBase64 } from "@/lib/kakao-static-map";

export type StaticMapOpts = {
  lat: number;
  lng: number;
  width?: number;
  height?: number;
  zoom?: number;
};

async function fetchGoogleStaticMapDataUrl(
  opts: StaticMapOpts,
): Promise<string | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) return null;
  const w = Math.min(opts.width ?? 600, 640);
  const h = Math.min(opts.height ?? 300, 640);
  const center = `${opts.lat},${opts.lng}`;
  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("center", center);
  url.searchParams.set("zoom", String(opts.zoom ?? 15));
  url.searchParams.set("size", `${w}x${h}`);
  url.searchParams.set("scale", "2");
  url.searchParams.set("language", "ko");
  url.searchParams.set("markers", `color:0x7C3AED|${center}`);
  url.searchParams.set("key", key);
  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.startsWith("image/")) return null; // 에러는 JSON/텍스트로 옴
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return null;
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** 정적 지도 data URL (Google → Kakao). 실패 시 null. */
export async function fetchStaticMapDataUrl(
  opts: StaticMapOpts,
): Promise<string | null> {
  const google = await fetchGoogleStaticMapDataUrl(opts);
  if (google) return google;
  const kakao = await fetchKakaoStaticMapBase64(opts);
  if (kakao) return `data:image/png;base64,${kakao}`;
  return null;
}
