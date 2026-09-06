import type { MediaItem } from "@/lib/media-data";
import type {
  PlannerExportOnlineInsights,
  PlannerExportOnlinePacingPhase,
} from "@/lib/planner-report-export/types";

export const ONLINE_INSIGHTS_DISCLAIMER_KO =
  "참고용 제안이며 실제 운영 시 예산·소재·타겟은 성과에 따라 조정이 필요합니다.";

export const ONLINE_INSIGHTS_DISCLAIMER_EN =
  "Reference suggestions only; budget, creative, and targeting should be adjusted based on performance.";

type PlatformCreativeHint = { ko: string; en: string };

/** Platform-first creative hints — not verbatim PR5-d catalog copy. */
const PLATFORM_CREATIVE_HINTS: Record<string, PlatformCreativeHint> = {
  TikTok: {
    ko: "9:16 숏폼 2~3종을 준비하고, 첫 3초 훅에 핵심 메시지·자막을 넣어 스킵을 줄이세요.",
    en: "Prepare 2–3 vertical (9:16) shorts with a clear hook and captions in the first 3 seconds.",
  },
  Kakao: {
    ko: "카카오 계열은 피드·모먼트별 소재 비율을 나누고, CTA 버튼 문구를 2종 A/B 테스트하세요.",
    en: "Split creative by Kakao placement and A/B test two CTA button labels.",
  },
  Naver: {
    ko: "검색·GFA는 키워드·연관검색어 확장과 함께, 썸네일에 혜택·차별점을 한 줄로 표기하세요.",
    en: "For Naver search/display, expand keywords and put one-line benefits on thumbnails.",
  },
  Google: {
    ko: "검색·디스플레이는 핵심 키워드 5~10개와 반응형 디스플레이 에셋(정사각·가로)을 세트로 준비하세요.",
    en: "Prepare 5–10 core keywords plus responsive display assets (square and landscape).",
  },
  Meta: {
    ko: "메타 계열은 피드·릴스·스토리별 크롭을 분리하고, UGC 톤 1종 + 브랜드 톤 1종을 병행하세요.",
    en: "Crop separately for feed, Reels, and Stories; pair one UGC-style and one brand asset.",
  },
  YouTube: {
    ko: "6~15초 범퍼·인스트림 2종과 정지 썸네일 2종을 준비해 스킵 전 메시지를 고정하세요.",
    en: "Use 6–15s bumper/in-stream variants plus two thumbnails to lock the pre-skip message.",
  },
  Karrot: {
    ko: "당근·로컬 채널은 동네명·거리 기준 카피와 생활 밀착 이미지를 우선 검토하세요.",
    en: "For local apps, lead with neighborhood-specific copy and everyday lifestyle visuals.",
  },
};

function normalizePlatform(platform?: string): string | null {
  const p = platform?.trim();
  if (!p) return null;
  if (/tiktok|틱톡/i.test(p)) return "TikTok";
  if (/kakao|카카오/i.test(p)) return "Kakao";
  if (/naver|네이버/i.test(p)) return "Naver";
  if (/google|구글|youtube|유튜브/i.test(p)) return p.match(/youtube|유튜브/i) ? "YouTube" : "Google";
  if (/meta|facebook|instagram|페이스북|인스타/i.test(p)) return "Meta";
  if (/karrot|당근/i.test(p)) return "Karrot";
  return p;
}

function parseAgeFromText(ageText: string): number | null {
  const range = ageText.match(/(\d{2})\s*[~\-–]\s*(\d{2})/);
  if (range) return Number.parseInt(range[1]!, 10);
  const decade = ageText.match(/(\d{2})\s*대/);
  if (decade) return Number.parseInt(decade[1]!, 10);
  return null;
}

function parseGenderFromText(text: string): "male" | "female" | null {
  if (/남성|남자|\b남\b/.test(text)) return "male";
  if (/여성|여자|\b여\b/.test(text)) return "female";
  return null;
}

function splitRegions(regionsText: string): string[] {
  return regionsText
    .split(/[,，、/|｜]/)
    .map((s) => s.trim())
    .filter((s) => s && s !== "미지정" && s !== "Not specified");
}

function buildHeuristicCreativeDirections(
  isKo: boolean,
  ageText: string,
  regionsText: string,
  fallbackMediaName?: string,
): string[] {
  const directions: string[] = [];
  const age = parseAgeFromText(ageText);
  const gender = parseGenderFromText(ageText);

  if (age != null && age >= 35) {
    directions.push(
      isKo
        ? "스펙 나열보다 일상·라이프스타일이 드러나는 이미지와 짧은 혜택 문구를 우선 검토하세요."
        : "Prefer lifestyle imagery and short benefit copy over spec-heavy layouts.",
    );
  } else if (age != null && age < 25) {
    directions.push(
      isKo
        ? "짧은 영상·세로형 소재와 트렌드 키워드를 활용한 훅 3초 내 노출을 권장합니다."
        : "Use short vertical video and trend-led hooks within the first 3 seconds.",
    );
  }

  if (gender === "male") {
    directions.push(
      isKo
        ? "남성 타겟: 기능·성능·비교 우위를 한 장면에 담은 소재가 효율적입니다."
        : "For male targets, one-frame feature or comparison angles work well.",
    );
  } else if (gender === "female") {
    directions.push(
      isKo
        ? "여성 타겟: 사용 전후·후기·감성 톤의 UGC 스타일 소재를 함께 준비하세요."
        : "For female targets, pair UGC-style before/after or review-led creative.",
    );
  }

  const regions = splitRegions(regionsText);
  if (regions.length >= 2) {
    directions.push(
      isKo
        ? `타겟 지역(${regions.slice(0, 2).join(", ")} 등)별로 현지화 카피·이미지 1종씩 분리하세요.`
        : `Localize copy and visuals per region (e.g. ${regions.slice(0, 2).join(", ")}).`,
    );
  }

  if (directions.length === 0) {
    const media = fallbackMediaName?.trim();
    directions.push(
      media
        ? isKo
          ? `「${media}」 채널 특성에 맞는 15초 이내 영상 2종 + 정사각형 이미지 2종을 기본 세트로 준비하세요.`
          : `Prepare two sub-15s videos and two square images suited to ${media}.`
        : isKo
          ? "채널별 핵심 메시지 1개씩 정리하고, 영상·이미지 소재 2~3종 A/B 테스트하세요."
          : "Define one core message per channel and A/B test 2–3 video or image variants.",
    );
  }

  return directions.slice(0, 4);
}

export function buildPlatformCreativeDirections(
  portfolio: readonly MediaItem[],
  isKo: boolean,
): string[] {
  const seen = new Set<string>();
  const directions: string[] = [];

  for (const media of portfolio) {
    const key = normalizePlatform(media.onlineSpec?.platform);
    if (!key || seen.has(key)) continue;
    const hint = PLATFORM_CREATIVE_HINTS[key];
    if (hint) {
      seen.add(key);
      directions.push(isKo ? hint.ko : hint.en);
    }
  }

  return directions.slice(0, 4);
}

export function buildOnlineCreativeDirections(input: {
  isKo: boolean;
  portfolio: readonly MediaItem[];
  ageText: string;
  regionsText: string;
}): string[] {
  const platformDirs = buildPlatformCreativeDirections(input.portfolio, input.isKo);
  if (platformDirs.length >= 2) return platformDirs.slice(0, 4);

  const fallbackName = input.portfolio[0]
    ? input.isKo
      ? input.portfolio[0].name
      : input.portfolio[0].nameEn || input.portfolio[0].name
    : undefined;
  const heuristic = buildHeuristicCreativeDirections(
    input.isKo,
    input.ageText,
    input.regionsText,
    fallbackName,
  );

  const merged = [...platformDirs];
  for (const line of heuristic) {
    if (merged.length >= 4) break;
    if (!merged.includes(line)) merged.push(line);
  }
  return merged.slice(0, 4);
}

export function buildOnlinePacingPlan(
  daySpan: number | null,
  isKo: boolean,
): PlannerExportOnlinePacingPhase[] {
  if (daySpan != null && daySpan < 14) {
    return [
      {
        label: isKo ? "집중 집행" : "Focused flight",
        sharePct: 70,
        description: isKo
          ? "초기 학습·노출 확보에 예산을 집중 배분합니다."
          : "Concentrate budget on early learning and reach.",
      },
      {
        label: isKo ? "마감 최적화" : "Close-out",
        sharePct: 30,
        description: isKo
          ? "잔여 기간 동안 성과 구간을 유지하며 마무리합니다."
          : "Maintain winning segments through the remaining period.",
      },
    ];
  }

  return [
    {
      label: isKo ? "학습" : "Learning",
      sharePct: 20,
      description: isKo
        ? "초기 1~2주: 소재·타겟 테스트, 데이터 수집에 집중합니다."
        : "Weeks 1–2: test creative and targeting, collect data.",
    },
    {
      label: isKo ? "최적화" : "Optimization",
      sharePct: 30,
      description: isKo
        ? "성과 구간을 찾아 입찰·소재를 조정합니다."
        : "Adjust bids and creative around winning segments.",
    },
    {
      label: isKo ? "확대" : "Scale",
      sharePct: 30,
      description: isKo
        ? "검증된 조합에 예산을 확대 투입합니다."
        : "Scale budget into validated combinations.",
    },
    {
      label: isKo ? "마감" : "Close",
      sharePct: 20,
      description: isKo
        ? "캠페인 종료 전 전환·도달 목표를 맞추며 집행합니다."
        : "Align delivery to reach or conversion goals before close.",
    },
  ];
}

export function buildOnlineOperationalNotes(input: {
  isKo: boolean;
  channelCount: number;
  budgetWon: number;
  daySpan: number | null;
  regionsText: string;
}): string[] {
  const notes: string[] = [];
  const regions = splitRegions(input.regionsText);

  if (input.channelCount >= 4) {
    notes.push(
      input.isKo
        ? "채널 수가 많습니다. 초기 2주는 성과가 좋은 상위 2~3개 채널에 예산을 집중한 뒤 확장하는 것을 권장합니다."
        : "Many channels selected — focus budget on top 2–3 performers for the first two weeks.",
    );
  } else if (input.channelCount === 1) {
    notes.push(
      input.isKo
        ? "단일 채널 집행입니다. 소재·타겟 변형을 통해 학습 속도를 높이세요."
        : "Single-channel flight — vary creative and targeting to speed learning.",
    );
  }

  if (input.budgetWon > 0 && input.budgetWon < 3_000_000) {
    notes.push(
      input.isKo
        ? "예산 규모가 소액입니다. 타겟·지역·소재 변수를 줄이고 핵심 메시지 1개에 집중하면 학습이 빨라집니다."
        : "Small budget — reduce variables and focus on one core message.",
    );
  } else if (input.budgetWon >= 10_000_000) {
    notes.push(
      input.isKo
        ? "예산 규모가 큽니다. 채널·소재·타겟별 일 예산 상한을 설정해 특정 구간에 과소진되지 않도록 관리하세요."
        : "Large budget — set daily caps per channel and segment to avoid overspend.",
    );
  }

  if (input.daySpan != null && input.daySpan < 14) {
    notes.push(
      input.isKo
        ? "집행 기간이 짧습니다. 승인·소재 제작 일정을 선행하고, 첫 3일 내 집행을 목표로 하세요."
        : "Short flight — align approval and creative production for launch within 3 days.",
    );
  } else if (input.daySpan != null && input.daySpan > 60) {
    notes.push(
      input.isKo
        ? "장기 캠페인입니다. 월 단위로 소재를 교체하고, 중간 성과 리뷰 일정을 잡아 두세요."
        : "Long campaign — refresh creative monthly and schedule mid-flight reviews.",
    );
  }

  if (regions.length >= 4) {
    notes.push(
      input.isKo
        ? `타겟 지역이 ${regions.length}곳입니다. 상위 2~3개 권역에 예산 70% 이상을 배분하는 방안을 검토하세요.`
        : `${regions.length} regions — consider allocating 70%+ to the top 2–3 areas.`,
    );
  }

  if (notes.length === 0) {
    notes.push(
      input.isKo
        ? "주 1회 페이스·성과를 점검하고, 2주차부터 비효율 채널 예산을 재배분하세요."
        : "Review pace and performance weekly; reallocate from underperformers after week 2.",
    );
  }

  return notes.slice(0, 5);
}

export function resolveOnlineCampaignDaySpan(months?: number): number | null {
  if (months == null || months <= 0) return null;
  return Math.max(1, Math.round(months * 30));
}

export function buildOnlineReportInsights(input: {
  isKo: boolean;
  portfolio: readonly MediaItem[];
  ageText: string;
  regionsText: string;
  channelCount: number;
  budgetWon: number;
  months?: number;
}): PlannerExportOnlineInsights {
  const daySpan = resolveOnlineCampaignDaySpan(input.months);
  return {
    pacingPlan: buildOnlinePacingPlan(daySpan, input.isKo),
    creativeDirections: buildOnlineCreativeDirections({
      isKo: input.isKo,
      portfolio: input.portfolio,
      ageText: input.ageText,
      regionsText: input.regionsText,
    }),
    operationalNotes: buildOnlineOperationalNotes({
      isKo: input.isKo,
      channelCount: input.channelCount,
      budgetWon: input.budgetWon,
      daySpan,
      regionsText: input.regionsText,
    }),
    disclaimer: input.isKo
      ? ONLINE_INSIGHTS_DISCLAIMER_KO
      : ONLINE_INSIGHTS_DISCLAIMER_EN,
  };
}
