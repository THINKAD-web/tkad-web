/**
 * 공공데이터포털 — 서울교통공사 역별 승하차(일자·역명 등).
 * https://www.data.go.kr/data/15143845/openapi.do
 *
 * 환경 변수 `DATA_GO_KR_SERVICE_KEY` (공공데이터포털 인증키, URL 인코딩된 값 권장)
 */

import { kakaoPlaceToMetroStnNm } from "@/lib/subway-station-name";

const ENDPOINT = "https://apis.data.go.kr/B553766/psgr/getStnPsgr";

export function getDataGoKrServiceKey(): string | null {
  const k = process.env.DATA_GO_KR_SERVICE_KEY?.trim();
  return k || null;
}

function kstYmdDaysAgo(daysAgo: number): string {
  const now = Date.now() - daysAgo * 86400000;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date(now))
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
  return `${parts.year}${parts.month}${parts.day}`;
}

type LooseItem = Record<string, string>;

function parseXmlItems(xml: string): LooseItem[] {
  const items: LooseItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let im: RegExpExecArray | null;
  while ((im = itemRe.exec(xml)) !== null) {
    const block = im[1];
    const row: LooseItem = {};
    const tagRe = /<([a-zA-Z0-9_]+)>([^<]*)<\/\1>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tagRe.exec(block)) !== null) {
      row[tm[1]] = tm[2].trim();
    }
    if (Object.keys(row).length) items.push(row);
  }
  return items;
}

function extractJsonItems(raw: unknown): LooseItem[] {
  const walk = (v: unknown): LooseItem[] => {
    if (v == null) return [];
    if (Array.isArray(v)) {
      if (v.length && typeof v[0] === "object" && v[0] !== null) {
        return v.flatMap((x) => walk(x));
      }
      return [];
    }
    if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      if ("item" in o) {
        const it = o.item;
        if (Array.isArray(it)) return it.filter((x) => x && typeof x === "object") as LooseItem[];
        if (it && typeof it === "object") return [it as LooseItem];
      }
      for (const k of Object.keys(o)) {
        const inner = walk(o[k]);
        if (inner.length) return inner;
      }
    }
    return [];
  };
  return walk(raw);
}

function sumPassengerLikeFields(row: LooseItem): number {
  let sum = 0;
  for (const [key, val] of Object.entries(row)) {
    if (/(?:Nm|Dt|Tm|Ymd|Hr)$/i.test(key)) continue;
    if (!/cnt$/i.test(key)) continue;
    const n = Number(String(val).replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 0 && n < 1e9) sum += n;
  }
  return sum;
}

function normalizeStnNm(s: string): string {
  return s.replace(/\s+/g, "").replace(/역$/, "").toLowerCase();
}

function itemMatchesStation(item: LooseItem, targetNorm: string): boolean {
  const raw =
    item.stnNm ?? item.STATION_NM ?? item.subwayStationName ?? item.stationNm ?? "";
  const n = normalizeStnNm(String(raw));
  if (!n) return false;
  return n.includes(targetNorm) || targetNorm.includes(n);
}

function parsePsgrResponseText(text: string): LooseItem[] | null {
  const t = text.trim();
  if (/^Unauthorized/i.test(t)) return null;
  if (t.startsWith("{")) {
    try {
      const items = extractJsonItems(JSON.parse(t) as unknown);
      return items.length ? items : null;
    } catch {
      return null;
    }
  }
  if (t.includes("<item>")) {
    const items = parseXmlItems(t);
    return items.length ? items : null;
  }
  return null;
}

/** 일자·역명으로 호출해 역과 매칭되는 행의 승하차류 숫자 합계(원시). */
async function fetchRawDailySumForStation(
  serviceKey: string,
  pasngYmd: string,
  stnNm: string,
): Promise<number | null> {
  const buildUrl = (json: boolean) => {
    const url = new URL(ENDPOINT);
    url.searchParams.set("serviceKey", serviceKey);
    url.searchParams.set("numOfRows", "2000");
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("pasngYmd", pasngYmd);
    url.searchParams.set("stnNm", stnNm);
    if (json) url.searchParams.set("type", "json");
    return url.toString();
  };

  let items: LooseItem[] | null = null;
  for (const jsonMode of [true, false]) {
    let res: Response;
    try {
      res = await fetch(buildUrl(jsonMode), {
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch {
      continue;
    }
    const text = await res.text();
    if (!res.ok) continue;
    items = parsePsgrResponseText(text);
    if (items?.length) break;
  }
  if (!items?.length) return null;

  const targetNorm = normalizeStnNm(stnNm);
  if (!targetNorm) return null;

  let total = 0;
  let matched = 0;
  for (const row of items) {
    if (!itemMatchesStation(row, targetNorm)) continue;
    const part = sumPassengerLikeFields(row);
    if (part > 0) {
      total += part;
      matched++;
    }
  }

  if (matched === 0 && items.length > 0) {
    const names = items
      .map((r) => String(r.stnNm ?? r.STATION_NM ?? "").trim())
      .filter(Boolean);
    const unique = new Set(names);
    if (unique.size <= 1) {
      total = 0;
      for (const row of items) total += sumPassengerLikeFields(row);
      return total > 0 ? total : null;
    }
    return null;
  }

  if (matched === 0) return null;
  return total;
}

/**
 * 카카오 지하철 장소명 기준, 최근 며칠간 API를 시도해 일별 승하차 합(원시) 추정.
 * — 광고 매체 인근 보행 유동과 다르므로 `media-daily-footfall-estimate`에서 계수 적용.
 */
export async function fetchMetroRawDailyPassengerTotal(
  kakaoSubwayPlaceName: string,
): Promise<number | null> {
  const serviceKey = getDataGoKrServiceKey();
  if (!serviceKey) return null;
  const stnNm = kakaoPlaceToMetroStnNm(kakaoSubwayPlaceName);
  if (!stnNm) return null;

  for (let day = 1; day <= 7; day++) {
    const ymd = kstYmdDaysAgo(day);
    const sum = await fetchRawDailySumForStation(serviceKey, ymd, stnNm);
    if (sum != null && sum > 0) return sum;
  }
  return null;
}
