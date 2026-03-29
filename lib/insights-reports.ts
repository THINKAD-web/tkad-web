export type InsightVerticalTag = "general" | "fashion" | "auto" | "fb";

export type InsightsPeriodType = "monthly" | "quarterly";

export type VerticalStrategyBlock = {
  labelKo: string;
  labelEn: string;
  bulletsKo: string[];
  bulletsEn: string[];
};

export type InsightReport = {
  id: string;
  period: InsightsPeriodType;
  labelKo: string;
  labelEn: string;
  titleKo: string;
  titleEn: string;
  publishedIso: string;
  summaryKo: string[];
  summaryEn: string[];
  marketTrendKo: string[];
  marketTrendEn: string[];
  doohKo: string[];
  doohEn: string[];
  verticalBlocks: readonly VerticalStrategyBlock[];
  pdfBaseName: string;
  verticalTags: readonly InsightVerticalTag[];
};

export const INSIGHT_REPORTS: readonly InsightReport[] = [
  {
    id: "insight-2026-02",
    period: "monthly",
    labelKo: "2026년 2월",
    labelEn: "February 2026",
    titleKo: "한국 OOH 시장 스냅샷 — 도심 회복과 DOOH 심화",
    titleEn: "Korea OOH Market Snapshot — Urban Recovery & DOOH Depth",
    publishedIso: "2026-02-28",
    verticalTags: ["general", "fashion"],
    pdfBaseName: "thinkad-ooh-insight-2026-02",
    summaryKo: [
      "주요 상권 유동인구가 설 연휴 이후 기준치 대비 안정적으로 회복 중이며, 야간·주말 슬롯 경쟁이 재개되었습니다.",
      "패션·뷰티는 강남·성수 축 디지털 패널 중심으로 소재 교체 주기가 단축되는 추세입니다.",
    ],
    summaryEn: [
      "Foot traffic in core districts normalized post-holiday; prime night and weekend slots are competitive again.",
      "Fashion & beauty advertisers are shortening creative cycles on Gangnam and Seongsu digital panels.",
    ],
    marketTrendKo: [
      "전국 기준 옥외 노출 요청은 전월 대비 +4.2% 추정(데모 수치)이며, 수도권 비중이 62% 전후를 유지합니다.",
      "대형 빌보드는 브랜드 런칭, 디지털은 퍼포먼스·리타겟 연계 목적의 RFP가 증가했습니다.",
    ],
    marketTrendEn: [
      "Nationwide OOH briefing volume is estimated up ~4.2% MoM (demo figure); the capital region stays near 62% share.",
      "Billboards skew to launches; digital RFPs increasingly cite performance and retargeting bridges.",
    ],
    doohKo: [
      "프로그래매틱 DOOH 문의가 전분기 대비 증가했으며, 날씨·시간대 타기팅을 요구하는 브리프가 두드러집니다.",
      "지하철·버스 디지털은 재생 검증(노출·재생 구간) 데이터 제출이 계약 전 필수 조건으로 자리잡는 중입니다.",
    ],
    doohEn: [
      "Programmatic DOOH briefs are up vs last quarter; weather- and daypart-aware plans are common asks.",
      "Transit digital now often requires proof-of-play and interval logs before contract signature.",
    ],
    verticalBlocks: [
      {
        labelKo: "패션·뷰티",
        labelEn: "Fashion & beauty",
        bulletsKo: [
          "강남·홍대 축에서 ‘룩북 영상 6–15초’ 포맷이 표준화되고 있습니다.",
          "팝업 연계 시 쉘터·근거리 OOH를 세트로 묶는 미디어 믹스가 증가합니다.",
        ],
        bulletsEn: [
          "6–15s lookbook cuts are becoming the default on Gangnam and Hongdae digital networks.",
          "Pop-up tie-ins increasingly bundle shelters and proximity OOH as one buy.",
        ],
      },
      {
        labelKo: "F&B",
        labelEn: "F&B",
        bulletsKo: [
          "점심·저녁 피크에 맞춘 지하철 DID 집행이 신규 매장 오픈 캠페인에서 반복됩니다.",
          "배달앱과의 QR 연계는 거리 광고보다 버스·지하철 환승 구간에서 전환이 높게 관측됩니다.",
        ],
        bulletsEn: [
          "Subway DID at lunch and dinner peaks is a recurring pattern for store openings.",
          "QR bridges to delivery apps tend to perform better at transfer hubs than on street furniture alone.",
        ],
      },
    ],
  },
  {
    id: "insight-2026-01",
    period: "monthly",
    labelKo: "2026년 1월",
    labelEn: "January 2026",
    titleKo: "연초 미디어 믹스 — 자동차·전장 브랜드의 OOH 복귀",
    titleEn: "Early-Year Mix — Automotive & EV Brands Return to OOH",
    publishedIso: "2026-01-31",
    verticalTags: ["general", "auto"],
    pdfBaseName: "thinkad-ooh-insight-2026-01",
    summaryKo: [
      "전기차 라인업 확대에 맞춰 전시·시승 거점 주변 OOH가 다시 활성화되었습니다.",
      "연초 예산 편성으로 분기 단위 RFP가 집중되며, 협상 기간이 다소 길어지는 경향이 있습니다.",
    ],
    summaryEn: [
      "EV line-ups are driving renewed spend around experience centers and test-drive hubs.",
      "Q-bound RFP clustering at year-start is lengthening negotiation cycles slightly.",
    ],
    marketTrendKo: [
      "고속도로 및 간선도로 인접 빌보드 문의가 전분기 대비 증가했습니다.",
      "디지털은 ‘전시장 반경 3km’ 지오펜스형 제안이 표준화되고 있습니다.",
    ],
    marketTrendEn: [
      "Highway-adjacent billboard inquiries rose vs the prior quarter.",
      "Digital proposals increasingly standardize a 3km geo-radius around showrooms.",
    ],
    doohKo: [
      "전기차 브랜드는 야간 풀 컬러 LED에서 VMS(가변 메시지)와 혼합 집행을 검토하는 사례가 늘었습니다.",
      "데이터 피드 연동(재고·프로모션)은 아직 파일럿 단계이나 테스트 캠페인 문의가 발생했습니다.",
    ],
    doohEn: [
      "EV brands are mixing full-color night LEDs with variable-message formats in tests.",
      "Data-fed promos (inventory-linked) are pilot-only but showing up in exploratory briefs.",
    ],
    verticalBlocks: [
      {
        labelKo: "자동차",
        labelEn: "Automotive",
        bulletsKo: [
          "시승 예약 전환을 KPI로 명시한 브리프가 증가했습니다.",
          "코엑스·자동차 박람회 일정에 맞춘 버스트 집행이 반복됩니다.",
        ],
        bulletsEn: [
          "More briefs name test-drive bookings as a primary KPI.",
          "Burst flights around COEX and auto show calendars are recurring.",
        ],
      },
      {
        labelKo: "일반 시장",
        labelEn: "General market",
        bulletsKo: [
          "올해 상반기 디지털 OOH 단가는 수요 회복에 따라 소폭 상승 압력이 있습니다.",
        ],
        bulletsEn: [
          "First-half digital OOH pricing faces mild upward pressure as demand normalizes.",
        ],
      },
    ],
  },
  {
    id: "insight-2025-q4",
    period: "quarterly",
    labelKo: "2025년 4분기",
    labelEn: "Q4 2025",
    titleKo: "분기 리포트 — 연말 성수기와 F&B·리테일 OOH",
    titleEn: "Quarterly — Year-End Peak & F&B / Retail OOH",
    publishedIso: "2025-12-18",
    verticalTags: ["general", "fb"],
    pdfBaseName: "thinkad-ooh-insight-2025-q4",
    summaryKo: [
      "연말 프로모션 기간 F&B와 리테일이 옥외 예산의 약 38%를 차지(데모 분포)했습니다.",
      "크리스마스·연말 시즌 야간 슬롯 프리미엄이 분기 최고치를 기록했습니다.",
    ],
    summaryEn: [
      "F&B and retail accounted for roughly 38% of year-end OOH budgets in our demo sample.",
      "Night-slot premiums peaked for the quarter around the holiday window.",
    ],
    marketTrendKo: [
      "번들 상품(디지털+쉘터+지하철) 제안 비중이 전년 동기 대비 증가했습니다.",
      "지역 상권형 캠페인은 부산·대구 광역 중심가에서 서울 외 성장을 보였습니다.",
    ],
    marketTrendEn: [
      "Bundled offers (digital + shelter + subway) grew vs the same period last year.",
      "Regional retail campaigns showed notable growth in Busan and Daegu cores.",
    ],
    doohKo: [
      "DOOH에서 연말 카운트다운·타임스탬프 크리에이티브 채택률이 높았습니다.",
      "재생 검증 리포트를 PDF로 자동 납품하는 형태가 거래 조건에 포함되는 사례가 늘었습니다.",
    ],
    doohEn: [
      "Countdown and timestamp-led DOOH creatives were widely adopted for the holidays.",
      "Auto-generated PDF proof-of-play packs appeared more often in deal terms.",
    ],
    verticalBlocks: [
      {
        labelKo: "F&B",
        labelEn: "F&B",
        bulletsKo: [
          "프랜차이즈 본사 주도 전국 패키지와 단일 매장 로컬 패키지가 이원화되었습니다.",
          "딜리버리 앱 프로모션은 교통 매체와의 동시 집행이 증가했습니다.",
        ],
        bulletsEn: [
          "HQ-led national packs diverged from single-store local mixes.",
          "Delivery promos increasingly co-booked with transit media.",
        ],
      },
    ],
  },
  {
    id: "insight-2025-q3",
    period: "quarterly",
    labelKo: "2025년 3분기",
    labelEn: "Q3 2025",
    titleKo: "분기 리포트 — DOOH 투자와 측정 표준화",
    titleEn: "Quarterly — DOOH Investment & Measurement Standards",
    publishedIso: "2025-09-22",
    verticalTags: ["general"],
    pdfBaseName: "thinkad-ooh-insight-2025-q3",
    summaryKo: [
      "프로그래매틱 파트너십 논의가 브랜드·에이전시 미팅 아젠다 상위권을 차지했습니다.",
      "노출·주목·브랜드 리프트를 묶은 ‘통합 리포트’ 요청이 증가했습니다.",
    ],
    summaryEn: [
      "Programmatic partnerships ranked high on brand and agency meeting agendas.",
      "Unified reporting (exposure, attention, brand lift) was a rising ask.",
    ],
    marketTrendKo: [
      "전통 빌보드는 장기 계약 비중이 유지되는 한편, 디지털은 4–8주 단기 플라이트가 주류입니다.",
      "AI 기반 소재 최적화는 파일럿 단계에서 크리에이티브 에이전시와 협업하는 형태가 많습니다.",
    ],
    marketTrendEn: [
      "Classic billboards kept long tenures while digital skewed to 4–8 week flights.",
      "AI-led creative optimization pilots often paired with creative agency partners.",
    ],
    doohKo: [
      "오픈 RTB형 거래는 제한적이나, PMP·프라이빗 딜 형태의 예약 재고가 늘었습니다.",
      "지하철·버스 화면의 SSP 연동이 수도권 일부 노선에서 확대되었습니다.",
    ],
    doohEn: [
      "Open RTB remains limited; private marketplace-style reserved DOOH grew.",
      "SSP-linked transit screens expanded on select capital-region lines.",
    ],
    verticalBlocks: [
      {
        labelKo: "크로스 업종",
        labelEn: "Cross-vertical",
        bulletsKo: [
          "테크·금융은 ‘신뢰·안전’ 메시지와 야간 가시성을 동시에 요구하는 경우가 많았습니다.",
          "엔터테인먼트는 오프닝 주간 버스트 + 디지털 리타겟 조합이 반복됐습니다.",
        ],
        bulletsEn: [
          "Tech and finance often paired trust messaging with night visibility needs.",
          "Entertainment repeated opening-week bursts plus digital retargeting bridges.",
        ],
      },
    ],
  },
];

export type PeriodFilter = "all" | InsightsPeriodType;

export type VerticalFilter = "all" | InsightVerticalTag;

export function filterInsightReports(
  reports: readonly InsightReport[],
  period: PeriodFilter,
  vertical: VerticalFilter,
): InsightReport[] {
  return reports.filter((r) => {
    if (period !== "all" && r.period !== period) return false;
    if (vertical === "all") return true;
    return r.verticalTags.includes(vertical) || r.verticalTags.includes("general");
  });
}
