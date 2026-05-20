/**
 * Kakao Static Map — PDF용 위치 스냅샷 (REST API).
 * `KAKAO_REST_API_KEY` 미설정 시 null 반환.
 */

export async function fetchKakaoStaticMapBase64(opts: {
  lat: number;
  lng: number;
  width?: number;
  height?: number;
}): Promise<string | null> {
  const key = process.env.KAKAO_REST_API_KEY?.trim();
  if (!key) return null;

  const w = opts.width ?? 280;
  const h = opts.height ?? 160;
  const center = `${opts.lng},${opts.lat}`;
  const url = new URL("https://dapi.kakao.com/v2/maps/staticmap");
  url.searchParams.set("center", center);
  url.searchParams.set("level", "4");
  url.searchParams.set("w", String(w));
  url.searchParams.set("h", String(h));
  url.searchParams.set("maptype", "roadmap");
  url.searchParams.append("markers", `size,mid|${center}`);

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.toString("base64");
  } catch {
    return null;
  }
}
