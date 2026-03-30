import type { MediaItem } from "@/lib/media-data";
import {
  recommendMedia,
  regionMatchesMedia,
  type AiRecommendInput,
  type MatchReason,
  type ScoredMedia,
} from "@/lib/ai-media-recommend";

export type ScoredSwipeItem = ScoredMedia & {
  /** 일반 빌보드 위주 흐름에서 눈에 띄는 ‘언익스펙티드’ 슬롯 */
  isUnexpected?: boolean;
};

const DECK_SIZE = 10;

function mediaHaystack(m: MediaItem): string {
  return [
    m.location,
    m.locationEn,
    m.city,
    m.district,
    m.nearbyStations,
    m.nearbyLandmarks,
    m.features,
    m.featuresEn,
    m.subCategory,
    m.name,
    m.nameEn,
    m.networkSubtype,
    m.tags?.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function dedupeReasons(reasons: MatchReason[]): MatchReason[] {
  const out: MatchReason[] = [];
  const seen = new Set<string>();
  for (const r of reasons) {
    if (seen.has(r.ko)) continue;
    seen.add(r.ko);
    out.push(r);
  }
  return out.slice(0, 4);
}

/** 카페 창문·엘리베이터·주유소 등 ‘평범한 대형 전광판’과 결이 다른 슬롯 */
function isUnexpectedPlacement(m: MediaItem): boolean {
  const h = mediaHaystack(m);
  return /카페|창문|엘리베이터|elevator|에스컬레이터|escalator|주유소|gas\s*station|편의점|쉘터|shelter|지하철\s*연결|로비|lobby|미디어폴|시내버스|버스\s*쉘터|엘리|lift/i.test(
    h,
  );
}

function filteredPool(input: AiRecommendInput, catalog: readonly MediaItem[]): MediaItem[] {
  const valid = catalog.filter(
    (m) => m != null && typeof m.id === "string" && m.id.trim().length > 0,
  );
  const budgetCap = input.budgetMaxMan > 0 ? input.budgetMaxMan : null;
  let pool = valid;
  if (budgetCap != null) {
    pool = pool.filter((m) => m.price <= budgetCap);
  }
  if (input.region !== "all") {
    pool = pool.filter((m) => regionMatchesMedia(m, input.region));
  }
  const kws = input.locationKeywords?.filter((k) => k.trim().length > 0) ?? [];
  if (kws.length > 0) {
    pool = pool.filter((m) => {
      const h = mediaHaystack(m);
      return kws.some((kw) => h.includes(kw.trim().toLowerCase()));
    });
  }
  return pool;
}

function similarityBoost(liked: readonly MediaItem[], m: MediaItem): number {
  if (liked.length === 0) return 0;
  let s = 0;
  const mh = mediaHaystack(m);
  const mTok = new Set(mh.split(/[\s,/·\-]+/).filter((w) => w.length > 1));
  for (const l of liked) {
    if (m.region === l.region) s += 4;
    if (m.type === l.type) s += 3;
    const pr = Math.abs(m.price - l.price) / Math.max(l.price, 1);
    if (pr < 0.35) s += 2;
    const lh = mediaHaystack(l);
    for (const w of lh.split(/[\s,/·\-]+/).filter((x) => x.length > 1)) {
      if (mTok.has(w)) s += 0.35;
    }
  }
  return Math.min(24, Math.round(s));
}

function augmentReasons(
  scored: ScoredMedia,
  ctx: {
    likeSimilar: boolean;
    unexpected: boolean;
  },
): MatchReason[] {
  const out = [...scored.reasons];
  if (ctx.likeSimilar) {
    out.push({
      ko: "좋아요한 매체와 유사한 지역·유형·키워드 신호를 반영했어요",
      en: "Boosted using traits similar to media you liked",
    });
  }
  if (ctx.unexpected) {
    out.push({
      ko: "일반적이지 않은 설치·포맷으로 주목도·화제성을 노릴 수 있어요",
      en: "Uncommon placement format for standout visibility",
    });
  }
  if (out.length < 2) {
    out.push({
      ko: "퀴즈 조건과 점수 모델을 바탕으로 선별했습니다",
      en: "Selected from your quiz inputs and the scoring model",
    });
  }
  return dedupeReasons(out);
}

function scoreUnexpectedItem(
  input: AiRecommendInput,
  item: MediaItem,
): ScoredMedia {
  const one = recommendMedia(input, [item]);
  if (one.length > 0) return one[0]!;
  return {
    item,
    score: 48,
    reasons: [
      {
        ko: "데이터가 제한적이지만 독특한 설치 환경으로 추천했습니다",
        en: "Limited data, but unique placement context",
      },
    ],
  };
}

/**
 * 스와이프 덱 10장: 규칙 기반 추천 + (가능하면) 언익스펙티드 1슬롯.
 * 좋아요가 있으면 유사 특성 가산. 모든 항목에 추천 이유(최소 2개 이상)를 붙입니다.
 */
export function buildSwipeDeck(
  input: AiRecommendInput,
  catalog: readonly MediaItem[],
  options?: { liked?: readonly MediaItem[] },
): ScoredSwipeItem[] {
  const liked = options?.liked ?? [];
  const base = recommendMedia(input, catalog);
  if (base.length === 0) return [];

  const pool = filteredPool(input, catalog);

  const boosted: ScoredSwipeItem[] = base.map((s) => {
    const boost = similarityBoost(liked, s.item);
    const likeSimilar = liked.length > 0 && boost >= 6;
    const nextScore = Math.min(100, s.score + boost);
    const reasons = augmentReasons(
      { ...s, score: nextScore },
      { likeSimilar, unexpected: false },
    );
    return {
      item: s.item,
      score: nextScore,
      reasons,
      isUnexpected: false,
    };
  });

  boosted.sort((a, b) => b.score - a.score);

  const primary = boosted.slice(0, Math.min(DECK_SIZE, boosted.length));
  const used = new Set(primary.map((p) => p.item.id));

  const unexpectedFromPool = pool
    .filter((m) => !used.has(m.id) && isUnexpectedPlacement(m))
    .sort(
      (a, b) => (b.visibilityScore ?? 0) - (a.visibilityScore ?? 0),
    );

  let unexpectedSlot: ScoredSwipeItem | null = null;
  if (unexpectedFromPool.length > 0) {
    const u = unexpectedFromPool[0]!;
    const scoredU = scoreUnexpectedItem(input, u);
    unexpectedSlot = {
      ...scoredU,
      reasons: augmentReasons(scoredU, {
        likeSimilar: liked.some((l) => similarityBoost([l], u) >= 4),
        unexpected: true,
      }),
      isUnexpected: true,
    };
  } else {
    const fallback = pool.find(
      (m) =>
        !used.has(m.id) &&
        (m.type === "bus" ||
          m.type === "subway" ||
          /네트워크|network|패키지|package/i.test(mediaHaystack(m))),
    );
    if (fallback) {
      const scoredF = scoreUnexpectedItem(input, fallback);
      unexpectedSlot = {
        ...scoredF,
        reasons: augmentReasons(scoredF, {
          likeSimilar: false,
          unexpected: true,
        }),
        isUnexpected: true,
      };
    }
  }

  let deck: ScoredSwipeItem[] = [...primary];

  if (unexpectedSlot && deck.length >= DECK_SIZE) {
    deck = [...deck.slice(0, DECK_SIZE - 1), unexpectedSlot];
  } else if (unexpectedSlot && deck.length < DECK_SIZE) {
    deck = [...deck, unexpectedSlot];
  }

  deck = deck.slice(0, DECK_SIZE).map((s) => ({
    ...s,
    reasons: dedupeReasons(s.reasons),
  }));

  return deck;
}
