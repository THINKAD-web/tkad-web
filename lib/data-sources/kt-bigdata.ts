/**
 * KT 빅데이터 허브 (유료) — API 키 설정 시에만 활성화
 * KT_BIGDATA_API_KEY, KT_BIGDATA_API_URL
 */
import type { PartialSourcePayload } from "@/lib/data-source-types";

export async function fetchKtBigdataFootfall(opts: {
  latitude: number;
  longitude: number;
}): Promise<PartialSourcePayload | null> {
  const key = process.env.KT_BIGDATA_API_KEY?.trim();
  const url = process.env.KT_BIGDATA_API_URL?.trim();
  if (!key || !url) return null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lat: opts.latitude,
        lng: opts.longitude,
        radiusM: 500,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      dailyFootfall?: number;
      hourly?: number[];
      ageGender?: PartialSourcePayload["ageGender"];
    };

    if (!json.dailyFootfall) return null;

    return {
      sourceId: "kt_bigdata",
      weight: 1.0,
      confidence: 92,
      dailyFootfall: json.dailyFootfall,
      hourly: json.hourly,
      ageGender: json.ageGender,
      labelKo: "KT 빅데이터 (실측)",
      labelEn: "KT Big Data (measured)",
      level: "high",
    };
  } catch {
    return null;
  }
}
