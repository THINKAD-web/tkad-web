/**
 * PR-6b 매체 추천 스코어링 — 3축 + 근거.
 *
 * ## 원칙: 근거를 못 쓰는 축은 만들지 않는다
 *
 * "AI가 추천했습니다"만 있으면 광고주가 믿지 않는다. 각 축은 **무엇을
 * 근거로 몇 점인지** 한 줄로 말할 수 있어야 하고, 말할 수 없으면 그 축은
 * 결과에서 아예 빠진다. 없는 데이터로 점수를 만들지 않는다.
 *
 * ## 타깃 적합 — demo gender/age (PR-3 Phase 3)
 *
 * 연령 우선순위: demoAgeSplit(measured/derived) → targetAge 파싱(parsed)
 * → 유형 default. 성별: demoGenderSplit → 유형 default.
 * `lib/metrics/defaults.ts` · `lib/metrics/demo-age-bridge.ts`
 *
 * ## 축별 데이터 출처
 * - 지역 적합 : `Media.regionMain` (browse 14그룹) ↔ 브리프 17시도 역매핑
 * - 예산 효율 : 등록 상품가 ÷ 노출 = CPM, 같은 유형 후보군 중앙값 대비
 * - 타깃 적합 : demo gender/age share ↔ 브리프 성별·연령
 * - 업종 적합 : matchMediaCatalog `scoreIndustry` + targetCategory 보조
 */

import type { MediaItem } from "@/lib/media-data";
import { classifyMedia } from "@/lib/metrics/classify";
import {
  resolveDemoAgeSplitWithBasis,
  resolveDemoGenderSplitWithBasis,
  targetAudienceShare,
  weakestBasis,
  type MediaDemoSource,
  type MetricBasis,
} from "@/lib/metrics/defaults";
import type { MediaMetricClass } from "@/lib/metrics/types";
import { calcLineMetrics } from "@/lib/planner/brief/mix-metrics";
import {
  briefIndustryToPlanner,
} from "@/lib/planner/brief/brief-integrated-adapters";
import { sidoCodesToBrowseMainIds, sidoLabel, summarizeSidoCodes } from "@/lib/planner/brief/regions";
import type { BriefAgeBand, BriefIndustry, CampaignBriefInput } from "@/lib/planner/brief/types";
import { scoreMediaIndustryMatch } from "@/lib/matching-engine";
import {
  PLANNER_INDUSTRY_TO_MATCHING,
} from "@/lib/planner/industry-match";

export type ScoreAxisKey = "region" | "budget" | "target" | "industry";

export type ScoreAxis = {
  key: ScoreAxisKey;
  /** 0~100 */
  score: number;
  /** 근거 한 줄 — 이 문장을 쓸 수 없으면 축 자체를 만들지 않는다 */
  rationale: string;
};

export type ScoredMedia = {
  media: MediaItem;
  /** 존재하는 축들의 평균 (0~100). 축이 하나도 없으면 0 */
  total: number;
  axes: ScoreAxis[];
  /** 타깃 축이 있을 때 demo basis (배지·UI용) */
  targetBasis?: MetricBasis | null;
  /** 참고용 — 1개 기준 CPM (계산 불가 시 null) */
  unitCpmWon: number | null;
};

/** 연령 라벨 문자열 → 연령대 집합. 인식 못 하면 빈 집합 */
export function parseAgeLabel(label: string): BriefAgeBand[] {
  const out = new Set<BriefAgeBand>();
  const s = label.replace(/\s+/g, "");

  const combo: Record<string, BriefAgeBand[]> = {
    "1020": ["10s", "20s"],
    "2030": ["20s", "30s"],
    "3040": ["30s", "40s"],
    "4050": ["40s", "50s+"],
    "2040": ["20s", "30s", "40s"],
  };
  for (const [k, v] of Object.entries(combo)) {
    if (s.includes(k)) v.forEach((b) => out.add(b));
  }

  for (const m of s.matchAll(/(\d0)대/g)) {
    const n = Number(m[1]);
    if (n === 10) out.add("10s");
    else if (n === 20) out.add("20s");
    else if (n === 30) out.add("30s");
    else if (n === 40) out.add("40s");
    else if (n >= 50) out.add("50s+");
  }

  return [...out];
}

function demoSourceFromMedia(media: MediaItem): MediaDemoSource {
  return {
    type: media.type,
    subCategory: media.subCategory ?? media.mediaSubCategory,
    mainCategory: media.mediaCategory?.[0] ?? media.mediaMainCategory,
    name: media.name,
    widthM: media.widthM,
    heightM: media.heightM,
    targetAge: media.targetAge,
    demoGenderSplit: media.demoGenderSplit,
    demoAgeSplit: media.demoAgeSplit,
    demoFromSignal: media.demoFromSignal,
  };
}

function formatTargetRationale(
  basis: MetricBasis,
  sharePct: number,
  isKo: boolean,
): string {
  if (isKo) {
    switch (basis) {
      case "measured":
        return `타깃 인구 비중 ${sharePct}% · 실측 demo 프로파일`;
      case "derived":
        return `타깃 인구 비중 ${sharePct}% · Signal 병합 demo`;
      case "parsed":
        return `타깃 인구 비중 ${sharePct}% · 등록 targetAge 파싱`;
      default:
        return `타깃 인구 비중 ${sharePct}% · 매체 유형 기반 추정`;
    }
  }
  switch (basis) {
    case "measured":
      return `Target share ${sharePct}% · measured demo profile`;
    case "derived":
      return `Target share ${sharePct}% · signal-merged demo`;
    case "parsed":
      return `Target share ${sharePct}% · parsed targetAge`;
    default:
      return `Target share ${sharePct}% · type-based estimate`;
  }
}

function median(nums: readonly number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

/** 매체 1개 기준 CPM (원). 금액·노출 중 하나라도 없으면 null */
export function unitCpmWon(media: MediaItem, days: number): number | null {
  const m = calcLineMetrics({ media, units: 1 }, days);
  if (!m.costWon || m.impressions.value <= 0) return null;
  const cpm = (m.costWon.value / m.impressions.value) * 1000;
  if (!Number.isFinite(cpm) || cpm <= 0) return null;
  return Math.round(cpm);
}

const CLASS_LABEL: Record<MediaMetricClass, string> = {
  dooh_large: "대형 DOOH",
  dooh_mid: "중형 DOOH",
  subway_psd: "지하철 PSD",
  subway_light: "지하철 라이트",
  bus_exterior: "버스 외부",
  bus_shelter: "버스 쉘터",
  elevator_tv: "엘리베이터 TV",
  airport: "공항",
  static_other: "일반 고정",
};

function mediaClassOf(media: MediaItem): MediaMetricClass {
  return classifyMedia({
    type: media.type,
    subCategory: media.subCategory ?? media.mediaSubCategory,
    mainCategory: media.mediaCategory?.[0] ?? media.mediaMainCategory,
    name: media.name,
    widthM: media.widthM,
    heightM: media.heightM,
  });
}

const BRIEF_INDUSTRY_LABEL: Record<BriefIndustry, { ko: string; en: string }> = {
  fb: { ko: "F&B", en: "F&B" },
  retail: { ko: "유통·리테일", en: "Retail" },
  tech: { ko: "IT·테크", en: "Tech" },
  finance: { ko: "금융", en: "Finance" },
  ent: { ko: "엔터·미디어", en: "Entertainment" },
  other: { ko: "기타", en: "Other" },
};

function formatIndustryRationale(
  industry: BriefIndustry,
  score: number,
  isKo: boolean,
): string {
  const label = BRIEF_INDUSTRY_LABEL[industry][isKo ? "ko" : "en"];
  if (score >= 85) {
    return isKo
      ? `${label} 업종 키워드·매체 유형 일치`
      : `Strong ${label} keyword and media-type fit`;
  }
  if (score >= 55) {
    return isKo
      ? `${label} 업종 관련 신호(텍스트·유형)`
      : `${label}-related signals in media profile`;
  }
  return isKo
    ? `${label} 업종과 직접 연관 신호 약함`
    : `Weak direct ${label} association`;
}

function industryAxisScore(
  media: MediaItem,
  industry: BriefIndustry,
): number {
  const plannerKey = briefIndustryToPlanner(industry);
  const matchingIndustry = PLANNER_INDUSTRY_TO_MATCHING[plannerKey];
  let pts = scoreMediaIndustryMatch(media, matchingIndustry);
  const targetCats = media.targetCategory ?? [];
  const industryLabels = media.industryLabels ?? [];
  const labelHay = industryLabels.join(" ").toLowerCase();
  if (
    targetCats.length > 0 &&
    (labelHay.includes(industry) ||
      (industry === "fb" && /f&b|fnb|food|식음/i.test(labelHay)))
  ) {
    pts = Math.min(20, pts + 3);
  }
  return Math.min(100, Math.max(0, Math.round((pts / 20) * 100)));
}

/** Quick/Step2 랭킹 기준 문구 — 실제 store 타게팅을 반영 */
export function briefRankingBasisLabel(
  brief: Pick<
    CampaignBriefInput,
    "regionCodes" | "genders" | "ageBands" | "industry"
  >,
  days: number,
  isKo: boolean,
): string {
  const region =
    brief.regionCodes.length === 0
      ? isKo
        ? "전국"
        : "Nationwide"
      : summarizeSidoCodes(brief.regionCodes, isKo, 3);

  const targetParts: string[] = [];
  if (brief.genders.length > 0) {
    for (const g of brief.genders) {
      targetParts.push(
        g === "female" ? (isKo ? "여성" : "Female") : isKo ? "남성" : "Male",
      );
    }
  }
  if (brief.ageBands.length > 0) {
    targetParts.push(...brief.ageBands);
  }
  const target =
    targetParts.length > 0
      ? targetParts.join("·")
      : isKo
        ? "전 타깃"
        : "All audiences";

  const industry =
    brief.industry && brief.industry !== "other"
      ? BRIEF_INDUSTRY_LABEL[brief.industry][isKo ? "ko" : "en"]
      : null;

  const segments = [region, target, industry, `${days}${isKo ? "일" : "d"}`].filter(
    Boolean,
  );
  return isKo
    ? `현재 설정 기준 참고 순위 — ${segments.join(" · ")}`
    : `Reference ranking — ${segments.join(" · ")}`;
}

/**
 * 후보 매체 스코어링.
 *
 * @param candidates 지역 필터를 이미 통과한 후보군
 * @param brief      브리프 (연령·지역·기간)
 * @param days       집행 일수
 */
export function scoreMediaCandidates(params: {
  candidates: readonly MediaItem[];
  brief: CampaignBriefInput;
  days: number;
  isKo?: boolean;
}): ScoredMedia[] {
  const { candidates, brief, days } = params;
  const isKo = params.isKo ?? true;

  const cpmByMedia = new Map<string, number | null>();
  const cpmByClass = new Map<MediaMetricClass, number[]>();
  for (const m of candidates) {
    const cpm = unitCpmWon(m, days);
    cpmByMedia.set(m.id, cpm);
    if (cpm != null) {
      const cls = mediaClassOf(m);
      const arr = cpmByClass.get(cls) ?? [];
      arr.push(cpm);
      cpmByClass.set(cls, arr);
    }
  }
  const medianByClass = new Map<MediaMetricClass, number | null>();
  for (const [cls, arr] of cpmByClass) {
    medianByClass.set(cls, median(arr));
  }

  const wantedBrowseIds = new Set(sidoCodesToBrowseMainIds(brief.regionCodes));
  const hasTargetBrief =
    brief.genders.length > 0 || brief.ageBands.length > 0;

  return candidates
    .map((media): ScoredMedia => {
      const axes: ScoreAxis[] = [];
      let targetBasis: MetricBasis | null = null;

      if (wantedBrowseIds.size > 0 && media.regionMain) {
        const hit = wantedBrowseIds.has(media.regionMain);
        const where =
          [media.city, media.district].filter(Boolean).join(" ") ||
          media.regionMain;
        const wantedNames = brief.regionCodes
          .map((c) => sidoLabel(c, isKo))
          .join("·");
        axes.push({
          key: "region",
          score: hit ? 95 : 20,
          rationale: hit
            ? isKo
              ? `${where} · 요청 지역(${wantedNames}) 일치`
              : `${where} · matches requested ${wantedNames}`
            : isKo
              ? `${where} · 요청 지역(${wantedNames}) 밖`
              : `${where} · outside requested ${wantedNames}`,
        });
      }

      const cpm = cpmByMedia.get(media.id) ?? null;
      const cls = mediaClassOf(media);
      const med = medianByClass.get(cls) ?? null;
      if (cpm != null && med != null && med > 0) {
        const diffPct = Math.round(((cpm - med) / med) * 100);
        const score = Math.max(0, Math.min(100, 50 - diffPct));
        const sign = diffPct > 0 ? "+" : "";
        axes.push({
          key: "budget",
          score,
          rationale: isKo
            ? `CPM ₩${cpm.toLocaleString()} · ${CLASS_LABEL[cls]} 중앙값 대비 ${sign}${diffPct}%`
            : `CPM ₩${cpm.toLocaleString()} · ${sign}${diffPct}% vs ${cls} median`,
        });
      }

      if (hasTargetBrief) {
        const source = demoSourceFromMedia(media);
        const genderRes = resolveDemoGenderSplitWithBasis(source);
        const ageRes = resolveDemoAgeSplitWithBasis(source);
        const share = targetAudienceShare(genderRes.value, ageRes.value, {
          genders: brief.genders.length > 0 ? brief.genders : undefined,
          ageBands: brief.ageBands.length > 0 ? brief.ageBands : undefined,
        });
        const basisParts: MetricBasis[] = [];
        if (brief.genders.length > 0) basisParts.push(genderRes.basis);
        if (brief.ageBands.length > 0) basisParts.push(ageRes.basis);
        targetBasis = weakestBasis(basisParts);
        const score = Math.round(share * 100);
        axes.push({
          key: "target",
          score: Math.min(100, Math.max(0, score)),
          rationale: formatTargetRationale(targetBasis, score, isKo),
        });
      }

      if (brief.industry && brief.industry !== "other") {
        const industryScore = industryAxisScore(media, brief.industry);
        axes.push({
          key: "industry",
          score: industryScore,
          rationale: formatIndustryRationale(
            brief.industry,
            industryScore,
            isKo,
          ),
        });
      }

      const total =
        axes.length > 0
          ? Math.round(axes.reduce((s, a) => s + a.score, 0) / axes.length)
          : 0;

      return { media, total, axes, targetBasis, unitCpmWon: cpm };
    })
    .sort((a, b) => b.total - a.total);
}

/**
 * 예산 안에 들어가는 추천 믹스를 만든다 (H-4).
 * 점수 높은 순으로 1개씩 담되, 예산을 넘기는 매체는 건너뛴다.
 */
export function buildRecommendedMix(params: {
  scored: readonly ScoredMedia[];
  days: number;
  budgetWon: number;
  maxLines?: number;
}): { mediaId: string; units: number }[] {
  const maxLines = params.maxLines ?? 5;
  const out: { mediaId: string; units: number }[] = [];
  let spent = 0;

  for (const s of params.scored) {
    if (out.length >= maxLines) break;
    const line = calcLineMetrics({ media: s.media, units: 1 }, params.days);
    if (!line.costWon) continue;
    const cost = line.costWon.value;
    if (cost <= 0) continue;
    if (spent + cost > params.budgetWon) continue;
    out.push({ mediaId: s.media.id, units: 1 });
    spent += cost;
  }

  return out;
}
