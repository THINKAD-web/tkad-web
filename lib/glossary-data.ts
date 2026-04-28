/**
 * 옥외광고 용어집 (`/glossary`).
 *
 * 한국 광고주 / 마케터가 OOH 캠페인 기획·견적 시 자주 마주치는 용어를 정의.
 * 검색엔진 (Google / Naver) 의 long-tail 키워드 노출 + DefinedTermSet JSON-LD
 * 로 리치 결과 후보 (Google "people also ask" 박스 진입 가능).
 *
 * server / client 양쪽 import 가능 — 외부 의존 없음.
 *
 * 신뢰성 정책:
 *   - 모든 정의는 업계 표준 용어 그대로 (네이버 / Google / Wikipedia / IAB 정의 기반)
 *   - "추정", "의견" 같은 주관적 표현 X — 객관 사실만
 *   - 추후 편집자 검수 후 추가/수정 — 신규 용어는 PR 로 추가
 */

export type GlossaryCategory =
  | "media-type"
  | "metric"
  | "process"
  | "tech"
  | "buying";

export type GlossaryTerm = {
  id: string;
  category: GlossaryCategory;
  /** 메인 한글 표제어 */
  term: string;
  /** 영문 명칭 (있을 때만) */
  termEn?: string;
  /** 약어 / 풀네임 (예: CPM = Cost Per Mille) */
  abbreviationFull?: string;
  /** 검색용 동의어 / 변형 표기 */
  aliases?: string[];
  /** 한글 정의 (1-3 문장) */
  definitionKo: string;
  /** 영문 정의 */
  definitionEn: string;
  /** 관련 용어 ID 목록 */
  related?: string[];
};

export const GLOSSARY_CATEGORIES: Record<
  GlossaryCategory,
  { ko: string; en: string }
> = {
  "media-type": { ko: "매체 유형", en: "Media types" },
  metric: { ko: "지표·측정", en: "Metrics" },
  process: { ko: "집행·운영", en: "Process" },
  tech: { ko: "기술·플랫폼", en: "Technology" },
  buying: { ko: "구매·계약", en: "Buying & contract" },
};

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  // ── 매체 유형 ──
  {
    id: "ooh",
    category: "media-type",
    term: "OOH",
    termEn: "Out-of-Home Advertising",
    abbreviationFull: "Out-of-Home",
    aliases: ["옥외광고", "Out of Home"],
    definitionKo:
      "가정 밖 공간에서 노출되는 모든 광고 매체의 총칭. 빌보드, 디지털 사이니지, 교통 광고, 공공시설 광고 등을 포함합니다.",
    definitionEn:
      "Umbrella term for all advertising media that reaches consumers outside the home — billboards, digital signage, transit, public-space ads, etc.",
    related: ["dooh", "billboard", "digital-signage"],
  },
  {
    id: "dooh",
    category: "media-type",
    term: "DOOH",
    termEn: "Digital Out-of-Home",
    abbreviationFull: "Digital Out-of-Home",
    aliases: ["디지털 옥외광고", "디지털 OOH"],
    definitionKo:
      "디스플레이·LED 등 디지털 화면을 통한 옥외광고. 시간대·요일·날씨 등 동적 트리거에 따라 크리에이티브를 변경할 수 있습니다.",
    definitionEn:
      "Out-of-home advertising delivered via digital screens (LCD/LED). Creative can change dynamically based on time, day, weather, or audience signals.",
    related: ["ooh", "digital-signage", "programmatic-dooh"],
  },
  {
    id: "billboard",
    category: "media-type",
    term: "빌보드",
    termEn: "Billboard",
    aliases: ["옥외 빌보드", "대형 옥외광고"],
    definitionKo:
      "도로변·고속도로·옥상 등에 설치된 대형 OOH 광고판. 정적 인쇄물(static)이거나 디지털(LED) 일 수 있습니다.",
    definitionEn:
      "Large OOH advertising panel installed roadside, on highways, or on rooftops. Can be static (printed) or digital (LED).",
    related: ["dooh", "ooh"],
  },
  {
    id: "digital-signage",
    category: "media-type",
    term: "디지털 사이니지",
    termEn: "Digital Signage",
    aliases: ["디지털 디스플레이", "전광판"],
    definitionKo:
      "쇼핑몰·지하철·버스정류장 등 공공장소에 설치된 디지털 디스플레이 매체. 콘텐츠를 원격으로 송출·관리할 수 있습니다.",
    definitionEn:
      "Digital display media installed in public spaces (malls, subways, bus stops). Content can be managed and broadcast remotely.",
    related: ["dooh", "transit-ad"],
  },
  {
    id: "transit-ad",
    category: "media-type",
    term: "교통광고",
    termEn: "Transit Advertising",
    aliases: ["버스 광고", "지하철 광고", "택시 광고"],
    definitionKo:
      "버스·지하철·택시 등 대중교통 차량 또는 정류장·역사에 부착되는 광고. 일상 동선에서 반복 노출이 강점입니다.",
    definitionEn:
      "Advertising on or around public transit vehicles (buses, subways, taxis) and stations. High repeat exposure in daily commute paths.",
    related: ["ooh", "subway-ad"],
  },
  {
    id: "subway-ad",
    category: "media-type",
    term: "지하철 광고",
    termEn: "Subway Advertising",
    aliases: ["역사 광고", "지하철 사이니지"],
    definitionKo:
      "지하철 역사·차량 내부·스크린도어에 부착되는 광고. 출퇴근 시간대 통행객에게 높은 도달률을 보입니다.",
    definitionEn:
      "Advertising in subway stations, train interiors, or platform screen doors. High reach during commute hours.",
    related: ["transit-ad"],
  },
  {
    id: "led-display",
    category: "media-type",
    term: "전광판",
    termEn: "LED Display",
    aliases: ["LED 전광판", "LED 사이니지"],
    definitionKo:
      "LED 픽셀로 구성된 대형 디지털 디스플레이. 명동·강남·코엑스 등 도심 핵심 상권에서 광고주 노출 효과가 가장 큰 매체 중 하나입니다.",
    definitionEn:
      "Large digital display built from LED pixels. Among the highest-impact OOH formats in core commercial districts (Myeongdong, Gangnam, COEX).",
    related: ["dooh", "billboard"],
  },

  // ── 지표·측정 ──
  {
    id: "cpm",
    category: "metric",
    term: "CPM",
    termEn: "Cost Per Mille",
    abbreviationFull: "Cost Per Mille (per thousand impressions)",
    aliases: ["천 노출당 단가"],
    definitionKo:
      "1,000회 노출(impressions) 당 광고 비용. OOH 효율을 디지털·TV 매체와 비교할 때 사용하는 표준 지표입니다. 계산식: (총 비용 / 총 노출수) × 1,000.",
    definitionEn:
      "Cost per thousand impressions. Standard metric to compare OOH efficiency against digital and TV media. Formula: (total cost / total impressions) × 1,000.",
    related: ["impressions", "reach", "frequency"],
  },
  {
    id: "impressions",
    category: "metric",
    term: "임프레션",
    termEn: "Impressions",
    aliases: ["노출", "노출수"],
    definitionKo:
      "광고가 노출된 총 횟수. OOH 에서는 매체 앞 통행 인구(유동인구) × 인지율(awareness rate) 로 추정합니다. 동일인 반복 노출도 각각 카운트.",
    definitionEn:
      "Total times an ad is displayed. In OOH, typically estimated as foot/vehicle traffic × awareness rate. Repeat exposures by the same person are counted separately.",
    related: ["reach", "frequency", "cpm"],
  },
  {
    id: "reach",
    category: "metric",
    term: "도달",
    termEn: "Reach",
    aliases: ["도달률", "Reach"],
    definitionKo:
      "캠페인 기간 동안 광고를 1회 이상 본 *순(고유) 인원수*. 동일인 반복 노출은 1회로 카운트. 도달률(%) = 도달 인원 / 전체 타깃 인구 × 100.",
    definitionEn:
      "Number of unique people who saw the ad at least once during the campaign. Reach % = unique reached / total target population × 100.",
    related: ["impressions", "frequency", "grp"],
  },
  {
    id: "frequency",
    category: "metric",
    term: "빈도",
    termEn: "Frequency",
    aliases: ["평균 노출 빈도"],
    definitionKo:
      "캠페인 기간 중 한 사람이 광고를 평균 몇 회 보는가. OOH 평균 빈도는 매체 유형·동선에 따라 주당 4-8회 수준이 일반적입니다.",
    definitionEn:
      "Average number of times one person sees the ad during the campaign. OOH typically ranges from 4-8 exposures per week depending on format and commute path.",
    related: ["reach", "grp"],
  },
  {
    id: "grp",
    category: "metric",
    term: "GRP",
    termEn: "Gross Rating Point",
    abbreviationFull: "Gross Rating Points",
    aliases: ["총 노출 점수"],
    definitionKo:
      "도달률(%) × 빈도. 캠페인의 총 노출 강도를 나타내는 지표로, GRP 100 = 타깃 인구 대비 100% 노출 (예: 50% 도달 × 평균 2회 빈도).",
    definitionEn:
      "Reach % × Frequency. Total exposure intensity. GRP 100 = 100% of target population (e.g. 50% reach × 2 frequency).",
    related: ["reach", "frequency"],
  },
  {
    id: "viewability",
    category: "metric",
    term: "시인성",
    termEn: "Viewability",
    aliases: ["가시성", "시인성 점수"],
    definitionKo:
      "광고가 실제로 *볼 수 있는 환경*에 노출되는 비율. 거리·시야각·조도·차량 속도·주변 시각적 잡음 등을 종합해 점수화합니다.",
    definitionEn:
      "Share of impressions that occur in a viewable environment. Scored from distance, viewing angle, lighting, vehicle speed, and visual clutter.",
    related: ["impressions"],
  },
  {
    id: "footfall",
    category: "metric",
    term: "유동인구",
    termEn: "Foot Traffic / Footfall",
    aliases: ["통행량", "통행 인구"],
    definitionKo:
      "특정 위치를 지나는 사람·차량의 시간당·일평균 수치. 통신사 빅데이터, 카드사 결제, 지자체 보행 조사 등을 합성한 추정치를 주로 사용합니다.",
    definitionEn:
      "Number of people or vehicles passing a location per hour/day. Estimated from telco big-data, card-spend data, and pedestrian surveys.",
    related: ["impressions", "viewability"],
  },

  // ── 집행·운영 ──
  {
    id: "campaign-period",
    category: "process",
    term: "집행 기간",
    termEn: "Campaign Period",
    aliases: ["송출 기간", "광고 기간"],
    definitionKo:
      "광고가 실제로 게재되는 시작일부터 종료일까지. OOH 는 매체별 최소 단위가 다르며 (월 단위가 일반적), 디지털 매체는 1주 단위 단기 집행도 가능합니다.",
    definitionEn:
      "Start to end dates when the ad is actively running. Most OOH media use monthly minimums; digital formats can support 1-week short campaigns.",
  },
  {
    id: "creative-production",
    category: "process",
    term: "크리에이티브 제작",
    termEn: "Creative Production",
    aliases: ["광고 시안 제작", "소재 제작"],
    definitionKo:
      "OOH 매체 규격에 맞는 인쇄 출력물(빌보드 시트), 동영상(LED·디지털 사이니지), 또는 정적 이미지 제작 과정. 매체 사양에 따라 해상도·비율 요구사항이 다릅니다.",
    definitionEn:
      "Producing print sheets (billboards), video (LED/DOOH), or static images sized for specific media specs. Each format has unique resolution and aspect-ratio requirements.",
  },
  {
    id: "installation",
    category: "process",
    term: "설치",
    termEn: "Installation",
    aliases: ["시공", "게재"],
    definitionKo:
      "제작된 광고 시안을 매체에 부착·송출하는 작업. 빌보드는 인쇄·시공 일정이 필요하고, 디지털 매체는 송출 스케줄 등록만으로 가능합니다.",
    definitionEn:
      "Attaching or broadcasting the finished creative on the media. Billboards require print + physical install; digital media only need a broadcast schedule entry.",
  },
  {
    id: "monitoring-report",
    category: "process",
    term: "모니터링 보고서",
    termEn: "Monitoring Report",
    aliases: ["송출 증빙", "게재 보고서"],
    definitionKo:
      "캠페인 송출이 정상적으로 이뤄졌음을 증빙하는 보고서. 송출 사진, 송출 로그, 노출 추정 수치 등을 포함합니다.",
    definitionEn:
      "Document proving the campaign ran as planned, including proof photos, broadcast logs, and estimated exposure metrics.",
  },
  {
    id: "verification",
    category: "process",
    term: "매체 검증",
    termEn: "Media Verification",
    aliases: ["현장 검증", "매체 실측"],
    definitionKo:
      "광고 매체의 위치·크기·시인성·유동인구를 현장에서 직접 확인·측정하는 절차. THINKAD 는 등록되는 모든 매체에 대해 4단계 검증을 수행합니다.",
    definitionEn:
      "On-site inspection and measurement of media position, size, viewability, and traffic. THINKAD performs a 4-step verification for every listed media.",
  },

  // ── 기술·플랫폼 ──
  {
    id: "programmatic-dooh",
    category: "tech",
    term: "프로그래매틱 DOOH",
    termEn: "Programmatic DOOH",
    aliases: ["pDOOH"],
    definitionKo:
      "DSP·SSP 를 통해 자동화된 입찰·구매로 디지털 OOH 매체를 사고파는 방식. 트리거(시간·날씨·관중 등) 기반 동적 송출 가능.",
    definitionEn:
      "Automated buying/selling of DOOH inventory through DSP/SSP exchanges. Supports trigger-based dynamic delivery (time, weather, audience).",
    related: ["dooh"],
  },
  {
    id: "dynamic-creative",
    category: "tech",
    term: "다이내믹 크리에이티브",
    termEn: "Dynamic Creative Optimization (DCO)",
    abbreviationFull: "Dynamic Creative Optimization",
    aliases: ["DCO"],
    definitionKo:
      "조건(시간대·날씨·재고·근처 매장)에 따라 광고 크리에이티브를 자동 변경하는 기술. 디지털 사이니지 / DOOH 에서 주로 사용됩니다.",
    definitionEn:
      "Technology that automatically changes ad creative based on conditions (time, weather, inventory, nearby stores). Used mainly in digital signage / DOOH.",
    related: ["programmatic-dooh", "dooh"],
  },
  {
    id: "geofencing",
    category: "tech",
    term: "지오펜싱",
    termEn: "Geofencing",
    aliases: ["위치 기반 광고"],
    definitionKo:
      "특정 지역에 가상의 경계(geofence)를 설정해, 그 안에 있는 사용자에게만 광고를 송출하거나 매체를 활성화하는 기법.",
    definitionEn:
      "Setting a virtual perimeter (geofence) around a location to deliver ads or activate media only when users enter that zone.",
  },
  {
    id: "qr-tracking",
    category: "tech",
    term: "QR 트래킹",
    termEn: "QR Code Tracking",
    aliases: ["QR 코드 측정"],
    definitionKo:
      "OOH 광고 안에 QR 코드를 배치하고 스캔 / 방문 / 전환을 추적하는 효과 측정 기법. 오프라인 → 온라인 행동 연결의 가장 단순한 방법.",
    definitionEn:
      "Placing a QR code in the OOH creative and tracking scans, landings, and conversions. The simplest way to bridge offline exposure to online action.",
  },

  // ── 구매·계약 ──
  {
    id: "rate-card",
    category: "buying",
    term: "단가표",
    termEn: "Rate Card",
    aliases: ["요율표", "정가표"],
    definitionKo:
      "매체별 공식 광고 단가를 정리한 표. 협상 출발점이며 실제 거래는 기간·물량·시즌에 따라 할인이 적용되는 경우가 많습니다.",
    definitionEn:
      "Standard list of advertising rates per media. Used as a negotiation baseline; actual deals often include duration, volume, and seasonal discounts.",
  },
  {
    id: "media-mix",
    category: "buying",
    term: "미디어 믹스",
    termEn: "Media Mix",
    aliases: ["매체 믹스"],
    definitionKo:
      "캠페인 목표·예산에 맞춰 여러 매체(빌보드 + 디지털 사이니지 + 교통광고 등)를 조합한 구성. 단일 매체 대비 도달·빈도 효율이 높아집니다.",
    definitionEn:
      "Combination of multiple media (billboard + digital signage + transit, etc.) tuned to campaign goals and budget. Improves reach × frequency vs single-media.",
    related: ["reach", "frequency", "grp"],
  },
  {
    id: "minimum-period",
    category: "buying",
    term: "최소 집행 기간",
    termEn: "Minimum Period",
    aliases: ["최소 계약 기간"],
    definitionKo:
      "매체별로 정해진 최소 광고 집행 단위. 빌보드는 보통 1개월 이상, 디지털 사이니지는 1-2주 단기 집행도 가능합니다.",
    definitionEn:
      "Smallest contractible duration per medium. Billboards typically require 1+ month; digital signage often supports 1-2 week short campaigns.",
  },
  {
    id: "tax-invoice",
    category: "buying",
    term: "세금계산서",
    termEn: "Tax Invoice",
    aliases: ["전자 세금계산서"],
    definitionKo:
      "공급가 + 부가세를 명시한 거래 증빙. OOH 광고비는 세금계산서 발행 후 계좌이체 결제가 표준입니다 (법인카드 결제도 가능).",
    definitionEn:
      "Korean tax-compliant invoice showing supply value plus VAT. Standard payment for OOH is bank transfer after the tax invoice is issued (corporate card also accepted).",
  },
  {
    id: "media-plan",
    category: "buying",
    term: "미디어 플랜",
    termEn: "Media Plan",
    aliases: ["미디어 플래닝", "광고 플랜"],
    definitionKo:
      "캠페인 목표·예산·기간을 입력하면 매체 후보·믹스·예상 노출·CPM 을 도출하는 사전 기획 문서. THINKAD 플래너로 자동화할 수 있습니다.",
    definitionEn:
      "Pre-campaign plan that takes goals, budget, and duration as inputs and outputs media candidates, mix, projected exposure, and CPM. Automatable in the THINKAD planner.",
    related: ["media-mix", "cpm", "grp"],
  },
  {
    id: "rfq",
    category: "buying",
    term: "견적 요청",
    termEn: "Request for Quote (RFQ)",
    abbreviationFull: "Request for Quote",
    aliases: ["RFQ", "견적의뢰"],
    definitionKo:
      "광고주가 매체사·에이전시에 캠페인 조건을 제시하고 단가·가용성을 요청하는 절차. THINKAD 는 견적 요청 시 24시간 내 응답을 원칙으로 합니다.",
    definitionEn:
      "Process where an advertiser submits campaign requirements and asks media owners or agencies for pricing/availability. THINKAD typically responds within 24 hours.",
  },
];
