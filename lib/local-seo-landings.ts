import type { MediaItem } from "@/lib/media-data";
import type { MediaRegionZoneId } from "@/lib/media-regions";
import { mapDistrictToRegionZone } from "@/lib/media-regions";

export type LocalSeoLanding = {
  region: string;
  district: string;
  /** H1 예: 강남구 */
  headlineKo: string;
  headlineEn: string;
  /** 메타·타이틀용 짧은 지명 */
  placeKo: string;
  placeEn: string;
  regionZone?: MediaRegionZoneId;
  /** 행정구 정확 일치 (예: 강남구) */
  districts?: string[];
  /** location/alias 키워드 (hongdae 등) */
  keywords?: string[];
  introKo: string;
  introEn: string;
  traitsKo: string[];
  traitsEn: string[];
  faqsKo: { q: string; a: string }[];
  faqsEn: { q: string; a: string }[];
  caseKeywords?: string[];
};

/** SSG 대상 25개 지역·상권 랜딩 */
export const LOCAL_SEO_LANDINGS: LocalSeoLanding[] = [
  {
    region: "seoul",
    district: "gangnam",
    headlineKo: "강남권 옥외광고",
    headlineEn: "Gangnam OOH advertising",
    placeKo: "강남·서초·송파",
    placeEn: "Gangnam, Seocho & Songpa",
    regionZone: "gangnam",
    introKo:
      "테헤란로·강남대로·코엑스 일대는 국내 최고 상업 밀도 구간입니다. 전광판·미디어폴·빌보드가 집중되어 브랜드 론칭·프리미엄 캠페인에 적합합니다.",
    introEn:
      "Teheran-ro, Gangnam-daero, and COEX form Korea’s densest commercial OOH cluster — ideal for launches and premium branding.",
    traitsKo: ["일 유동 200만+ 구간", "테크·럭셔리·F&B 집중", "전광판·미디어월 다수"],
    traitsEn: ["2M+ daily footfall corridors", "Tech & luxury brands", "LED & media walls"],
    faqsKo: [
      {
        q: "강남 광고비는 얼마인가요?",
        a: "매체별로 월 500만원~ 수억원까지 다양합니다. THINKAD에서 실시간 단가와 예상 노출을 확인하세요.",
      },
      {
        q: "신논현·강남역 전광판 견적은?",
        a: "디지털(DOOH) 매체 상세에서 기간별 견적 계산기와 즉시 문의가 가능합니다.",
      },
    ],
    faqsEn: [
      {
        q: "How much does Gangnam OOH cost?",
        a: "From ~₩5M/month per site to premium packages — compare verified listings on THINKAD.",
      },
    ],
    caseKeywords: ["강남", "코엑스", "테헤란", "gangnam"],
  },
  {
    region: "seoul",
    district: "gangnam-gu",
    headlineKo: "강남구 옥외광고",
    headlineEn: "Gangnam-gu OOH",
    placeKo: "강남구",
    placeEn: "Gangnam-gu",
    districts: ["강남구"],
    introKo:
      "강남구는 역삼·삼성·청담·신사 등 핵심 상권이 밀집한 프리미엄 OOH 시장입니다.",
    introEn: "Gangnam-gu bundles Yeoksam, Samseong, Cheongdam, and Sinsa premium OOH inventory.",
    traitsKo: ["역삼·삼성 IT·금융 클러스터", "청담·신사 럭셔리", "높은 CPM 프리미엄"],
    traitsEn: ["Yeoksam/Samseong business hub", "Luxury districts", "Premium CPM"],
    faqsKo: [
      { q: "강남구 전광판 광고비 얼마?", a: "규모·기간에 따라 상이합니다. 매체 카드에서 월 단가를 확인하세요." },
    ],
    faqsEn: [],
    caseKeywords: ["강남구", "강남"],
  },
  {
    region: "seoul",
    district: "seocho-gu",
    headlineKo: "서초구 옥외광고",
    headlineEn: "Seocho-gu OOH",
    placeKo: "서초구",
    placeEn: "Seocho-gu",
    districts: ["서초구"],
    regionZone: "gangnam",
    introKo: "서초·교대·방배 일대는 오피스·주거 복합 상권으로 안정적인 주간·야간 노출이 가능합니다.",
    introEn: "Seocho mixes office towers and residential trade areas with steady daypart reach.",
    traitsKo: ["교대·강남 인접", "오피스 타깃", "간선도로 시인성"],
    traitsEn: ["Near Gangnam", "Office audience", "Arterial visibility"],
    faqsKo: [{ q: "서초구 빌보드 집행 기간?", a: "보통 2주~3개월 단위이며 매체별 상이합니다." }],
    faqsEn: [],
    caseKeywords: ["서초"],
  },
  {
    region: "seoul",
    district: "songpa-gu",
    headlineKo: "송파구 옥외광고",
    headlineEn: "Songpa-gu OOH",
    placeKo: "송파구",
    placeEn: "Songpa-gu",
    districts: ["송파구"],
    regionZone: "gangnam",
    introKo: "잠실·석촌·가락 일대는 대형 유통·레저·스포츠 시설과 연계된 가족·MZ 타깃 OOH가 강합니다.",
    introEn: "Jamsil and surrounding areas offer family and lifestyle OOH near retail and leisure hubs.",
    traitsKo: ["잠실 롯데월드·석촌호", "스포츠·이벤트 연계", "동부 간선 노출"],
    traitsEn: ["Jamsil leisure cluster", "Event tie-ins", "East Seoul reach"],
    faqsKo: [{ q: "잠실 전광판 광고는?", a: "잠실·석촌 일대 DOOH·빌보드 매체를 THINKAD에서 비교하세요." }],
    faqsEn: [],
    caseKeywords: ["잠실", "송파"],
  },
  {
    region: "seoul",
    district: "hongdae",
    headlineKo: "홍대·마포 옥외광고",
    headlineEn: "Hongdae & Mapo OOH",
    placeKo: "홍대·합정·상암",
    placeEn: "Hongdae, Hapjeong & Sangam",
    regionZone: "mapo",
    keywords: ["홍대", "합정", "상암", "연남", "마포"],
    introKo:
      "홍대입구·합정·연남·상암 DMC는 MZ·문화 콘텐츠 타깃에 강한 OOH 구간입니다. 전광판 광고비 문의가 많은 지역입니다.",
    introEn:
      "Hongdae, Hapjeong, and Sangam DMC are top zones for youth and culture-led OOH campaigns.",
    traitsKo: ["MZ·F&B·패션", "문화·팝업 연계", "지하철 2·6호선 유동"],
    traitsEn: ["Gen Z & F&B", "Culture tie-ins", "Subway footfall"],
    faqsKo: [
      {
        q: "홍대 전광판 광고비는?",
        a: "디지털 매체는 월 500만~2,000만원대부터 시작하는 경우가 많습니다. 매체별로 확인하세요.",
      },
    ],
    faqsEn: [],
    caseKeywords: ["홍대", "마포", "합정"],
  },
  {
    region: "seoul",
    district: "mapo-gu",
    headlineKo: "마포구 옥외광고",
    headlineEn: "Mapo-gu OOH",
    placeKo: "마포구",
    placeEn: "Mapo-gu",
    districts: ["마포구"],
    regionZone: "mapo",
    introKo: "마포구는 홍대·상암·공덕 등 젊은 층·크리에이티브 산업 밀집 지역입니다.",
    introEn: "Mapo-gu spans Hongdae, Sangam, and Gongdeok with creative-industry audiences.",
    traitsKo: ["상암 DMC", "홍대 상권", "한강 접근 노출"],
    traitsEn: ["DMC cluster", "Hongdae retail", "Han River adjacency"],
    faqsKo: [{ q: "마포구 옥외광고 추천 매체?", a: "유형별·예산별 필터로 DOOH·교통 매체를 비교하세요." }],
    faqsEn: [],
    caseKeywords: ["마포"],
  },
  {
    region: "seoul",
    district: "seongsu",
    headlineKo: "성수·건대 옥외광고",
    headlineEn: "Seongsu & Konkuk OOH",
    placeKo: "성수·건대",
    placeEn: "Seongsu & Konkuk Univ.",
    regionZone: "seongdong",
    keywords: ["성수", "건대", "뚝섬", "왕십리"],
    introKo:
      "성수동·건대 일대는 팝업·브랜드 경험·스타트업 타깃 OOH가 급성장한 구간입니다.",
    introEn: "Seongsu and Konkuk areas are hotspots for pop-up culture and brand experience OOH.",
    traitsKo: ["팝업·콜라보", "MZ 타깃", "성수역·건대입구 유동"],
    traitsEn: ["Pop-up culture", "Gen Z", "Station hubs"],
    faqsKo: [{ q: "성수동 OOH 광고비?", a: "성수·성동권 매체는 THINKAD 성수 랜딩에서 일괄 비교할 수 있습니다." }],
    faqsEn: [],
    caseKeywords: ["성수", "건대"],
  },
  {
    region: "seoul",
    district: "seongdong-gu",
    headlineKo: "성동구 옥외광고",
    headlineEn: "Seongdong-gu OOH",
    placeKo: "성동구",
    placeEn: "Seongdong-gu",
    districts: ["성동구"],
    regionZone: "seongdong",
    introKo: "성동구는 성수·왕십리·금호 등 동부 상업·주거 혼합 지역입니다.",
    introEn: "Seongdong-gu covers Seongsu, Wangsimni, and Geumho corridors.",
    traitsKo: ["성수 클러스터", "2호선·분당선", "한강변 노출"],
    traitsEn: ["Seongsu cluster", "Line 2 reach", "Riverfront"],
    faqsKo: [],
    faqsEn: [],
    caseKeywords: ["성동"],
  },
  {
    region: "seoul",
    district: "myeongdong",
    headlineKo: "명동·도심 옥외광고",
    headlineEn: "Myeongdong & downtown OOH",
    placeKo: "명동·을지로",
    placeEn: "Myeongdong & Euljiro",
    regionZone: "downtown",
    keywords: ["명동", "을지로", "충무로", "시청"],
    introKo: "명동·을지로는 관광·쇼핑·금융이 겹치는 국내 대표 관광 상권 OOH입니다.",
    introEn: "Myeongdong and Euljiro combine tourism, retail, and finance audiences.",
    traitsKo: ["관광·면세", "고밀도 보행", "대형 전광판"],
    traitsEn: ["Tourism retail", "Pedestrian density", "Large format LED"],
    faqsKo: [{ q: "명동 전광판 광고비?", a: "프리미엄 구간은 월 단가가 높습니다. 매체별 견적을 비교하세요." }],
    faqsEn: [],
    caseKeywords: ["명동", "을지로"],
  },
  {
    region: "seoul",
    district: "jongno-gu",
    headlineKo: "종로구 옥외광고",
    headlineEn: "Jongno-gu OOH",
    placeKo: "종로구",
    placeEn: "Jongno-gu",
    districts: ["종로구"],
    regionZone: "downtown",
    introKo: "종로·광화문·인사동은 관광·공공·금융이 공존하는 전통 도심 OOH 구간입니다.",
    introEn: "Jongno and Gwanghwamun blend tourism, government, and finance audiences.",
    traitsKo: ["광화문·세종로", "관광객", "공공기관 인접"],
    traitsEn: ["Gwanghwamun", "Tourists", "Government adjacency"],
    faqsKo: [],
    faqsEn: [],
    caseKeywords: ["종로", "광화문"],
  },
  {
    region: "seoul",
    district: "jung-gu",
    headlineKo: "중구 옥외광고",
    headlineEn: "Jung-gu OOH",
    placeKo: "중구",
    placeEn: "Jung-gu",
    districts: ["중구"],
    regionZone: "downtown",
    introKo: "명동·을지로·충무로·남대문 시장 일대는 서울 도심 핵심 유동 구간입니다.",
    introEn: "Jung-gu central districts offer flagship retail and transit OOH.",
    traitsKo: ["지하철 허브", "관광 쇼핑", "고층 빌딩 외벽"],
    traitsEn: ["Subway hubs", "Tourism shopping", "Building facades"],
    faqsKo: [],
    faqsEn: [],
    caseKeywords: ["중구", "명동"],
  },
  {
    region: "seoul",
    district: "yeouido",
    headlineKo: "여의도·영등포 옥외광고",
    headlineEn: "Yeouido & Yeongdeungpo OOH",
    placeKo: "여의도·영등포",
    placeEn: "Yeouido & Yeongdeungpo",
    regionZone: "gangseo",
    keywords: ["여의도", "영등포", "국회", "63빌딩"],
    introKo: "여의도 IFC·국회·증권가 일대는 금융·B2B 브랜드 타깃 OOH가 강합니다.",
    introEn: "Yeouido’s finance cluster suits B2B and corporate branding OOH.",
    traitsKo: ["금융·증권", "IFC·미디어월", "한강 뷰"],
    traitsEn: ["Finance hub", "Media walls", "River views"],
    faqsKo: [{ q: "여의도 전광판?", a: "여의도·영등포구 매체를 지역 랜딩에서 확인하세요." }],
    faqsEn: [],
    caseKeywords: ["여의도", "영등포"],
  },
  {
    region: "seoul",
    district: "yeongdeungpo-gu",
    headlineKo: "영등포구 옥외광고",
    headlineEn: "Yeongdeungpo-gu OOH",
    placeKo: "영등포구",
    placeEn: "Yeongdeungpo-gu",
    districts: ["영등포구"],
    regionZone: "gangseo",
    introKo: "영등포·여의도·당산은 서남권 비즈니스·주거 복합 상권입니다.",
    introEn: "Yeongdeungpo-gu links Yeouido finance and Dangsan residential trade.",
    traitsKo: ["여의도 인접", "타임스퀘어·백화점", "5호선 유동"],
    traitsEn: ["Near Yeouido", "Mall clusters", "Line 5 traffic"],
    faqsKo: [],
    faqsEn: [],
    caseKeywords: ["영등포"],
  },
  {
    region: "seoul",
    district: "gwangjin-gu",
    headlineKo: "광진구 옥외광고",
    headlineEn: "Gwangjin-gu OOH",
    placeKo: "광진구",
    placeEn: "Gwangjin-gu",
    districts: ["광진구"],
    regionZone: "seongdong",
    introKo: "건대·구의·자양은 대학·유흥·주거가 혼합된 동부 상권입니다.",
    introEn: "Gwangjin-gu covers Konkuk Univ. and riverside neighborhoods.",
    traitsKo: ["건대 상권", "한강공원", "2호선"],
    traitsEn: ["Konkuk area", "Han River park", "Line 2"],
    faqsKo: [],
    faqsEn: [],
    caseKeywords: ["광진", "건대"],
  },
  {
    region: "seoul",
    district: "nowon-gu",
    headlineKo: "노원구 옥외광고",
    headlineEn: "Nowon-gu OOH",
    placeKo: "노원·강북",
    placeEn: "Nowon & north Seoul",
    districts: ["노원구"],
    regionZone: "nowon",
    introKo: "노원·중계·상계는 북동부 주거·상업 밀집 지역으로 대량 도달형 OOH에 적합합니다.",
    introEn: "Nowon offers mass-reach residential and retail OOH in northeast Seoul.",
    traitsKo: ["주거 밀집", "대형 마트·상권", "합리적 단가"],
    traitsEn: ["Residential density", "Retail hubs", "Value pricing"],
    faqsKo: [],
    faqsEn: [],
    caseKeywords: ["노원"],
  },
  {
    region: "seoul",
    district: "gwanak-gu",
    headlineKo: "관악구 옥외광고",
    headlineEn: "Gwanak-gu OOH",
    placeKo: "관악·사당",
    placeEn: "Gwanak & Sadang",
    districts: ["관악구"],
    regionZone: "gwanak",
    introKo: "사당·신림은 남부 교통 요충지로 지하철·버스 환승 OOH가 효과적입니다.",
    introEn: "Sadang and Sillim are major south Seoul transit hubs for OOH.",
    traitsKo: ["환승역", "대학가", "남부 간선"],
    traitsEn: ["Transfer stations", "Universities", "South corridors"],
    faqsKo: [],
    faqsEn: [],
    caseKeywords: ["관악", "사당"],
  },
  {
    region: "seoul",
    district: "yongsan-gu",
    headlineKo: "용산구 옥외광고",
    headlineEn: "Yongsan-gu OOH",
    placeKo: "용산·이태원",
    placeEn: "Yongsan & Itaewon",
    districts: ["용산구"],
    regionZone: "downtown",
    introKo: "용산역·이태원·한남은 KTX·관광·글로벌 타깃이 섞인 도심 서부 관문입니다.",
    introEn: "Yongsan and Itaewon mix KTX travelers, tourism, and global audiences.",
    traitsKo: ["용산역", "이태원", "한남·리움"],
    traitsEn: ["Yongsan Station", "Itaewon", "Hannam"],
    faqsKo: [],
    faqsEn: [],
    caseKeywords: ["용산", "이태원"],
  },
  {
    region: "seoul",
    district: "gangseo-gu",
    headlineKo: "강서구 옥외광고",
    headlineEn: "Gangseo-gu OOH",
    placeKo: "강서·마곡",
    placeEn: "Gangseo & Magok",
    districts: ["강서구"],
    regionZone: "gangseo",
    introKo: "마곡·염창·등촌은 서남권 업무·주거 복합 지역입니다.",
    introEn: "Gangseo-gu includes Magok business district and western residential zones.",
    traitsKo: ["마곡 R&D", "김포공항 인접", "9호선"],
    traitsEn: ["Magok cluster", "Near Gimpo airport", "Line 9"],
    faqsKo: [],
    faqsEn: [],
    caseKeywords: ["강서", "마곡"],
  },
  {
    region: "seoul",
    district: "downtown",
    headlineKo: "서울 도심 옥외광고",
    headlineEn: "Seoul downtown OOH",
    placeKo: "도심권",
    placeEn: "Downtown Seoul",
    regionZone: "downtown",
    introKo: "종로·중구·용산 도심권은 관광·금융·유통이 집중된 국내 최고 트래픽 OOH 시장입니다.",
    introEn: "Central Seoul (Jongno, Jung, Yongsan) offers flagship tourism and finance OOH.",
    traitsKo: ["관광·금융", "지하철 허브", "대형 포맷"],
    traitsEn: ["Tourism & finance", "Subway hubs", "Large formats"],
    faqsKo: [],
    faqsEn: [],
    caseKeywords: ["도심", "종로", "명동"],
  },
  {
    region: "gyeonggi",
    district: "suwon",
    headlineKo: "수원 옥외광고",
    headlineEn: "Suwon OOH",
    placeKo: "수원",
    placeEn: "Suwon",
    keywords: ["수원", "인계", "영통"],
    introKo: "수원·인계·영통은 경기 남부 최대 상업·주거 허브입니다.",
    introEn: "Suwon is a major Gyeonggi hub for retail and commuter OOH.",
    traitsKo: ["인계동 상권", "대학·주거", "경부선"],
    traitsEn: ["Ingye retail", "Universities", "Gyeongbu line"],
    faqsKo: [],
    faqsEn: [],
    caseKeywords: ["수원"],
  },
  {
    region: "gyeonggi",
    district: "seongnam",
    headlineKo: "성남·분당 옥외광고",
    headlineEn: "Seongnam & Bundang OOH",
    placeKo: "성남·분당·판교",
    placeEn: "Seongnam, Bundang & Pangyo",
    keywords: ["성남", "분당", "판교", "정자"],
    introKo: "판교·분당은 IT·금융·주거 프리미엄이 높은 경기 대표 OOH 시장입니다.",
    introEn: "Pangyo and Bundang target tech, finance, and affluent commuters.",
    traitsKo: ["판교 테크", "분당 주거", "신분당선"],
    traitsEn: ["Pangyo tech", "Bundang residential", "Shin-Bundang line"],
    faqsKo: [],
    faqsEn: [],
    caseKeywords: ["분당", "판교", "성남"],
  },
  {
    region: "incheon",
    district: "songdo",
    headlineKo: "송도·인천 옥외광고",
    headlineEn: "Songdo & Incheon OOH",
    placeKo: "송도·연수",
    placeEn: "Songdo & Yeonsu",
    keywords: ["송도", "인천", "연수", "센트럴파크"],
    introKo: "송도 국제도시는 신도시·오피스·주거가 결합된 인천 대표 OOH 구간입니다.",
    introEn: "Songdo offers new-town office and residential OOH in Incheon.",
    traitsKo: ["국제업무지구", "컨벤션", "인천대교"],
    traitsEn: ["IBD", "Convention", "Bridge visibility"],
    faqsKo: [],
    faqsEn: [],
    caseKeywords: ["송도", "인천"],
  },
  {
    region: "busan",
    district: "haeundae",
    headlineKo: "해운대·부산 옥외광고",
    headlineEn: "Haeundae & Busan OOH",
    placeKo: "해운대·센텀",
    placeEn: "Haeundae & Centum",
    keywords: ["해운대", "센텀", "마린시티", "부산"],
    introKo: "해운대·센텀·마린시티는 부산 최대 관광·비즈니스 OOH 클러스터입니다.",
    introEn: "Haeundae and Centum City anchor Busan’s premium OOH market.",
    traitsKo: ["관광·호텔", "센텀 IT", "해변 노출"],
    traitsEn: ["Tourism", "Centum IT", "Beachfront"],
    faqsKo: [{ q: "부산 전광판 광고비?", a: "해운대·서면 등 지역별 매체 단가를 비교하세요." }],
    faqsEn: [],
    caseKeywords: ["해운대", "부산", "센텀"],
  },
  {
    region: "busan",
    district: "seomyeon",
    headlineKo: "서면·부산 도심 옥외광고",
    headlineEn: "Seomyeon & Busan central OOH",
    placeKo: "서면",
    placeEn: "Seomyeon",
    keywords: ["서면", "부전", "부산"],
    introKo: "서면은 부산 최대 상업·교통 허브로 지하철·지상 매체가 풍부합니다.",
    introEn: "Seomyeon is Busan’s primary retail and transit OOH hub.",
    traitsKo: ["지하상가", "1·2호선 환승", "대형 스크린"],
    traitsEn: ["Underground mall", "Line 1/2", "Large screens"],
    faqsKo: [],
    faqsEn: [],
    caseKeywords: ["서면", "부산"],
  },
  {
    region: "daegu",
    district: "dongseongro",
    headlineKo: "대구·동성로 옥외광고",
    headlineEn: "Daegu & Dongseong-ro OOH",
    placeKo: "대구·동성로",
    placeEn: "Daegu downtown",
    keywords: ["대구", "동성로", "중구"],
    introKo: "동성로·중앙로 일대는 대구 도심 상업·청년 문화 OOH의 중심입니다.",
    introEn: "Dongseong-ro anchors Daegu’s downtown retail OOH.",
    traitsKo: ["청년 상권", "지하철 1·2호선", "지역 박람회"],
    traitsEn: ["Youth retail", "Subway lines", "Regional events"],
    faqsKo: [],
    faqsEn: [],
    caseKeywords: ["대구", "동성"],
  },
  {
    region: "jeju",
    district: "jeju-city",
    headlineKo: "제주 옥외광고",
    headlineEn: "Jeju OOH",
    placeKo: "제주",
    placeEn: "Jeju",
    keywords: ["제주", "공항", "중문", "연동"],
    introKo: "제주공항·중문·연동은 관광·면세·호텔 타깃 OOH가 집중된 시장입니다.",
    introEn: "Jeju airport and resort corridors drive tourism-focused OOH.",
    traitsKo: ["관광·면세", "공항", "리조트"],
    traitsEn: ["Tourism", "Airport", "Resorts"],
    faqsKo: [],
    faqsEn: [],
    caseKeywords: ["제주"],
  },
];

export function getLocalSeoLanding(
  region: string,
  district: string,
): LocalSeoLanding | undefined {
  return LOCAL_SEO_LANDINGS.find(
    (l) => l.region === region && l.district === district,
  );
}

export function localSeoPath(landing: LocalSeoLanding): string {
  return `/local/${landing.region}/${landing.district}`;
}

export function matchesLocalSeoLanding(
  m: MediaItem,
  landing: LocalSeoLanding,
): boolean {
  if (landing.districts?.length) {
    const d = m.district?.trim();
    if (d && landing.districts.includes(d)) return true;
  }

  if (landing.regionZone) {
    const zone =
      m.regionZone ??
      mapDistrictToRegionZone(m.district, {
        location: m.location,
        city: m.city,
      });
    if (zone === landing.regionZone) return true;
  }

  if (landing.keywords?.length) {
    const hay = `${m.location} ${m.district} ${m.city} ${m.name}`.toLowerCase();
    if (landing.keywords.some((k) => hay.includes(k.toLowerCase()))) return true;
  }

  if (landing.region && m.region === landing.region) {
    if (!landing.districts && !landing.regionZone && !landing.keywords) {
      return true;
    }
  }

  return false;
}

export function resolveLocalLandingForMedia(
  m: MediaItem,
): LocalSeoLanding | null {
  for (const landing of LOCAL_SEO_LANDINGS) {
    if (matchesLocalSeoLanding(m, landing)) return landing;
  }
  return null;
}

export function localLandingTitle(
  landing: LocalSeoLanding,
  locale: string,
  count: number,
): string {
  const isKo = locale === "ko" || locale.startsWith("ko");
  const place = isKo ? landing.placeKo : landing.placeEn;
  if (isKo) {
    const countPart = count > 0 ? ` ${count}개 매체` : "";
    return `${place} 전광판·OOH 광고비${countPart} | THINKAD`;
  }
  const countPart = count > 0 ? ` — ${count} placements` : "";
  return `${place} billboard & OOH ad costs${countPart} | THINKAD`;
}

export function localLandingHeroTitle(
  landing: LocalSeoLanding,
  locale: string,
  count: number,
): string {
  const isKo = locale === "ko" || locale.startsWith("ko");
  const place = isKo ? landing.placeKo : landing.placeEn;
  if (isKo) {
    return count > 0
      ? `${place} 전광판·OOH 광고비 — 검증 매체 ${count}개`
      : `${place} 전광판·OOH 광고비 비교`;
  }
  return count > 0
    ? `${place} billboard & OOH costs — ${count} verified media`
    : `${place} billboard & OOH advertising costs`;
}

export function localLandingDescription(
  landing: LocalSeoLanding,
  locale: string,
  count: number,
): string {
  const isKo = locale === "ko" || locale.startsWith("ko");
  const place = isKo ? landing.placeKo : landing.placeEn;
  if (isKo) {
    const countPart = count > 0 ? `OOH 매체 ${count}개. ` : "";
    return `${place} 핵심 상권 ${countPart}전광판·빌보드 광고비를 실시간 단가로 비교하고 즉시 견적하세요. THINKAD 싱커드.`;
  }
  const countPart = count > 0 ? `${count} verified ` : "";
  return `${countPart}OOH placements in ${place}. Compare billboard & DOOH pricing and request quotes on THINKAD.`;
}

export function filterCasesForLocalLanding(
  cases: Array<{
    id: string;
    titleKo: string;
    titleEn?: string | null;
    summaryKo: string;
    summaryEn?: string | null;
    mediaUsed: string[];
  }>,
  landing: LocalSeoLanding,
  limit = 3,
): typeof cases {
  const keys = [
    ...(landing.caseKeywords ?? []),
    landing.placeKo,
    ...(landing.keywords ?? []),
  ];
  const scored = cases
    .map((c) => {
      const hay = [
        c.titleKo,
        c.titleEn,
        c.summaryKo,
        c.summaryEn,
        ...c.mediaUsed,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      let score = 0;
      for (const k of keys) {
        if (k && hay.includes(k.toLowerCase())) score += 1;
      }
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const picked = scored.slice(0, limit).map((x) => x.c);
  if (picked.length > 0) return picked;
  return cases.slice(0, limit);
}
