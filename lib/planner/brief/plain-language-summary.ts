/**
 * Step 3 "한눈에 요약" 카드용 — 숫자를 광고를 모르는 사용자도 읽을 수 있는
 * 한 문장으로 바꾼다. 계산은 하지 않는다 — 이미 계산된 값(총 예산·총 노출·
 * 순 도달)을 문장으로 조립만 한다.
 *
 * 도달(netReach)은 커버리지·인구 데이터가 없는 매체가 섞이면 null 이 될 수
 * 있다(MetricsPanel 의 pending 처리와 동일 기준). 이때 도달 인원을 지어내지
 * 않고 노출 수만으로 문장을 만든다.
 */

import { summarizeSidoCodes } from "@/lib/planner/brief/regions";
import { briefUsesDefaults, type CampaignBriefInput } from "@/lib/planner/brief/types";

function formatManwon(won: number, isKo: boolean): string {
  const man = Math.round(won / 10_000);
  return isKo
    ? `${man.toLocaleString("ko-KR")}만원`
    : `₩${won.toLocaleString("en-US")}`;
}

export function buildPlainLanguageSummary(params: {
  isKo: boolean;
  budgetWon: number;
  totalImpressions: number;
  /** null = 도달 산정 중(커버리지 데이터 없음) */
  netReach: number | null;
  formatCompact: (n: number, isKo: boolean) => string;
}): string {
  const { isKo, budgetWon, totalImpressions, netReach, formatCompact } = params;
  const budget = formatManwon(budgetWon, isKo);
  const impressions = formatCompact(totalImpressions, isKo);

  if (netReach != null && netReach > 0) {
    const reach = formatCompact(netReach, isKo);
    return isKo
      ? `${budget}으로 총 ${impressions}회 노출, 약 ${reach}명에게 도달할 것으로 예상됩니다.`
      : `With a budget of ${budget}, this plan is expected to generate about ${impressions} impressions, reaching roughly ${reach} people.`;
  }

  return isKo
    ? `${budget}으로 총 ${impressions}회 노출될 것으로 예상됩니다.`
    : `With a budget of ${budget}, this plan is expected to generate about ${impressions} impressions.`;
}

/** "서울 · 20대, 30대" 처럼 한 줄로 압축한 타깃 요약 — BriefSummary 의 상세 표와 별개 */
export function summarizeBriefTargetLine(
  brief: Pick<CampaignBriefInput, "regionCodes" | "genders" | "ageBands">,
  isKo: boolean,
): string {
  const defaults = briefUsesDefaults(brief as CampaignBriefInput);
  const regions = defaults.allRegions
    ? isKo
      ? "전국"
      : "Nationwide"
    : summarizeSidoCodes(brief.regionCodes, isKo, 2);

  if (defaults.allGenders && defaults.allAges) {
    return isKo ? `${regions} · 전 타깃` : `${regions} · All audiences`;
  }

  const genders = brief.genders
    .map((g) => (g === "female" ? (isKo ? "여성" : "Female") : isKo ? "남성" : "Male"))
    .join("·");
  const ages = brief.ageBands.join(", ");
  const target = [genders, ages].filter(Boolean).join(" ");
  return `${regions} · ${target}`;
}
