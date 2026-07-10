/**
 * 공개 /media browse 지역 taxonomy.
 * `lib/media-regions.ts` (regionZone 정규화)와 별도.
 */

export type BrowseRegionSub = {
  id: string;
  label: string;
  labelEn?: string;
  /** DB 텍스트 필드 검색용 alias */
  aliases?: string[];
};

export type BrowseRegionMain = {
  id: string;
  label: string;
  labelEn?: string;
  sub: BrowseRegionSub[];
};

export const MEDIA_BROWSE_REGIONS: BrowseRegionMain[] = [
  {
    id: "seoul",
    label: "서울",
    labelEn: "Seoul",
    sub: [
      { id: "seoul_gangnam", label: "강남/서초", aliases: ["강남", "서초", "역삼", "삼성", "코엑스", "테헤란", "강남구", "서초구"] },
      { id: "seoul_hongdae", label: "홍대/마포", aliases: ["홍대", "마포", "합정", "연남", "상수", "망원"] },
      { id: "seoul_seongsu", label: "성수/왕십리", aliases: ["성수", "왕십리", "성동", "연무장"] },
      { id: "seoul_cbd", label: "광화문/도심", aliases: ["광화문", "도심", "명동", "시청", "세종", "중구", "종로"] },
      { id: "seoul_jongno", label: "종로/을지로", aliases: ["종로", "을지로", "동대문"] },
      { id: "seoul_itaewon", label: "이태원/한남", aliases: ["이태원", "한남", "용산"] },
      { id: "seoul_sinchon", label: "신촌/이대", aliases: ["신촌", "이대", "서대문"] },
      { id: "seoul_gangbuk", label: "강북/노원", aliases: ["강북", "노원", "도봉", "성북", "미아"] },
      { id: "seoul_yeongdeungpo", label: "영등포/여의도", aliases: ["영등포", "여의도", "당산"] },
      { id: "seoul_guro", label: "구로/신도림", aliases: ["구로", "신도림", "가산", "금천"] },
      { id: "seoul_jamsil", label: "잠실/송파", aliases: ["잠실", "송파", "강동", "롯데월드"] },
      { id: "seoul_coex", label: "코엑스/삼성", aliases: ["코엑스", "삼성", "선릉", "삼성역"] },
      { id: "seoul_dongdaemun", label: "동대문/청량리", aliases: ["동대문", "청량리", "회기"] },
      { id: "seoul_nowon", label: "노원/도봉", aliases: ["노원", "도봉", "중계"] },
    ],
  },
  {
    id: "gyeonggi",
    label: "경기",
    labelEn: "Gyeonggi",
    sub: [
      { id: "gyeonggi_suwon", label: "수원", aliases: ["수원", "영통", "팔달"] },
      { id: "gyeonggi_seongnam", label: "성남/판교", aliases: ["성남", "판교", "분당", "정자"] },
      { id: "gyeonggi_goyang", label: "고양/일산", aliases: ["고양", "일산", "킨텍스"] },
      { id: "gyeonggi_yongin", label: "용인", aliases: ["용인", "기흥", "수지"] },
      { id: "gyeonggi_anyang", label: "안양/군포", aliases: ["안양", "군포", "평촌"] },
      { id: "gyeonggi_bucheon", label: "부천", aliases: ["부천"] },
      { id: "gyeonggi_hwaseong", label: "화성/동탄", aliases: ["화성", "동탄"] },
      { id: "gyeonggi_gwangmyeong", label: "광명", aliases: ["광명"] },
      { id: "gyeonggi_hanam", label: "하남/미사", aliases: ["하남", "미사"] },
      { id: "gyeonggi_gimpo", label: "김포", aliases: ["김포"] },
    ],
  },
  {
    id: "incheon",
    label: "인천",
    labelEn: "Incheon",
    sub: [
      { id: "incheon_airport", label: "인천공항", aliases: ["인천공항", "airport"] },
      { id: "incheon_downtown", label: "인천 시내", aliases: ["인천", "부평", "주안"] },
      { id: "incheon_songdo", label: "송도", aliases: ["송도", "연수"] },
    ],
  },
  {
    id: "busan",
    label: "부산",
    labelEn: "Busan",
    sub: [
      { id: "busan_haeundae", label: "해운대", aliases: ["해운대", "센텀", "벡스코", "BEXCO", "센텀시티", "마린시티"] },
      { id: "busan_seomyeon", label: "서면", aliases: ["서면", "부전"] },
      { id: "busan_downtown", label: "부산 시내", aliases: ["부산", "남포", "중구"] },
      { id: "busan_nampo", label: "남포/광복", aliases: ["남포", "광복", "자갈치"] },
    ],
  },
  {
    id: "daegu",
    label: "대구",
    labelEn: "Daegu",
    sub: [
      { id: "daegu_dongseongno", label: "동성로", aliases: ["동성로", "대구"] },
      { id: "daegu_downtown", label: "대구 시내", aliases: ["대구", "중구"] },
    ],
  },
  {
    id: "daejeon",
    label: "대전",
    labelEn: "Daejeon",
    sub: [
      { id: "daejeon_dunsan", label: "둔산", aliases: ["둔산", "유성"] },
      { id: "daejeon_downtown", label: "대전 시내", aliases: ["대전"] },
    ],
  },
  {
    id: "gwangju",
    label: "광주",
    labelEn: "Gwangju",
    sub: [{ id: "gwangju_downtown", label: "광주 시내", aliases: ["광주"] }],
  },
  {
    id: "ulsan",
    label: "울산",
    labelEn: "Ulsan",
    sub: [{ id: "ulsan_downtown", label: "울산 시내", aliases: ["울산"] }],
  },
  {
    id: "gangwon",
    label: "강원",
    labelEn: "Gangwon",
    sub: [
      { id: "gangwon_gangneung", label: "강릉", aliases: ["강릉"] },
      { id: "gangwon_chuncheon", label: "춘천", aliases: ["춘천"] },
      { id: "gangwon_wonju", label: "원주", aliases: ["원주"] },
      { id: "gangwon_ski", label: "스키장/리조트", aliases: ["스키", "리조트", "평창"] },
    ],
  },
  {
    id: "jeju",
    label: "제주",
    labelEn: "Jeju",
    sub: [
      { id: "jeju_airport", label: "제주공항", aliases: ["제주공항"] },
      { id: "jeju_downtown", label: "제주 시내", aliases: ["제주시", "제주"] },
      { id: "jeju_seogwipo", label: "서귀포", aliases: ["서귀포"] },
    ],
  },
  {
    id: "chungcheong",
    label: "충청",
    labelEn: "Chungcheong",
    sub: [
      { id: "chungcheong_cheongju", label: "청주", aliases: ["청주"] },
      { id: "chungcheong_cheonan", label: "천안/아산", aliases: ["천안", "아산"] },
      { id: "chungcheong_sejong", label: "세종", aliases: ["세종"] },
    ],
  },
  {
    id: "gyeongsang",
    label: "경상",
    labelEn: "Gyeongsang",
    sub: [
      { id: "gyeongsang_changwon", label: "창원", aliases: ["창원"] },
      { id: "gyeongsang_jinju", label: "진주", aliases: ["진주"] },
      { id: "gyeongsang_pohang", label: "포항", aliases: ["포항"] },
      { id: "gyeongsang_gumi", label: "구미", aliases: ["구미"] },
    ],
  },
  {
    id: "jeolla",
    label: "전라",
    labelEn: "Jeolla",
    sub: [
      { id: "jeolla_jeonju", label: "전주", aliases: ["전주"] },
      { id: "jeolla_yeosu", label: "여수", aliases: ["여수"] },
      { id: "jeolla_mokpo", label: "목포", aliases: ["목포"] },
    ],
  },
  {
    id: "national",
    label: "전국",
    labelEn: "Nationwide",
    sub: [{ id: "national", label: "전국 네트워크", aliases: ["전국", "national", "네트워크"] }],
  },
];

const MAIN_BY_ID = new Map(MEDIA_BROWSE_REGIONS.map((r) => [r.id, r]));

export function listBrowseRegionMains(): BrowseRegionMain[] {
  return MEDIA_BROWSE_REGIONS;
}

export function getBrowseRegionMain(id: string): BrowseRegionMain | undefined {
  return MAIN_BY_ID.get(id);
}

export function getBrowseRegionSub(
  mainId: string,
  subId: string,
): BrowseRegionSub | undefined {
  return getBrowseRegionMain(mainId)?.sub.find((s) => s.id === subId);
}

export function browseRegionLabel(
  id: string,
  locale = "ko",
  kind: "main" | "sub" = "main",
  mainId?: string,
): string {
  const isKo = locale.startsWith("ko");
  if (kind === "main") {
    const m = getBrowseRegionMain(id);
    return m ? (isKo ? m.label : m.labelEn ?? m.label) : id;
  }
  if (!mainId) return id;
  const s = getBrowseRegionSub(mainId, id);
  return s ? (isKo ? s.label : s.labelEn ?? s.label) : id;
}

export function expandBrowseRegionSub(regionSub: string): string[] {
  const trimmed = regionSub.trim();
  if (!trimmed) return [];

  for (const main of MEDIA_BROWSE_REGIONS) {
    const sub = main.sub.find((s) => s.id === trimmed);
    if (sub) {
      const aliases = sub.aliases ?? [];
      return [sub.label, ...aliases, main.label, main.id];
    }
    if (main.id === trimmed) {
      return [
        main.label,
        main.id,
        ...main.sub.flatMap((s) => [s.label, ...(s.aliases ?? [])]),
      ];
    }
  }

  return [trimmed];
}

export function inferBrowseRegionFromMedia(input: {
  region?: string | null;
  regionZone?: string | null;
  city?: string | null;
  district?: string | null;
  location?: string | null;
}): { main: string | null; sub: string | null } {
  const hay = [
    input.region,
    input.regionZone,
    input.city,
    input.district,
    input.location,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/전국|national|network/i.test(hay)) {
    return { main: "national", sub: "national" };
  }

  let best: { main: string; sub: string; score: number } | null = null;

  for (const main of MEDIA_BROWSE_REGIONS) {
    for (const sub of main.sub) {
      let score = 0;
      const terms = [sub.label, ...(sub.aliases ?? []), main.label, main.id];
      for (const t of terms) {
        if (t && hay.includes(t.toLowerCase())) score += t.length;
      }
      if (input.region?.toLowerCase() === main.id) score += 5;
      if (score > 0 && (!best || score > best.score)) {
        best = { main: main.id, sub: sub.id, score };
      }
    }
  }

  if (best) return { main: best.main, sub: best.sub };

  const regionMacro = input.region?.trim().toLowerCase();
  if (regionMacro === "seoul") return { main: "seoul", sub: "seoul_cbd" };
  if (regionMacro === "busan") return { main: "busan", sub: "busan_downtown" };
  if (regionMacro === "jeju") return { main: "jeju", sub: "jeju_downtown" };
  if (regionMacro === "national") return { main: "national", sub: "national" };

  const zone = input.regionZone?.trim();
  if (zone === "gangnam") return { main: "seoul", sub: "seoul_gangnam" };
  if (zone === "mapo") return { main: "seoul", sub: "seoul_hongdae" };
  if (zone === "seongdong") return { main: "seoul", sub: "seoul_seongsu" };
  if (zone === "downtown") return { main: "seoul", sub: "seoul_cbd" };
  if (zone === "gyeonggi") return { main: "gyeonggi", sub: "gyeonggi_seongnam" };
  if (zone === "incheon") return { main: "incheon", sub: "incheon_downtown" };
  if (zone === "busan") return { main: "busan", sub: "busan_seomyeon" };
  if (zone === "daegu") return { main: "daegu", sub: "daegu_dongseongno" };

  return { main: null, sub: null };
}
