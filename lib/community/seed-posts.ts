import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { CommunityCategory } from "@/lib/community/types";

const SEED_MARKER = "community-seed-v1";
const OPS_AUTHOR = "THINKAD 운영팀";

type SeedPost = {
  category: CommunityCategory;
  title: string;
  body: string;
  isPinned?: boolean;
};

const SEED_POSTS: SeedPost[] = [
  {
    category: "notice",
    title: "THINKAD 커뮤니티를 오픈합니다",
    body: `안녕하세요, THINKAD 운영팀입니다.

OOH 매체 선정·집행 경험을 나누는 커뮤니티를 정식 오픈했습니다.

· 매체 추천 요청 — 예산·지역·업종을 입력하면 AI가 추천 매체 3곳을 바로 안내합니다.
· 집행 후기 — 실제 집행 경험을 공유하면 매체 리뷰로도 등록되며 200P가 지급됩니다.
· 협업 구해요 — 공동 구매, 파트너, 대행 협업 파트너를 찾아보세요.

건전한 토론 문화를 위해 운영 정책을 확인해 주세요. 좋은 인사이트 많이 나눠 주시길 바랍니다.`,
    isPinned: true,
  },
  {
    category: "free",
    title: "강남 전광판 집행 팁 공유합니다",
    body: `강남·테헤란 일대 디지털 전광판을 여러 번 집행해 본 광고주 입장에서 팁을 정리했습니다.

1. 출퇴근 시간대(08–10, 18–20) 노출 비중을 높이면 인지도 효과가 확실히 올라갑니다.
2. 15초 소재는 브랜드명+한 줄 메시지+QR/URL 중 하나만 넣는 게 좋습니다.
3. 집행 2주 전 소재 테스트(색상 대비, 야간 가독성)를 꼭 하세요.

같은 예산으로 A/B 소재를 번갈아 송출하면 CTR 차이를 바로 확인할 수 있었습니다.`,
  },
  {
    category: "free",
    title: "OOH 소재 제작 시 주의사항",
    body: `현장에서 자주 보는 소재 실수 몇 가지입니다.

· 해상도: LED는 픽셀 피치에 맞는 해상도로 제작 (매체별 스펙 확인)
· 안전 여백: 가장자리 5–10%는 로고/텍스트 비우기
· 색상: 순수 빨강(#FF0000)은 번짐 현상 — 약간 어둡게 보정
· 텍스트: 3초 안에 읽을 수 있는 글자 수(보통 7–10자)로 제한

매체 상세 페이지의 스펙 탭에서 권장 해상도를 확인할 수 있습니다.`,
  },
  {
    category: "free",
    title: "예산 500만원으로 할 수 있는 것들",
    body: `월 500만원 전후 예산으로 실제 집행 가능한 조합 예시입니다.

· 소형 DOOH 1–2면 × 2주 (역세권 디지털)
· 버스정류장 디지털 3–5면 × 1개월
· 강남/홍대 입구 LED 1면 × 1주 집중 노출

목표가 '인지도'면 좁은 지역에 집중, '도달'이면 면수를 늘리는 편이 낫습니다. 플래너에서 예산·지역을 넣으면 AI 추천도 받을 수 있습니다.`,
  },
  {
    category: "media_recommend",
    title: "강남에서 100만원으로 뭐가 좋을까요?",
    body: `F&B 브랜드 런칭 이벤트용으로 강남 일대 OOH를 알아보고 있습니다.

· 월 예산: 약 100만원
· 목표: 젊은 층 인지도 + 매장 방문 유도
· 희망: 2주 내 집행 가능

역세권 디지털이나 버스쉘터 중 어디가 나을지 의견 부탁드립니다.`,
  },
  {
    category: "execution_review",
    title: "홍대 전광판 집행 후기입니다",
    body: `홍대 입구 인근 LED 전광판 2주 집행 후기입니다.

예산 대비 노출은 만족스러웠고, 주말 저녁 시간대 반응이 특히 좋았습니다. 소재는 15초 영상 2종을 교차 송출했습니다.

아쉬운 점: 첫 주 소재가 밝아서 야간에 번져 보였고, 2주차에 밝기를 낮춰 개선했습니다. 다음에는 사전 테스트를 더 길게 할 예정입니다.`,
  },
  {
    category: "collaboration",
    title: "강남·홍대 3개 매체 공동 구매 파트너 구합니다",
    body: `뷰티 브랜드 2분과 강남·홍대·여의도 디지털 3면을 묶어 공동 집행하려 합니다.

· 예상 월 예산: 매체당 150–200만원
· 집행 기간: 4주
· 소재: 각 브랜드 15초 영상 교차

비슷한 예산·일정의 광고주분 연락 주세요. 대행사 경유도 환영합니다.`,
  },
  {
    category: "free",
    title: "지하철 vs 옥외 LED, 언제 무엇을 쓸까요",
    body: `같은 예산이면 '깊이' vs '넓이' 트레이드오프입니다.

지하철: 출퇴근 반복 노출, 좁은 타깃, 높은 빈도
옥외 LED: 임팩트, 브랜드 이미지, 넓은 도달

런칭 2주는 옥외 LED로 임팩트 → 이후 4주 지하철로 리마인드 조합이 잘 먹혔습니다.`,
  },
  {
    category: "free",
    title: "매체 허브 데이터, 어디까지 믿어도 될까요?",
    body: `THINKAD 매체 상세의 유동·노출 추정치는 DB 실측 + 공공데이터 + 추정 모델이 섞여 있습니다.

'추정치' 뱃지가 붙은 항목은 참고용으로 보시고, 최종 견적은 담당자 확인을 권장합니다. 그래도 후보 매체 좁히기에는 충분히 유용합니다.`,
  },
  {
    category: "collaboration",
    title: "대행사-매체사 직거래 협업 채널 만들어볼까요?",
    body: `소형 광고주 견적은 빠르게, 매체사는 빈 슬롯을 채우는 Win-Win 구조를 만들고 싶습니다.

관심 있는 매체사·대행사 분들 댓글로 의견 남겨 주세요. 운영팀에서 모임 형식 제안드리겠습니다.`,
  },
];

export type CommunitySeedResult = {
  skipped: boolean;
  created: number;
  marker: string;
};

export async function seedCommunityPosts(): Promise<CommunitySeedResult> {
  if (!isDatabaseConfigured()) {
    return { skipped: true, created: 0, marker: SEED_MARKER };
  }

  const db = getPrisma();
  const existing = await db.communityPost.count({
    where: {
      body: { contains: SEED_MARKER },
    },
  });
  if (existing > 0) {
    return { skipped: true, created: 0, marker: SEED_MARKER };
  }

  let created = 0;
  let recommendPostId: string | null = null;
  for (const post of SEED_POSTS) {
    const body = `${post.body.trim()}\n\n<!-- ${SEED_MARKER} -->`;
    const row = await db.communityPost.create({
      data: {
        category: post.category,
        title: post.title,
        body,
        authorName: OPS_AUTHOR,
        authorUserId: null,
        authorEmail: null,
        isAnonymous: false,
        status: "published",
        isPinned: post.isPinned ?? false,
        metadata:
          post.category === "media_recommend"
            ? {
                budgetWon: 1_000_000,
                region: "seoul_gangnam",
                industry: "indFb",
              }
            : undefined,
      },
      select: { id: true, category: true },
    });
    if (row.category === "media_recommend") {
      recommendPostId = row.id;
    }
    created += 1;
  }

  if (recommendPostId) {
    try {
      const { createAiRecommendReply } = await import(
        "@/lib/community/ai-recommend-reply"
      );
      await createAiRecommendReply({
        postId: recommendPostId,
        metadata: {
          budgetWon: 1_000_000,
          region: "seoul_gangnam",
          industry: "indFb",
        },
        locale: "ko",
      });
    } catch {
      /* catalog empty etc. */
    }
  }

  return { skipped: false, created, marker: SEED_MARKER };
}
