/**
 * 기상청 단기예보 API — 날씨 민감도 분석용
 * KMA_API_KEY (공공데이터포털 기상청 API)
 */
import type { WeatherSensitivity } from "@/lib/data-source-types";

export type WeatherSnapshot = {
  condition: "clear" | "rain" | "snow" | "dust" | "cloudy";
  tempC: number;
  pm10: number | null;
  labelKo: string;
};

export async function fetchKmaShortTerm(opts: {
  latitude: number;
  longitude: number;
}): Promise<WeatherSnapshot | null> {
  const key =
    process.env.KMA_API_KEY?.trim() ||
    process.env.DATA_GO_KR_SERVICE_KEY?.trim();
  if (!key) return null;

  try {
    const { nx, ny } = latLngToGrid(opts.latitude, opts.longitude);
    const base = kstBaseDateTime();
    const url = new URL(
      "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst",
    );
    url.searchParams.set("serviceKey", key);
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("numOfRows", "10");
    url.searchParams.set("dataType", "JSON");
    url.searchParams.set("base_date", base.date);
    url.searchParams.set("base_time", base.time);
    url.searchParams.set("nx", String(nx));
    url.searchParams.set("ny", String(ny));

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      response?: { body?: { items?: { item?: Array<{ category: string; obsrValue: string }> } } };
    };
    const items = json.response?.body?.items?.item ?? [];
    const map = new Map(items.map((i) => [i.category, i.obsrValue]));
    const pty = Number(map.get("PTY") ?? "0");
    const rn1 = Number(map.get("RN1") ?? "0");
    const t1h = Number(map.get("T1H") ?? "15");

    let condition: WeatherSnapshot["condition"] = "clear";
    if (pty >= 3) condition = "snow";
    else if (pty >= 1 || rn1 > 0) condition = "rain";
    else if (Number(map.get("REH") ?? "50") > 85) condition = "cloudy";

    return {
      condition,
      tempC: t1h,
      pm10: null,
      labelKo:
        condition === "rain"
          ? "강수"
          : condition === "snow"
            ? "강설"
            : condition === "cloudy"
              ? "흐림"
              : "맑음",
    };
  } catch {
    return null;
  }
}

export function inferWeatherSensitivity(
  mediaType: string,
  location: string,
): WeatherSensitivity {
  const indoor =
    /지하|실내|스크린|역사|역 내|subway|indoor/i.test(location) ||
    mediaType === "digital";
  if (indoor) return "low";
  if (mediaType === "static" || mediaType === "mobile") return "high";
  return "medium";
}

export function weatherImpactInsight(
  sensitivity: WeatherSensitivity,
  snapshot: WeatherSnapshot | null,
  isKo: boolean,
): { ko: string; en: string } {
  if (sensitivity === "low") {
    return {
      ko: "날씨 민감도: 낮음 (실내·역사 매체)",
      en: "Weather sensitivity: low (indoor / station)",
    };
  }
  if (!snapshot) {
    return {
      ko: `날씨 민감도: ${sensitivity === "high" ? "높음" : "보통"} (통계 기반 추정)`,
      en: `Weather sensitivity: ${sensitivity} (model-based)`,
    };
  }
  if (snapshot.condition === "rain" || snapshot.condition === "snow") {
    return sensitivity === "high"
      ? {
          ko: `강수/강설 시 노출 변동 가능 — 현재 ${snapshot.labelKo}`,
          en: `Rain/snow may reduce OOH visibility — currently ${snapshot.condition}`,
        }
      : {
          ko: `비 오는 날에도 노출 안정적 — 현재 ${snapshot.labelKo}`,
          en: `Stable exposure in rain — currently ${snapshot.condition}`,
        };
  }
  return {
    ko: `날씨 민감도: ${sensitivity === "high" ? "높음" : "보통"} · 현재 ${snapshot.labelKo}`,
    en: `Weather sensitivity: ${sensitivity} · ${snapshot.condition}`,
  };
}

function kstBaseDateTime(): { date: string; time: string } {
  const d = new Date(Date.now() - 3600_000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = Math.floor(Number(get("hour")) / 3) * 3;
  return {
    date: `${get("year")}${get("month")}${get("day")}`,
    time: String(hour).padStart(2, "0") + "00",
  };
}

/** LCC DFS 좌표 변환 (기상청 격자) — 간략 구현 */
function latLngToGrid(lat: number, lng: number): { nx: number; ny: number } {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;
  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;
  let sn =
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
    Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);
  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;
  const x = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const y = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx: x, ny: y };
}
