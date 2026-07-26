/**
 * FAQ 데이터 — server / client 양쪽에서 import 가능 (외부 의존 없음).
 * `app/[locale]/faq/page.tsx` (UI) + `app/[locale]/faq/layout.tsx` (FAQPage JSON-LD) 공유.
 */

import { injectMediaCountPlaceholder } from "@/lib/media-count-copy";

export type FaqCategory = "ad" | "process" | "cost" | "other";

export type FaqItem = {
  id: string;
  category: FaqCategory;
  questionKo: string;
  questionEn: string;
  answerKo: string;
  answerEn: string;
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "1",
    category: "ad",
    questionKo: "옥외광고는 어떤 종류가 있나요?",
    questionEn: "What types of outdoor advertising are available?",
    answerKo:
      "빌보드, 디지털 사이니지, 지하철 광고, 버스 광고, 전광판 등 다양한 종류가 있습니다. 싱커드는 전국 {count} 검증 매체를 카탈로그로 연결해 캠페인 목표에 맞는 최적의 매체를 추천해 드립니다.",
    answerEn:
      "We offer billboards, digital signage, subway ads, bus ads, LED displays, and more. THINKAD connects {count} verified media nationwide in our catalog and recommends the best fit for your campaign goals.",
  },
  {
    id: "2",
    category: "ad",
    questionKo: "전국 단위 OOH 캠페인도 가능한가요?",
    questionEn: "Do you handle nationwide OOH campaigns across Korea?",
    answerKo:
      "네, 가능합니다. 싱커드는 서울·수도권은 물론 광역시와 주요 관광지를 아우르는 검증 매체 네트워크를 바탕으로 전국 단위 OOH 캠페인을 기획·대행합니다.",
    answerEn:
      "Yes. THINKAD plans and brokers nationwide OOH campaigns across Seoul, the capital area, major cities, and key tourist destinations through a verified media network.",
  },
  {
    id: "3",
    category: "ad",
    questionKo: "광고 효과는 어떻게 측정하나요?",
    questionEn: "How do you measure advertising effectiveness?",
    answerKo:
      "유동인구 분석, 노출도 측정, 브랜드 인지도 조사, QR코드 트래킹 등 다양한 방법으로 캠페인 효과를 측정합니다. 캠페인 종료 후 상세 리포트를 제공합니다.",
    answerEn:
      "We measure campaign effectiveness through foot traffic analysis, exposure measurement, brand awareness surveys, QR code tracking, and more. Detailed reports are provided after campaign completion.",
  },
  {
    id: "4",
    category: "process",
    questionKo: "광고 진행 절차는 어떻게 되나요?",
    questionEn: "What is the advertising process?",
    answerKo:
      "1) 초기 상담 및 니즈 파악 → 2) 매체 추천 및 캠페인 전략 수립 → 3) 견적 및 계약 → 4) 크리에이티브 제작 → 5) 매체 설치 및 집행 → 6) 모니터링 및 리포팅 순서로 진행됩니다.",
    answerEn:
      "The process includes: 1) Initial consultation → 2) Media recommendation & strategy → 3) Quote & contract → 4) Creative production → 5) Media installation & execution → 6) Monitoring & reporting.",
  },
  {
    id: "5",
    category: "process",
    questionKo: "상담부터 광고 집행까지 얼마나 걸리나요?",
    questionEn: "How long does it take from consultation to execution?",
    answerKo:
      "일반적으로 2~4주 정도 소요됩니다. 긴급 캠페인의 경우 1주일 내 진행도 가능하며, 대규모 전국 캠페인은 4~6주를 권장합니다.",
    answerEn:
      "Typically 2-4 weeks. For urgent campaigns, 1-week turnaround is possible. For large-scale national campaigns, 4-6 weeks is recommended.",
  },
  {
    id: "6",
    category: "process",
    questionKo: "크리에이티브 제작도 해주시나요?",
    questionEn: "Do you handle creative production?",
    answerKo:
      "네, 전문 디자인팀이 매체 규격에 맞는 크리에이티브를 제작해 드립니다. 기존 소재 활용도 가능하며, 디지털 매체의 경우 동영상 제작도 지원합니다.",
    answerEn:
      "Yes, our professional design team creates creatives tailored to media specifications. You can also use existing materials, and we support video production for digital media.",
  },
  {
    id: "7",
    category: "cost",
    questionKo: "광고 비용은 얼마인가요?",
    questionEn: "How much does advertising cost?",
    answerKo:
      "매체 종류, 위치, 크기, 기간에 따라 비용이 다릅니다. 월 500만원부터 대형 전광판 월 수천만원까지 다양합니다. 정확한 비용은 무료 상담을 통해 안내받으실 수 있습니다.",
    answerEn:
      "Costs vary by media type, location, size, and duration, ranging from ₩5M/month to tens of millions for large LED displays. Contact us for a free consultation for accurate pricing.",
  },
  {
    id: "8",
    category: "cost",
    questionKo: "최소 광고 기간이 있나요?",
    questionEn: "Is there a minimum advertising period?",
    answerKo:
      "매체에 따라 다르지만, 대부분 최소 1개월부터 가능합니다. 디지털 매체는 1~2주 단기 캠페인도 가능합니다. 장기 계약 시 할인 혜택이 있습니다.",
    answerEn:
      "It varies by media, but most allow a minimum of 1 month. Digital media can run 1-2 week short campaigns. Long-term contracts receive discount benefits.",
  },
  {
    id: "9",
    category: "cost",
    questionKo: "결제 방법은 어떻게 되나요?",
    questionEn: "What payment methods are available?",
    answerKo:
      "세금계산서 발행 기반의 계좌이체가 기본이며, 법인카드 결제도 가능합니다. 캠페인 규모에 따라 분할 납부도 협의 가능합니다.",
    answerEn:
      "Bank transfer with tax invoice is standard, and corporate card payment is also available. Installment payments can be arranged for larger campaigns.",
  },
  {
    id: "10",
    category: "other",
    questionKo: "싱커드만의 차별점은 무엇인가요?",
    questionEn: "What makes THINKAD different?",
    answerKo:
      "모든 매체를 직접 현장 방문하여 검증하고, 1년 이상 축적된 효과 데이터를 기반으로 매체를 추천합니다. 계약부터 사후관리까지 원스톱으로 대행하며, 데이터 기반의 투명한 리포팅을 제공합니다.",
    answerEn:
      "We personally visit and verify every media site, recommend media based on 1+ years of performance data, broker one-stop service from contract to post-care, and provide transparent data-driven reporting.",
  },
  {
    id: "11",
    category: "other",
    questionKo: "소규모 예산으로도 광고가 가능한가요?",
    questionEn: "Can I advertise with a small budget?",
    answerKo:
      "네, 예산에 맞는 최적의 매체 조합을 추천해 드립니다. 디지털 사이니지나 지역 빌보드 등 비용 효율적인 매체를 활용하면 소규모 예산으로도 효과적인 캠페인을 진행할 수 있습니다.",
    answerEn:
      "Yes, we recommend optimal media mixes within your budget. Using cost-effective media like digital signage or local billboards, you can run effective campaigns even with a small budget.",
  },
  {
    id: "12",
    category: "other",
    questionKo: "이전 캠페인 사례를 볼 수 있나요?",
    questionEn: "Can I see previous campaign examples?",
    answerKo:
      "네, 웹사이트의 '성공 사례' 페이지에서 다양한 업종의 캠페인 성과를 확인하실 수 있습니다. 더 자세한 사례는 무료 상담 시 맞춤형으로 안내해 드립니다.",
    answerEn:
      "Yes, you can view campaign results from various industries on our Case Studies page. More detailed examples can be provided during a free consultation.",
  },
];

export function applyFaqMediaCount(
  items: FaqItem[],
  verifiedMediaLabel: string,
): FaqItem[] {
  return items.map((item) => ({
    ...item,
    answerKo: injectMediaCountPlaceholder(item.answerKo, verifiedMediaLabel),
    answerEn: injectMediaCountPlaceholder(item.answerEn, verifiedMediaLabel),
  }));
}
