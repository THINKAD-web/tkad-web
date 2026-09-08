/**
 * 문의 자동매칭 — 다지역 블록 파서.
 * 단일 예산 문의와 분리; region별 budget·mediaIntent·namedNeedles.
 */
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";
import {
  parseFreetextMediaIntentsDetailed,
  type ParsedFreetextMediaIntents,
} from "@/lib/recommend/freetext-media-intents";
import { parseInquiryProposalText, type ParsedInquiryProposal } from "./parse-inquiry-text";

/** PR2 인수 테스트 — 공공기관 4지역 문의 */
export const REAL_INQUIRY_ACCEPTANCE_CASE = `목표: 공공기관 온라인 포털 및 오프라인 센터
기간: 10월~11월 중
예산: 지역별 각 200만원
지역: 부산 기장, 울산 울주, 전남 영광, 경북 경주 (4곳)
희망 매체: 택배차량 광고, 지하철 광고(지하철 있는 지역만), 시외버스터미널 광고,
          시외·고속버스터미널 광고, 기차역/KTX역 역사 광고, 버스 정류장 광고`;

export type InquiryRegionBlock = {
  /** matching-engine / recommend macro region (busan, ulsan, jeolla, …) */
  regionCodes: string[];
  /** 시·군·구 키워드 (기장, 울주, 영광, 경주) */
  locationKeywords: string[];
  budgetWon: number;
  months: number;
  mediaIntents: ParsedFreetextMediaIntents;
  namedNeedles: string[];
  /** 원문 조각 (UI·디버그) */
  source: string;
  label: string;
};

export type ParsedInquiryRegions = {
  raw: string;
  /** true when "지역별 각 N만원" 등 per-block budget */
  perRegionBudget: boolean;
  blocks: InquiryRegionBlock[];
  /** 블록 없을 때 단일 문의 fallback */
  single?: ParsedInquiryProposal;
  sharedMediaIntents: ParsedFreetextMediaIntents;
  sharedMonths: number;
};

/** 시·도 약칭 + 기초자치단체 (browse macro + location keyword) */
const SIDO_SIGUNGU_RULES: {
  re: RegExp;
  regionCode: string;
  keyword: string;
  label: string;
}[] = [
  { re: /부산(?:광역시|시)?\s*기장(?:군|읍)?|기장(?:군|읍)(?:\s*부산)?/i, regionCode: "busan", keyword: "기장", label: "부산 기장" },
  { re: /울산(?:광역시|시)?\s*울주(?:군|읍)?|울주(?:군|읍)(?:\s*울산)?/i, regionCode: "ulsan", keyword: "울주", label: "울산 울주" },
  { re: /전남\s*영광(?:군|읍)?|전라남도\s*영광|영광(?:군|읍)(?:\s*전남)?/i, regionCode: "jeolla", keyword: "영광", label: "전남 영광" },
  { re: /경북\s*경주(?:시|읍)?|경상북도\s*경주|경주(?:시|읍)(?:\s*경북)?/i, regionCode: "gyeongsang", keyword: "경주", label: "경북 경주" },
  { re: /서울(?:특별시|시)?\s*([가-힣]{2,4}(?:구|군))/i, regionCode: "seoul", keyword: "", label: "서울" },
  { re: /경기(?:도)?\s*([가-힣]{2,4}(?:시|군))/i, regionCode: "gyeonggi", keyword: "", label: "경기" },
  { re: /인천(?:광역시|시)?\s*([가-힣]{2,4}(?:구|군))/i, regionCode: "incheon", keyword: "", label: "인천" },
  { re: /부산(?:광역시|시)?\s*([가-힣]{2,4}(?:구|군|읍))/i, regionCode: "busan", keyword: "", label: "부산" },
  { re: /대구(?:광역시|시)?\s*([가-힣]{2,4}(?:구|군))/i, regionCode: "daegu", keyword: "", label: "대구" },
  { re: /광주(?:광역시|시)?\s*([가-힣]{2,4}(?:구|군))/i, regionCode: "gwangju", keyword: "", label: "광주" },
  { re: /대전(?:광역시|시)?\s*([가-힣]{2,4}(?:구|군))/i, regionCode: "daejeon", keyword: "", label: "대전" },
  { re: /울산(?:광역시|시)?\s*([가-힣]{2,4}(?:구|군|읍))/i, regionCode: "ulsan", keyword: "", label: "울산" },
  { re: /제주(?:특별자치도|도)?\s*([가-힣]{2,4}(?:시|읍|면))/i, regionCode: "jeju", keyword: "", label: "제주" },
  { re: /전남\s*([가-힣]{2,4}(?:군|시|읍))/i, regionCode: "jeolla", keyword: "", label: "전남" },
  { re: /전북\s*([가-힣]{2,4}(?:군|시|읍))/i, regionCode: "jeolla", keyword: "", label: "전북" },
  { re: /경남\s*([가-힣]{2,4}(?:군|시|읍))/i, regionCode: "gyeongsang", keyword: "", label: "경남" },
  { re: /경북\s*([가-힣]{2,4}(?:군|시|읍))/i, regionCode: "gyeongsang", keyword: "", label: "경북" },
  { re: /충남\s*([가-힣]{2,4}(?:군|시|읍))/i, regionCode: "chungcheong", keyword: "", label: "충남" },
  { re: /충북\s*([가-힣]{2,4}(?:군|시|읍))/i, regionCode: "chungcheong", keyword: "", label: "충북" },
  { re: /강원(?:특별자치도|도)?\s*([가-힣]{2,4}(?:군|시|읍))/i, regionCode: "gangwon", keyword: "", label: "강원" },
];

function parsePerRegionBudgetMan(text: string): {
  perRegion: boolean;
  budgetMan: number | null;
  source: string | null;
} {
  const perEach = text.match(
    /지역별\s*(?:각\s*)?(\d+(?:\.\d+)?)\s*만\s*(?:원)?(?:\s*씩)?/i,
  );
  if (perEach?.[1]) {
    return {
      perRegion: true,
      budgetMan: Math.round(Number(perEach[1])),
      source: perEach[0],
    };
  }
  const eachRegion = text.match(
    /(?:각\s*지역|지역\s*당)\s*(\d+(?:\.\d+)?)\s*만\s*(?:원)?/i,
  );
  if (eachRegion?.[1]) {
    return {
      perRegion: true,
      budgetMan: Math.round(Number(eachRegion[1])),
      source: eachRegion[0],
    };
  }
  return { perRegion: false, budgetMan: null, source: null };
}

function extractRegionSection(text: string): string | null {
  const m = text.match(/(?:^|\n)\s*지역\s*[:：]\s*([^\n]+)/im);
  if (m?.[1]) return m[1].trim();
  return null;
}

function splitRegionPhrases(section: string): string[] {
  const cleaned = section
    .replace(/\(\s*\d+\s*곳\s*\)/g, "")
    .replace(/[·•]/g, ",")
    .trim();
  return cleaned
    .split(/[,，、]|\s+(?:및|과|와)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
}

function parseRegionPhrase(phrase: string): Omit<InquiryRegionBlock, "budgetWon" | "months" | "mediaIntents" | "namedNeedles"> | null {
  const p = phrase.trim();
  if (!p) return null;

  for (const rule of SIDO_SIGUNGU_RULES) {
    const m = p.match(rule.re);
    if (m) {
      const captured = m[1]?.trim();
      const keyword = rule.keyword || captured || "";
      const label = keyword ? `${rule.label.split(" ")[0] ?? rule.label} ${keyword}`.trim() : rule.label;
      return {
        regionCodes: [rule.regionCode],
        locationKeywords: keyword ? [keyword] : [],
        source: p,
        label: label || p,
      };
    }
  }

  const parsed = parsePlannerFreetextBrief(p);
  const regions = parsed.fields.regions.value ?? [];
  if (regions.length > 0) {
    return {
      regionCodes: regions,
      locationKeywords: [],
      source: p,
      label: p,
    };
  }

  for (const { re, regionCode, label } of [
    { re: /부산/i, regionCode: "busan", label: "부산" },
    { re: /울산/i, regionCode: "ulsan", label: "울산" },
    { re: /전남|전라남/i, regionCode: "jeolla", label: "전남" },
    { re: /경북|경상북/i, regionCode: "gyeongsang", label: "경북" },
    { re: /경남|경상남/i, regionCode: "gyeongsang", label: "경남" },
    { re: /전북|전라북/i, regionCode: "jeolla", label: "전북" },
    { re: /서울/i, regionCode: "seoul", label: "서울" },
    { re: /경기/i, regionCode: "gyeonggi", label: "경기" },
    { re: /인천/i, regionCode: "incheon", label: "인천" },
    { re: /대구/i, regionCode: "daegu", label: "대구" },
    { re: /제주/i, regionCode: "jeju", label: "제주" },
  ]) {
    if (re.test(p)) {
      return {
        regionCodes: [regionCode],
        locationKeywords: [],
        source: p,
        label,
      };
    }
  }

  return null;
}

function parseSharedMonths(text: string): number {
  const parsed = parsePlannerFreetextBrief(text);
  const months = parsed.fields.months.value;
  if (months != null && months > 0) return months;
  const octNov = text.match(/(\d{1,2})\s*월\s*[~\-–]\s*(\d{1,2})\s*월/i);
  if (octNov) {
    const a = Number(octNov[1]);
    const b = Number(octNov[2]);
    if (a > 0 && b > 0) return Math.max(1, b - a + 1);
  }
  return 1;
}

function defaultBudgetWon(text: string, perRegionBudgetMan: number | null): number {
  if (perRegionBudgetMan != null && perRegionBudgetMan > 0) {
    return perRegionBudgetMan * 10_000;
  }
  const single = parseInquiryProposalText(text);
  return single.budgetWon;
}

/** `[서울] ...` / `---` 구분 다지역 섹션 */
function parseSectionBlocks(text: string): InquiryRegionBlock[] | null {
  const sectionParts = text
    .split(/\n\s*(?:---|\*\*\*)\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sectionParts.length <= 1) {
    const bracketLines = [...text.matchAll(/\[([^\]]+)\]\s*([^\n[]+)/g)];
    if (bracketLines.length >= 2) {
      const shared = parseSharedMonths(text);
      const media = parseFreetextMediaIntentsDetailed(text);
      const budgetInfo = parsePerRegionBudgetMan(text);
      const budgetWon = defaultBudgetWon(text, budgetInfo.budgetMan);
      return bracketLines.map((m) => {
        const header = m[1]!.trim();
        const body = m[2]!.trim();
        const region = parseRegionPhrase(header) ?? parseRegionPhrase(`${header} ${body}`);
        return {
          regionCodes: region?.regionCodes ?? [],
          locationKeywords: region?.locationKeywords ?? [],
          budgetWon,
          months: shared,
          mediaIntents: parseFreetextMediaIntentsDetailed(`${header} ${body}`),
          namedNeedles: [],
          source: m[0]!.trim(),
          label: region?.label ?? header,
        };
      });
    }
    return null;
  }

  const shared = parseSharedMonths(text);
  const budgetInfo = parsePerRegionBudgetMan(text);
  const budgetWon = defaultBudgetWon(text, budgetInfo.budgetMan);

  return sectionParts.map((part) => {
    const region = parseRegionPhrase(part);
    return {
      regionCodes: region?.regionCodes ?? [],
      locationKeywords: region?.locationKeywords ?? [],
      budgetWon,
      months: shared,
      mediaIntents: parseFreetextMediaIntentsDetailed(part),
      namedNeedles: [],
      source: part,
      label: region?.label ?? part.slice(0, 40),
    };
  });
}

/**
 * 다지역 문의 파싱. 블록이 없으면 blocks=[] + single fallback.
 */
export function parseInquiryRegionBlocks(raw: string): ParsedInquiryRegions {
  const text = raw.trim();
  const sharedMediaIntents = parseFreetextMediaIntentsDetailed(text);
  const sharedMonths = parseSharedMonths(text);
  const budgetInfo = parsePerRegionBudgetMan(text);

  const sectionBlocks = parseSectionBlocks(text);
  if (sectionBlocks && sectionBlocks.length >= 2) {
    return {
      raw: text,
      perRegionBudget: budgetInfo.perRegion,
      blocks: sectionBlocks,
      sharedMediaIntents,
      sharedMonths,
    };
  }

  const regionSection = extractRegionSection(text);
  if (!regionSection) {
    return {
      raw: text,
      perRegionBudget: budgetInfo.perRegion,
      blocks: [],
      single: parseInquiryProposalText(text),
      sharedMediaIntents,
      sharedMonths,
    };
  }

  const phrases = splitRegionPhrases(regionSection);
  const parsedRegions: InquiryRegionBlock[] = [];

  for (const phrase of phrases) {
    const region = parseRegionPhrase(phrase);
    if (!region) continue;
    const budgetWon =
      budgetInfo.perRegion && budgetInfo.budgetMan
        ? budgetInfo.budgetMan * 10_000
        : defaultBudgetWon(text, null) / Math.max(1, phrases.length);

    parsedRegions.push({
      ...region,
      budgetWon,
      months: sharedMonths,
      mediaIntents: sharedMediaIntents,
      namedNeedles: [],
    });
  }

  if (parsedRegions.length >= 2) {
    return {
      raw: text,
      perRegionBudget: budgetInfo.perRegion,
      blocks: parsedRegions,
      sharedMediaIntents,
      sharedMonths,
    };
  }

  return {
    raw: text,
    perRegionBudget: budgetInfo.perRegion,
    blocks: parsedRegions,
    single: parseInquiryProposalText(text),
    sharedMediaIntents,
    sharedMonths,
  };
}
