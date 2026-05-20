/**
 * SKT 빅데이터 허브 (유료) — API 키 설정 시에만 활성화
 * SKT_BIGDATA_API_KEY, SKT_BIGDATA_API_URL
 */
import type { PartialSourcePayload } from "@/lib/data-source-types";

export async function fetchSktBigdataDemographics(opts: {
  latitude: number;
  longitude: number;
}): Promise<PartialSourcePayload | null> {
  const key = process.env.SKT_BIGDATA_API_KEY?.trim();
  const url = process.env.SKT_BIGDATA_API_URL?.trim();
  if (!key || !url) return null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lat: opts.latitude, lng: opts.longitude }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      ageGender?: PartialSourcePayload["ageGender"];
      hourly?: number[];
      confidence?: number;
    };

    if (!json.ageGender) return null;

    return {
      sourceId: "skt_bigdata",
      weight: 0.95,
      confidence: json.confidence ?? 90,
      ageGender: json.ageGender,
      hourly: json.hourly,
      labelKo: "SKT 빅데이터 (실측)",
      labelEn: "SKT Big Data (measured)",
      level: "high",
    };
  } catch {
    return null;
  }
}
