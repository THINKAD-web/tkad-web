import type { ScoredMedia } from "@/lib/ai-media-recommend";

export type SwipeAction = "pass" | "like" | "super";

export type SwipeVote = {
  id: string;
  action: SwipeAction;
  scored: ScoredMedia;
};

function actionWeight(a: SwipeAction): number {
  if (a === "super") return 3;
  if (a === "like") return 1;
  return 0;
}

/** 10장 스와이프 결과로 TOP 3: 슈퍼 > 좋아요 > 패스, 동점은 AI 점수. 전원 패스면 원본 점수 상위 3. */
export function top3FromSwipeVotes(
  votes: readonly SwipeVote[],
  fallbackPool: readonly ScoredMedia[],
): ScoredMedia[] {
  const ranked = [...votes].sort((a, b) => {
    const w = actionWeight(b.action) - actionWeight(a.action);
    if (w !== 0) return w;
    return b.scored.score - a.scored.score;
  });

  const picked: ScoredMedia[] = [];
  const seen = new Set<string>();

  for (const v of ranked) {
    if (picked.length >= 3) break;
    if (v.action === "pass") continue;
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    picked.push(v.scored);
  }

  const pool = [...fallbackPool].sort((a, b) => b.score - a.score);
  for (const s of pool) {
    if (picked.length >= 3) break;
    if (seen.has(s.item.id)) continue;
    seen.add(s.item.id);
    picked.push(s);
  }

  return picked.slice(0, 3);
}
