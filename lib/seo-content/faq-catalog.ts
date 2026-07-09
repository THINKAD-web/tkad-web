export type FaqCategoryId =
  | "basic"
  | "pricing"
  | "execution"
  | "fandom"
  | "measurement";

export type FaqCatalogItem = {
  category: FaqCategoryId;
  order: number;
  questionKo: string;
  questionEn: string;
  answerKo: string;
  answerEn: string;
};

export const FAQ_CATEGORY_META: Record<
  FaqCategoryId,
  { labelKo: string; labelEn: string }
> = {
  basic: { labelKo: "기본 정보", labelEn: "Basics" },
  pricing: { labelKo: "단가/비용", labelEn: "Pricing" },
  execution: { labelKo: "집행 방법", labelEn: "Execution" },
  fandom: { labelKo: "팬덤 광고", labelEn: "Fandom ads" },
  measurement: { labelKo: "효과/측정", labelEn: "Measurement" },
};

export const FAQ_CATALOG: FaqCatalogItem[] = [
  {
    category: "basic",
    order: 0,
    questionKo: "옥외광고란 무엇인가요?",
    questionEn: "What is out-of-home (OOH) advertising?",
    answerKo:
      "옥외광고(OOH)는 지하철·버스·전광판·빌보드 등 실외·공공장소 매체에 노출하는 광고입니다. THINKAD에서는 매체별 단가와 노출 환경을 투명하게 비교할 수 있습니다.",
    answerEn:
      "OOH is advertising on outdoor and public media such as subway, buses, billboards, and digital signage. THINKAD lets you compare rates and placement transparently.",
  },
  {
    category: "basic",
    order: 1,
    questionKo: "OOH 광고와 DOOH 광고의 차이는?",
    questionEn: "What is the difference between OOH and DOOH?",
    answerKo:
      "OOH는 고정형·인쇄 매체를 포함하는 넓은 개념이고, DOOH는 디지털 스크린으로 영상·시간대 교체가 가능한 옥외 디지털 광고입니다. 싱커드에서 두 유형을 함께 검색·견적할 수 있습니다.",
    answerEn:
      "OOH covers static and print formats; DOOH is digital outdoor with video and daypart rotation. THINKAD supports search and quotes for both.",
  },
  {
    category: "basic",
    order: 2,
    questionKo: "옥외광고 효과가 있나요?",
    questionEn: "Is OOH advertising effective?",
    answerKo:
      "상권·역세권 등 반복 노출 구간에서는 브랜드 인지도와 방문 유도에 효과가 검증되어 있습니다. 지역·업종·기간에 맞는 매체 믹스가 중요하며, 싱커드 AI 플래너가 후보를 추천합니다.",
    answerEn:
      "OOH is proven for awareness and foot traffic in high-traffic districts. Media mix matters; THINKAD’s AI planner suggests options for your goals and budget.",
  },
  {
    category: "basic",
    order: 3,
    questionKo: "처음 옥외광고를 시작하려면?",
    questionEn: "How do I start my first OOH campaign?",
    answerKo:
      "목표·예산·기간을 정한 뒤 매체를 비교하고 견적을 요청하면 됩니다. 싱커드에서는 매체 탐색 → AI 플래너 → 견적·계약까지 한 플랫폼에서 진행할 수 있습니다.",
    answerEn:
      "Define goals, budget, and dates, then compare media and request quotes. On THINKAD you can browse media, use the AI planner, and move to quote and contract in one place.",
  },
  {
    category: "basic",
    order: 4,
    questionKo: "옥외광고 최소 기간은?",
    questionEn: "What is the minimum booking period?",
    answerKo:
      "매체·포맷마다 다르며 DOOH는 1주, 고정형은 2~4주가 일반적입니다. 매체 상세 페이지와 견적 단계에서 최소 집행 기간을 확인할 수 있습니다.",
    answerEn:
      "It varies by format—often 1 week for DOOH and 2–4 weeks for static. Check each media detail page and quote for minimum terms.",
  },
  {
    category: "basic",
    order: 5,
    questionKo: "싱커드는 어떤 서비스인가요?",
    questionEn: "What is THINKAD?",
    answerKo:
      "2014년부터 OOH 단가를 투명 공개해온 국내 미디어렙 플랫폼입니다. 전국 검증 매체 {count}를 탐색하고 AI 기획·견적·전자계약·집행 관리까지 광고주·대행사가 한곳에서 이용합니다.",
    answerEn:
      "THINKAD has published transparent OOH rates since 2014. Browse {count} verified media nationwide and search, plan with AI, quote, e-sign, and manage campaigns on one platform.",
  },
  {
    category: "pricing",
    order: 0,
    questionKo: "옥외광고 평균 단가는 얼마인가요?",
    questionEn: "What is the average OOH ad rate?",
    answerKo:
      "지역·규모·기간에 따라 월 수십만 원부터 수천만 원까지 다양합니다. 싱커드는 실거래 기반 단가를 공개해 예산대별 매체를 바로 필터링할 수 있습니다.",
    answerEn:
      "Rates range from hundreds of thousands to tens of millions KRW per month by area and format. THINKAD shows transaction-based prices so you can filter by budget.",
  },
  {
    category: "pricing",
    order: 1,
    questionKo: "전광판 광고 비용은?",
    questionEn: "How much does billboard / LED advertising cost?",
    answerKo:
      "도심 대형 LED는 월 수백만~수천만 원대가 흔하며, 위치·재생 시간·슬롯 수에 따라 달라집니다. 매체별 월 단가와 CPM 추정치를 카드에서 확인하세요.",
    answerEn:
      "Major urban LEDs often run millions KRW per month depending on location and slots. See monthly rate and estimated CPM on each media card.",
  },
  {
    category: "pricing",
    order: 2,
    questionKo: "지하철 광고 가격은?",
    questionEn: "How much does subway advertising cost?",
    answerKo:
      "스크린도어·조명광고·디지털 등 포맷별로 다르며 역 규모에 따라 차이가 큽니다. 싱커드에서 노선·역 단위로 단가를 비교하고 패키지 견적을 받을 수 있습니다.",
    answerEn:
      "Subway formats (PSD, lightboxes, digital) vary by station size. Compare line/station pricing on THINKAD and request package quotes.",
  },
  {
    category: "pricing",
    order: 3,
    questionKo: "버스 광고 단가는?",
    questionEn: "How much does bus advertising cost?",
    answerKo:
      "노선·차량 래핑·기간에 따라 월 단가가 책정됩니다. 버스 외부 래핑은 노출 거리 대비 비용 효율이 좋은 경우가 많아 지역 캠페인에 자주 쓰입니다.",
    answerEn:
      "Bus rates depend on route, wrap type, and duration. Exterior wraps are popular for regional campaigns with strong reach per won.",
  },
  {
    category: "pricing",
    order: 4,
    questionKo: "소예산으로도 옥외광고 가능한가요?",
    questionEn: "Can I run OOH on a small budget?",
    answerKo:
      "가능합니다. 월 50~100만 원대 소형 디지털·지역 버스·현수막 등 매체가 있습니다. 예산을 입력하면 AI 플래너가 집행 가능한 조합을 제안합니다.",
    answerEn:
      "Yes—small digital, local bus, and banner options start around ₩500K–1M/month. Enter your budget in the AI planner for feasible mixes.",
  },
  {
    category: "pricing",
    order: 5,
    questionKo: "단가 협상이 가능한가요?",
    questionEn: "Can rates be negotiated?",
    answerKo:
      "매체·기간·물량에 따라 협의가 가능한 경우가 있습니다. 싱커드 견적 요청 시 담당자가 실거래 단가 기준으로 조건을 검토해 드립니다.",
    answerEn:
      "Negotiation may be possible by volume and period. Request a quote on THINKAD and our team reviews terms against market rates.",
  },
  {
    category: "execution",
    order: 0,
    questionKo: "옥외광고 집행 절차는?",
    questionEn: "What is the OOH campaign process?",
    answerKo:
      "매체 선정 → 견적 확정 → 계약 → 소재 제출·검수 → 송출·설치 → 집행 인증 → 정산이 일반적입니다. 싱커드 대시보드에서 단계별 상태를 추적할 수 있습니다.",
    answerEn:
      "Typical flow: select media → quote → contract → creative review → go-live → proof → settlement. Track each step in the THINKAD dashboard.",
  },
  {
    category: "execution",
    order: 1,
    questionKo: "소재 규격은 어떻게 되나요?",
    questionEn: "What are creative specifications?",
    answerKo:
      "매체마다 해상도·안전영역·파일 형식이 다릅니다. 매체 상세의 소재 가이드와 견적 확정 후 제공되는 스펙 시트를 반드시 확인해 주세요.",
    answerEn:
      "Each medium has its own resolution, safe zone, and file format. Check the media detail spec guide and the sheet sent after quote confirmation.",
  },
  {
    category: "execution",
    order: 2,
    questionKo: "집행까지 얼마나 걸리나요?",
    questionEn: "How long until the campaign goes live?",
    answerKo:
      "인기 매체는 2~4주 전 예약이 필요하고, 긴급 슬롯은 1주 내 가능한 경우도 있습니다. 생일·이벤트 광고는 최소 2주 전 신청을 권장합니다.",
    answerEn:
      "Popular inventory often books 2–4 weeks ahead; some rush slots in ~1 week. For events and birthdays, apply at least 2 weeks early.",
  },
  {
    category: "execution",
    order: 3,
    questionKo: "소재 제작도 도와주나요?",
    questionEn: "Do you help with creative production?",
    answerKo:
      "기본 가이드와 검수는 제공하며, 제작 대행은 파트너사 연결 또는 별도 의뢰가 가능합니다. 업로드 전 싱커드 담당자가 규격 오류를 사전에 점검해 드립니다.",
    answerEn:
      "We provide specs and review; production can be arranged via partners. Our team checks files before upload to reduce rejections.",
  },
  {
    category: "execution",
    order: 4,
    questionKo: "여러 매체 동시 집행 가능한가요?",
    questionEn: "Can I run multiple media at once?",
    answerKo:
      "네, 패키지·멀티 매체 캠페인이 가능합니다. AI 플래너에서 지역·예산에 맞는 조합을 고르고 한 번에 견적을 요청할 수 있습니다.",
    answerEn:
      "Yes—multi-media and package campaigns are supported. Use the AI planner to pick a mix and request one combined quote.",
  },
  {
    category: "execution",
    order: 5,
    questionKo: "취소/환불 정책은?",
    questionEn: "What is the cancellation and refund policy?",
    answerKo:
      "매체별 계약 조건에 따르며, 송출·제작 착수 전과 후에 따라 환불 비율이 달라집니다. 싱커드 환불·보장 정책 페이지와 견적서 조항을 함께 확인해 주세요.",
    answerEn:
      "Terms vary by media and timing before/after production. See THINKAD refund and guarantee policy pages plus your quote terms.",
  },
  {
    category: "fandom",
    order: 0,
    questionKo: "아이돌 생일광고란?",
    questionEn: "What is a K-pop birthday ad?",
    answerKo:
      "팬클럽이 생일·데뷔일 등에 지하철·전광판 등에 응원 광고를 집행하는 OOH 캠페인입니다. 싱커드 팬덤 전용 랜딩에서 인기 매체를 모아 볼 수 있습니다.",
    answerEn:
      "Fan clubs book OOH for birthdays and debuts on subway, LEDs, and more. THINKAD’s fandom landing curates popular inventory.",
  },
  {
    category: "fandom",
    order: 1,
    questionKo: "팬덤 광고 추천 매체는?",
    questionEn: "Which media are best for fandom ads?",
    answerKo:
      "강남역·홍대·코엑스·신촌 등 팬 이동이 많은 구간의 지하철 PSD·대형 LED가 인기입니다. 타깃·예산에 맞게 싱커드에서 필터링해 비교하세요.",
    answerEn:
      "Gangnam, Hongdae, COEX, and Sinchon subway PSD and large LEDs are popular. Filter by target and budget on THINKAD.",
  },
  {
    category: "fandom",
    order: 2,
    questionKo: "생일광고 최소 예산은?",
    questionEn: "What is the minimum budget for birthday ads?",
    answerKo:
      "매체에 따라 월 50만 원대부터 가능한 슬롯이 있습니다. 짧은 기간 집행·소형 디지털은 100~300만 원대로도 시작할 수 있습니다.",
    answerEn:
      "Some slots start around ₩500K/month; short runs on small digital often fit ₩1–3M total.",
  },
  {
    category: "fandom",
    order: 3,
    questionKo: "아이돌 사진 소재 사용 가능한가요?",
    questionEn: "Can I use idol photos in creatives?",
    answerKo:
      "팬 제작 소재는 매체·저작권 정책에 따라 가능한 경우가 많습니다. 제출 전 싱커드에서 매체사 가이드와 금지 요소를 함께 검토해 드립니다.",
    answerEn:
      "Fan-made art is often allowed per media policy. THINKAD reviews media rules and restricted elements before submission.",
  },
  {
    category: "fandom",
    order: 4,
    questionKo: "생일 당일에만 집행 가능한가요?",
    questionEn: "Can ads run only on the birthday?",
    answerKo:
      "대부분 최소 1주 단위 집행이며, 생일 전후 1~2주 노출로 응원 효과를 극대화하는 경우가 많습니다. 원하는 일정은 견적 시 협의 가능합니다.",
    answerEn:
      "Most formats need at least a week; many fans book the week around the date. Discuss exact dates in your quote request.",
  },
  {
    category: "fandom",
    order: 5,
    questionKo: "인증 사진 제공하나요?",
    questionEn: "Do you provide proof photos?",
    answerKo:
      "네, 집행 후 현장 인증 사진을 제공합니다. 고화질 파일은 SNS·팬 커뮤니티 공유용으로 별도 전달되는 경우가 많습니다.",
    answerEn:
      "Yes—we provide on-site proof photos after go-live, often in high resolution for SNS and fan communities.",
  },
  {
    category: "measurement",
    order: 0,
    questionKo: "옥외광고 효과를 어떻게 측정하나요?",
    questionEn: "How is OOH performance measured?",
    answerKo:
      "노출 추정·유동인구·상권 데이터와 검색·방문 uplift, 프로모션 코드 등을 결합합니다. 싱커드 리포트에서 캠페인별 지표를 정리해 드립니다.",
    answerEn:
      "We combine estimated impressions, foot traffic, and uplift via search, visits, or promo codes. THINKAD reports summarize campaign metrics.",
  },
  {
    category: "measurement",
    order: 1,
    questionKo: "CPM이란 무엇인가요?",
    questionEn: "What is CPM?",
    answerKo:
      "Cost Per Mille—1,000회 노출당 비용입니다. OOH는 추정 노출 기준 CPM으로 매체 간 효율을 비교할 때 자주 씁니다. 매체 카드에서 참고 CPM을 확인할 수 있습니다.",
    answerEn:
      "Cost per thousand impressions. OOH often uses estimated impressions to compare efficiency across media on each card.",
  },
  {
    category: "measurement",
    order: 2,
    questionKo: "노출수 데이터를 제공하나요?",
    questionEn: "Do you provide impression data?",
    answerKo:
      "매체별로 실측·추정 노출 데이터를 제공하며, 출처와 산출 방식을 함께 표기합니다. DOOH는 송출 로그 기반 리포트가 가능한 경우도 있습니다.",
    answerEn:
      "We show measured or estimated impressions per medium with methodology notes. Some DOOH includes play logs.",
  },
  {
    category: "measurement",
    order: 3,
    questionKo: "디지털 광고와 병행하면 효과적인가요?",
    questionEn: "Is OOH effective with digital ads?",
    answerKo:
      "온·오프라인 병행 시 인지도와 검색·전환 시너지가 큽니다. OOH에서 본 메시지를 디지털 리타겟으로 연결하는 통합 전략을 가이드에서 다룹니다.",
    answerEn:
      "Combining OOH with digital boosts awareness and search/conversion. Our guides cover integrated on-offline playbooks.",
  },
  {
    category: "measurement",
    order: 4,
    questionKo: "캠페인 보고서를 받을 수 있나요?",
    questionEn: "Can I get a campaign report?",
    answerKo:
      "집행 완료 후 노출·사진·요약 지표가 포함된 리포트를 제공합니다. PRO·엔터프라이즈 플랜에서는 PDF·대시보드 상세 리포트를 이용할 수 있습니다.",
    answerEn:
      "Post-campaign reports include impressions, photos, and summary KPIs. PRO plans add PDF and dashboard detail.",
  },
  {
    category: "measurement",
    order: 5,
    questionKo: "재집행 할인이 있나요?",
    questionEn: "Are there discounts for repeat bookings?",
    answerKo:
      "동일 매체·장기 계약·연간 패키지에 따라 할인이 적용될 수 있습니다. 재집행 시 담당자에게 이전 캠페인 번호를 알려주시면 조건을 검토합니다.",
    answerEn:
      "Repeat, long-term, and annual packages may qualify for discounts. Share your prior campaign ID when rebooking for review.",
  },
];

export const FAQ_CATEGORY_ORDER: FaqCategoryId[] = [
  "basic",
  "pricing",
  "execution",
  "fandom",
  "measurement",
];
