export type ParsedNetworkLocationRow = {
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

function splitCsvLine(line: string): string[] {
  return line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
}

function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "");
}

/** CSV: name,address,latitude,longitude (헤더 행 선택, 열 이름 자동 인식) */
export function parseNetworkLocationsCsv(text: string): ParsedNetworkLocationRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const firstParts = splitCsvLine(lines[0]);
  const firstJoined = firstParts.map(normHeader).join("|");

  const looksLikeHeader =
    /name|지점|위치|title/i.test(lines[0]) &&
    (firstJoined.includes("address") ||
      firstJoined.includes("주소") ||
      firstJoined.includes("lat") ||
      firstJoined.includes("위도"));

  let start = 0;
  let colName = 0;
  let colAddress = 1;
  let colLat = 2;
  let colLng = 3;

  if (looksLikeHeader) {
    start = 1;
    const headers = firstParts.map(normHeader);
    const idx = (candidates: string[]) => {
      for (const c of candidates) {
        const i = headers.findIndex((h) => h === c || h.includes(c));
        if (i >= 0) return i;
      }
      return -1;
    };
    const inName = idx(["name", "지점", "위치", "title", "매체명"]);
    const inAddr = idx(["address", "주소", "addr"]);
    const inLat = idx(["latitude", "lat", "위도", "y"]);
    const inLng = idx(["longitude", "lng", "lon", "경도", "x"]);
    if (inName >= 0) colName = inName;
    if (inAddr >= 0) colAddress = inAddr;
    if (inLat >= 0) colLat = inLat;
    if (inLng >= 0) colLng = inLng;
  }

  const out: ParsedNetworkLocationRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const parts = splitCsvLine(lines[i]);
    const name = (parts[colName] ?? "").trim();
    if (!name) continue;
    const address = (parts[colAddress] ?? "").trim() || null;
    const latRaw = parts[colLat];
    const lngRaw = parts[colLng];
    const lat = latRaw != null && latRaw !== "" ? Number(latRaw) : NaN;
    const lng = lngRaw != null && lngRaw !== "" ? Number(lngRaw) : NaN;
    out.push({
      name,
      address,
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lng) ? lng : null,
    });
  }
  return out;
}
