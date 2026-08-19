/**
 * MOIS 주민등록 인구 — jumin.mois.go.kr CSV (API 키 불필요, POST downloadCsv.do).
 */

export const MOIS_STAT_MONTH_URL = "https://jumin.mois.go.kr/statMonth.do";
export const MOIS_SOURCE_URL =
  "https://jumin.mois.go.kr/downloadCsv.do?searchYearMonth=month&xlsStats=2";

export type MoisSigunguRow = {
  /** MOIS 10자리 행정기관코드 */
  regionCode: string;
  /** 전체 라벨 e.g. "서울특별시 강남구" */
  regionName: string;
  sidoName: string;
  sigunguName: string;
  population: number;
  /** YYYY-MM */
  referenceMonth: string;
};

const ROW_RE =
  /^"(.+?)\s*\((\d{10})\)","([\d,]+)"/;

function parsePopulation(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

/** CSV 한 줄 → 행정기관 row */
export function parseMoisCsvLine(line: string): MoisSigunguRow | null {
  const m = line.match(ROW_RE);
  if (!m) return null;
  const regionName = m[1].replace(/\s+/g, " ").trim();
  const regionCode = m[2];
  const population = parsePopulation(m[3]);
  if (!Number.isFinite(population) || population <= 0) return null;

  let sidoName = regionName;
  let sigunguName = regionName;
  if (regionName.startsWith("서울특별시 ")) {
    sidoName = "서울특별시";
    sigunguName = regionName.replace(/^서울특별시\s+/, "");
  } else if (regionName.startsWith("경기도 ")) {
    sidoName = "경기도";
    sigunguName = regionName.replace(/^경기도\s+/, "");
  } else {
    return null;
  }

  return {
    regionCode,
    regionName,
    sidoName,
    sigunguName,
    population,
    referenceMonth: "",
  };
}

export function parseMoisCsv(
  csvText: string,
  referenceMonth: string,
): MoisSigunguRow[] {
  const rows: MoisSigunguRow[] = [];
  for (const line of csvText.split(/\r?\n/)) {
    const row = parseMoisCsvLine(line.trim());
    if (!row) continue;
    rows.push({ ...row, referenceMonth });
  }
  return rows;
}

/** 시·군·구 leaf 단위만 (시도 집계·상위 시 제외) */
export function filterLeafSigunguRows(rows: readonly MoisSigunguRow[]): MoisSigunguRow[] {
  const byParent = new Map<string, MoisSigunguRow[]>();

  for (const row of rows) {
    if (row.sidoName === "서울특별시") {
      if (!row.sigunguName.endsWith("구")) continue;
      if (row.sigunguName.includes(" ")) continue;
      byParent.set(row.regionCode, [row]);
      continue;
    }
    if (row.sidoName !== "경기도") continue;
    if (row.regionName === "경기도") continue;

    const parts = row.sigunguName.split(" ");
    if (parts.length === 1) {
      byParent.set(row.regionCode, [row]);
    } else if (parts.length === 2 && parts[1].endsWith("구")) {
      byParent.set(row.regionCode, [row]);
    }
  }

  // 경기도: 하위 구가 있으면 상위 시 집계 row 제거
  const gyeonggi = [...byParent.values()].flat().filter((r) => r.sidoName === "경기도");
  const cityWithGu = new Set<string>();
  for (const r of gyeonggi) {
    const m = r.sigunguName.match(/^(.+시)\s+/);
    if (m) cityWithGu.add(m[1]);
  }
  const out: MoisSigunguRow[] = [];
  for (const r of [...byParent.values()].flat()) {
    if (r.sidoName === "경기도" && cityWithGu.has(r.sigunguName)) continue;
    out.push(r);
  }
  return out.sort((a, b) => a.regionCode.localeCompare(b.regionCode));
}

export function filterSeoulGyeonggi(rows: readonly MoisSigunguRow[]): MoisSigunguRow[] {
  return filterLeafSigunguRows(
    rows.filter((r) => r.sidoName === "서울특별시" || r.sidoName === "경기도"),
  );
}

export type FetchMoisParams = {
  year: number;
  month: number;
  fetch?: typeof fetch;
};

/** jumin.mois.go.kr — 로그인·API 키 불필요 */
export async function fetchMoisSigunguCsv(params: FetchMoisParams): Promise<string> {
  const fetchFn = params.fetch ?? fetch;
  const mm = String(params.month).padStart(2, "0");
  const cookieJar = new Map<string, string>();

  const getCookieHeader = () =>
    [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

  const absorbCookies = (res: Response) => {
    const raw = res.headers.getSetCookie?.() ?? [];
    for (const c of raw) {
      const [pair] = c.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) cookieJar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  };

  const warm = await fetchFn(MOIS_STAT_MONTH_URL, {
    headers: { "User-Agent": "tkad-web/phase4a (population batch)" },
  });
  absorbCookies(warm);

  const body = new URLSearchParams({
    searchYearStart: String(params.year),
    searchMonthStart: mm,
    searchYearEnd: String(params.year),
    searchMonthEnd: mm,
    sltOrgLvl1: "",
    sltOrgLvl2: "",
    sltOrgType: "1",
    state: "1",
    gender: "0",
    category: "month",
  });

  const res = await fetchFn(`${MOIS_SOURCE_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: getCookieHeader(),
      "User-Agent": "tkad-web/phase4a (population batch)",
    },
    body,
  });

  if (!res.ok) throw new Error(`MOIS CSV HTTP ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) throw new Error("MOIS CSV empty — check year/month or MOIS availability");

  return new TextDecoder("euc-kr").decode(buf);
}

export async function fetchSeoulGyeonggiPopulation(
  params: FetchMoisParams,
): Promise<MoisSigunguRow[]> {
  const csv = await fetchMoisSigunguCsv(params);
  const ref = `${params.year}-${String(params.month).padStart(2, "0")}`;
  return filterSeoulGyeonggi(parseMoisCsv(csv, ref));
}
