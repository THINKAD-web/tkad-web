/**
 * PR-6b 매체 추천 스코어링 — 3축 + 근거.
 *
 * ## 원칙: 근거를 못 쓰는 축은 만들지 않는다
 *
 * "AI가 추천했습니다"만 있으면 광고주가 믿지 않는다. 각 축은 **무엇을
 * 근거로 몇 점인지** 한 줄로 말할 수 있어야 하고, 말할 수 없으면 그 축은
 * 결과에서 아예 빠진다. 없는 데이터로 점수를 만들지 않는다.
 *
 * ## 성별은 이번 범위에서 가중치 0
 *
 * 매체별 성별 구성비 데이터가 DB 에 없다(demo_* 는 PR-3 재설계 예정).
 * 따라서 성별은 **순위에 반영하지 않는다.** 타깃 축은 연령 라벨만 쓴다.
 * 화면에도 "성별 데이터 준비 중 — 순위에 미반영"을 명시한다.
 *
 * ## 축별 데이터 출처
 * - 지역 적합 : `Media.regionMain` (browse 14그룹) ↔ 브리프 17시도 역매핑
 * - 예산 효율 : 등록 상품가 ÷ 노출 = CPM, 같은 유형 후보군 중앙값 대비
 * - 타깃 적합 : `keywordFilter.targetLabels` (편집 라벨) ↔ 브리프 연령대
 *               ※ 실측 인구 구성비가 아니라 운영이 붙인 라벨이다
 */

import type { MediaItem } from "@/lib/media-data";
import { classifyMedia } from "@/lib/metrics/classify";
import type { MediaMetricClass } from "@/lib/metrics/types";
import { calcLineMetrics } from "@/lib/planner/brief/mix-metrics";
import { sidoCodesToBrowseMainIds, sidoLabel } from "@/lib/planner/brief/regions";
import type { BriefAgeBand, CampaignBriefInput } from "@/lib/planner/brief/types";

export type ScoreAxisKey = "region" | "budget" | "target";

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
  /** 참고용 — 1개 기준 CPM (계산 불가 시 null) */
  unitCpmWon: number | null;
};

/** 연령 라벨 문자열 → 연령대 집합. 인식 못 하면 빈 집합 */
export function parseAgeLabel(label: string): BriefAgeBand[] {
  const out = new Set<BriefAgeBand>();
  const s = label.replace(/\s+/g, "");

  // "2030", "3040", "1020", "4050" 형태
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

  // "20대", "30대" 형태
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

/** 매체의 연령 라벨 전체 → 연령대 집합 */
function mediaAgeBands(media: MediaItem): BriefAgeBand[] {
  const labels = media.keywordFilter?.targetLabels ?? [];
  const out = new Set<BriefAgeBand>();
  for (const l of labels) {
    for (const b of parseAgeLabel(l)) out.add(b);
  }
  return [...out];
}

/** 매체의 연령 라벨 원문 중 브리프 연령대와 겹치는 것 (근거 문장용) */
function matchingAgeLabels(
  media: MediaItem,
  wanted: readonly BriefAgeBand[],
): string[] {
  const labels = media.keywordFilter?.targetLabels ?? [];
  return labels.filter((l) =>
    parseAgeLabel(l).some((b) => wanted.includes(b)),
  );
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
    subCategory: media.subCategory,
    mainCategory: media.mediaCategory?.[0],
    name: media.name,
  });
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

  // 예산 효율 기준선 — 같은 유형 후보들의 CPM 중앙값
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

  return candidates
    .map((media): ScoredMedia => {
      const axes: ScoreAxis[] = [];

      // ── 지역 적합 ──
      // 브리프에 지역 조건이 없으면(전국) 변별력이 없어 축을 만들지 않는다.
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

      // ── 예산 효율 ──
      const cpm = cpmByMedia.get(media.id) ?? null;
      const cls = mediaClassOf(media);
      const med = medianByClass.get(cls) ?? null;
      if (cpm != null && med != null && med > 0) {
        const diffPct = Math.round(((cpm - med) / med) * 100);
        // 싼 쪽이 고득점. 중앙값 대비 -50% → 100, +50% → 0
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

      // ── 타깃 적합 (연령만 — 성별은 데이터 없어 가중치 0) ──
      if (brief.ageBands.length > 0) {
        const bands = mediaAgeBands(media);
        if (bands.length > 0) {
          const matched = matchingAgeLabels(media, brief.ageBands);
          const overlap = bands.filter((b) => brief.ageBands.includes(b));
          const score = Math.round(
            (overlap.length / brief.ageBands.length) * 100,
          );
          if (matched.length > 0) {
            axes.push({
              key: "target",
              score: Math.min(100, score),
              rationale: isKo
                ? `타깃 라벨 "${matched.slice(0, 2).join(", ")}" · 요청 연령대와 겹침`
                : `Target label "${matched.slice(0, 2).join(", ")}" overlaps requested ages`,
            });
          }
        }
      }

      const total =
        axes.length > 0
          ? Math.round(axes.reduce((s, a) => s + a.score, 0) / axes.length)
          : 0;

      return { media, total, axes, unitCpmWon: cpm };
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
    // 예산을 넘기면 담지 않는다 — 추천 믹스는 예산을 초과하지 않는다.
    if (spent + cost > params.budgetWon) continue;
    out.push({ mediaId: s.media.id, units: 1 });
    spent += cost;
  }

  return out;
}
