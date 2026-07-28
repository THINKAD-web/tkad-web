export type HomePrecisionExample = {
  region: string;
  target: string;
  goal: string;
  budget: string;
  /** 자연어 한 줄 — AI 추천 입력과 동일 형식 */
  query: string;
};

export const HOME_PRECISION_EXAMPLES: Record<
  "ko" | "en",
  HomePrecisionExample[]
> = {
  ko: [
    {
      region: "강남",
      target: "2030",
      goal: "브랜딩",
      budget: "3,000만원",
      query: "강남 2030 브랜딩 3000만원",
    },
    {
      region: "홍대·연남",
      target: "MZ",
      goal: "신제품 런칭",
      budget: "5,000만원",
      query: "홍대 MZ 신제품 런칭 5000만원",
    },
    {
      region: "강북",
      target: "4050",
      goal: "병원 홍보",
      budget: "2,000만원",
      query: "강북 4050 병원 홍보 2000만원",
    },
    {
      region: "판교·분당",
      target: "B2B",
      goal: "SaaS 리드",
      budget: "1억원",
      query: "판교 B2B SaaS 리드 1억",
    },
    {
      region: "전국",
      target: "3040",
      goal: "F&B 매장",
      budget: "8,000만원",
      query: "전국 3040 F&B 매장홍보 8000만원",
    },
    {
      region: "부산 해운대",
      target: "2030",
      goal: "관광·축제",
      budget: "4,500만원",
      query: "부산 해운대 2030 관광 4500만원",
    },
  ],
  en: [
    {
      region: "Gangnam",
      target: "20s–30s",
      goal: "Branding",
      budget: "₩30M",
      query: "Gangnam 20s–30s branding ₩30M",
    },
    {
      region: "Hongdae",
      target: "Gen Z",
      goal: "Product launch",
      budget: "₩50M",
      query: "Hongdae Gen Z product launch ₩50M",
    },
    {
      region: "North Seoul",
      target: "40s–50s",
      goal: "Healthcare",
      budget: "₩20M",
      query: "North Seoul 40s–50s healthcare ₩20M",
    },
    {
      region: "Pangyo",
      target: "B2B",
      goal: "SaaS leads",
      budget: "₩100M",
      query: "Pangyo B2B SaaS leads ₩100M",
    },
    {
      region: "Nationwide",
      target: "30s–40s",
      goal: "F&B stores",
      budget: "₩80M",
      query: "Nationwide 30s–40s F&B stores ₩80M",
    },
    {
      region: "Busan Haeundae",
      target: "20s–30s",
      goal: "Tourism",
      budget: "₩45M",
      query: "Busan Haeundae 20s–30s tourism ₩45M",
    },
  ],
};
