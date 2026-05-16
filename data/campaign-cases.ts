import type { CampaignCaseStudy } from "@/lib/campaign-case-study";

/**
 * DB 미연결·published 0건일 때 노출하는 검증된 구조의 샘플 케이스 (3건).
 * 브랜드는 익명 표기, 인물 실명·가상 인용문 없음.
 */
export const campaignCaseStudies: readonly CampaignCaseStudy[] = [
  {
    id: "ctkadglobalsamplebeauty0001",
    industry: "Beauty",
    brandLabelKo: "글로벌 뷰티 브랜드 A사",
    brandLabelEn: "Global beauty brand (anonymized)",
    titleKo: "강남 핵심 상권 프리미엄 OOH 런칭",
    titleEn: "Premium OOH launch in Gangnam core district",
    backgroundKo:
      "신규 스킨케어 라인 국내 런칭에 맞춰 20·30대 여성 타깃의 브랜드 인지도를 단기간에 끌어올리는 것이 목표였습니다.",
    backgroundEn:
      "Launch a new skincare line with a short-flight plan to lift awareness among women in their 20s–30s.",
    challengeKo:
      "경쟁 뷰티 브랜드가 동일 상권에 집중 집행 중이어, 동일 예산 대비 차별화된 노출 타이밍과 면수 배분이 필요했습니다.",
    challengeEn:
      "Competing beauty brands were already heavy in the same district, so timing and panel mix had to be differentiated.",
    solutionKo:
      "싱커드 검증 데이터로 강남역·선릉역 유동 피크를 교차 분석해 주말·저녁 시간대 가중 노출을 설계하고, 디지털·정적 매체를 믹스했습니다.",
    solutionEn:
      "Cross-analyzed verified footfall peaks to weight weekend evening slots and mixed digital with static inventory.",
    mediaPlacements: [
      { labelKo: "강남역 일대 빌보드", labelEn: "Gangnam Station billboards" },
      { labelKo: "테헤란로 디지털 사이니지", labelEn: "Teheran-ro digital signage" },
      { labelKo: "신사·압구정 패키지 패널", labelEn: "Sinsa–Apgujeong package panels" },
    ],
    periodStartIso: "2024-06-01T00:00:00.000Z",
    periodEndIso: "2024-07-15T00:00:00.000Z",
    budgetRangeKo: "약 2,800만 ~ 3,500만원",
    budgetRangeEn: "Approx. ₩28M–35M",
    metrics: [
      {
        key: "impressions",
        labelKo: "총 노출",
        labelEn: "Impressions",
        valueKo: "450만",
        valueEn: "4.5M",
      },
      {
        key: "cpm",
        labelKo: "CPM",
        labelEn: "CPM",
        valueKo: "₩1,240",
        valueEn: "₩1,240",
      },
      {
        key: "brandLift",
        labelKo: "브랜드 리프트",
        labelEn: "Brand lift",
        valueKo: "+18%",
        valueEn: "+18%",
      },
      {
        key: "reachUplift",
        labelKo: "도달 증가",
        labelEn: "Reach uplift",
        valueKo: "+42%",
        valueEn: "+42%",
      },
      {
        key: "panels",
        labelKo: "집행 면수",
        labelEn: "Panels",
        valueKo: "10면",
        valueEn: "10 panels",
      },
    ],
    resultsKo: [
      "브랜드 검색량 전주 대비 +38%",
      "런칭 4주차 aided awareness +18%p",
      "프리미엄 이미지 지표 상위 20% 유지",
    ],
    resultsEn: [
      "Brand search +38% vs. prior week",
      "Aided awareness +18pp by week 4",
      "Premium perception in top 20% of category",
    ],
    thumbnailUrl: null,
    galleryUrls: [],
    managerCommentKo:
      "동일 예산 대비 검증 유동 데이터 기반 스케줄링이 인지도·프리미엄 지표 모두에 기여한 대표 사례입니다. (담당 AE 코멘트)",
    managerCommentEn:
      "Verified footfall-based scheduling lifted both awareness and premium perception within budget. (Account team note)",
    publishedAtIso: "2024-03-15T00:00:00.000Z",
  },
  {
    id: "ctkadglobalsampletechcoex02",
    industry: "Tech",
    brandLabelKo: "B2B SaaS 스타트업 B사",
    brandLabelEn: "B2B SaaS startup (anonymized)",
    titleKo: "코엑스·강남 디지털 OOH 신제품 런칭",
    titleEn: "COEX & Gangnam digital OOH product launch",
    backgroundKo:
      "엔터프라이즈 SaaS 신규 요금제 공개에 맞춰 의사결정자·실무자 동시 도달이 필요했습니다.",
    backgroundEn:
      "A new enterprise SaaS tier required reaching both decision-makers and practitioners.",
    challengeKo:
      "짧은 런칭 윈도우와 제한된 예산 안에서 B2B 리드 품질을 유지해야 했습니다.",
    challengeEn:
      "A tight launch window and limited budget required maintaining B2B lead quality.",
    solutionKo:
      "코엑스 컨벤션·전시 시즌 유동과 강남 업무지구 출퇴근 피크를 겹쳐 디지털 사이니지 위주로 2주 집중 집행했습니다.",
    solutionEn:
      "Stacked COEX event traffic with Gangnam commute peaks via a two-week digital-heavy flight.",
    mediaPlacements: [
      { labelKo: "코엑스 실내·외부 디지털", labelEn: "COEX indoor/outdoor digital" },
      { labelKo: "삼성역·선릉역 사이니지", labelEn: "Samseong–Seolleung signage" },
    ],
    periodStartIso: "2024-02-01T00:00:00.000Z",
    periodEndIso: "2024-02-14T00:00:00.000Z",
    budgetRangeKo: "약 1,200만 ~ 1,800만원",
    budgetRangeEn: "Approx. ₩12M–18M",
    metrics: [
      {
        key: "impressions",
        labelKo: "총 노출",
        labelEn: "Impressions",
        valueKo: "150만",
        valueEn: "1.5M",
      },
      {
        key: "cpm",
        labelKo: "CPM",
        labelEn: "CPM",
        valueKo: "₩980",
        valueEn: "₩980",
      },
      {
        key: "brandLift",
        labelKo: "브랜드 리프트",
        labelEn: "Brand lift",
        valueKo: "+12%",
        valueEn: "+12%",
      },
      {
        key: "reachUplift",
        labelKo: "도달 증가",
        labelEn: "Reach uplift",
        valueKo: "+31%",
        valueEn: "+31%",
      },
    ],
    resultsKo: [
      "데모 신청 전환 +26%",
      "런칭 기간 웹 세션 +54%",
      "리드당 CPA 목표 대비 -15%",
    ],
    resultsEn: [
      "Demo requests +26%",
      "Launch-period web sessions +54%",
      "CPA -15% vs. target",
    ],
    thumbnailUrl: null,
    galleryUrls: [],
    managerCommentKo:
      "짧은 집행 기간에도 피크 타임 검증치 기반으로 노출 효율을 확보한 케이스입니다.",
    managerCommentEn:
      "Peak-time verified scheduling delivered efficiency despite a short flight.",
    publishedAtIso: "2024-02-10T00:00:00.000Z",
  },
  {
    id: "ctkadglobalsampleentertain03",
    industry: "Entertainment",
    brandLabelKo: "대형 엔터테인먼트 C사",
    brandLabelEn: "Major entertainment label (anonymized)",
    titleKo: "서울 지하철 역사 랩핑 컴백 캠페인",
    titleEn: "Seoul subway station wrap comeback campaign",
    backgroundKo:
      "신규 싱글 컴백 홍보를 위해 10·20대 팬층의 이동 동선에 맞춘 대규모 교통 매체 집행이 필요했습니다.",
    backgroundEn:
      "A comeback single required large-format transit media aligned with fan commute patterns.",
    challengeKo:
      "역별 유동과 환승 동선이 제각각이라, 효율적인 역 선정과 크리에이티브 통일이 과제였습니다.",
    challengeEn:
      "Station footfall and transfer patterns varied widely, complicating selection and creative unity.",
    solutionKo:
      "역사별 검증 유동·연령 프로파일로 7개 핵심 역을 선정하고, 랩핑·스크린을 패키지로 운영했습니다.",
    solutionEn:
      "Selected seven core stations using verified footfall and age profiles; ran wraps and screens as a package.",
    mediaPlacements: [
      { labelKo: "강남·홍대·신촌 역사 랩핑", labelEn: "Gangnam, Hongdae, Sinchon wraps" },
      { labelKo: "2호선 주요 환승역 스크린", labelEn: "Line 2 transfer hub screens" },
    ],
    periodStartIso: "2024-04-01T00:00:00.000Z",
    periodEndIso: "2024-04-28T00:00:00.000Z",
    budgetRangeKo: "약 4,500만 ~ 5,200만원",
    budgetRangeEn: "Approx. ₩45M–52M",
    metrics: [
      {
        key: "impressions",
        labelKo: "총 노출",
        labelEn: "Impressions",
        valueKo: "680만",
        valueEn: "6.8M",
      },
      {
        key: "cpm",
        labelKo: "CPM",
        labelEn: "CPM",
        valueKo: "₩720",
        valueEn: "₩720",
      },
      {
        key: "brandLift",
        labelKo: "브랜드 리프트",
        labelEn: "Brand lift",
        valueKo: "+22%",
        valueEn: "+22%",
      },
      {
        key: "reachUplift",
        labelKo: "도달 증가",
        labelEn: "Reach uplift",
        valueKo: "+48%",
        valueEn: "+48%",
      },
    ],
    resultsKo: [
      "컴백 주 초동 스트리밍 +35%",
      "공식 채널 구독 +12%",
      "SNS 언급량 런칭 전 대비 +210%",
    ],
    resultsEn: [
      "First-week streaming +35%",
      "Official channel subs +12%",
      "Social mentions +210% vs. pre-launch",
    ],
    thumbnailUrl: null,
    galleryUrls: [],
    publishedAtIso: "2024-01-20T00:00:00.000Z",
  },
] as const;

export function getCampaignCaseById(id: string): CampaignCaseStudy | undefined {
  return campaignCaseStudies.find((c) => c.id === id);
}
