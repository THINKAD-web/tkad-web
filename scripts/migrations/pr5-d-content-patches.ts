/**
 * PR5-d Phase 1 content patches — applied to online-media-2026-09.json
 * Pricing fields (cpc/cpm/minBudget) intentionally omitted — must not change.
 */
export const PHASE1_CONTENT_PATCHES: Record<
  string,
  {
    description: string;
    descriptionEn: string;
    strengths: string[];
    kpiHints: string[];
    bestFor: string[];
  }
> = {
  "ig-awareness-reach": {
    description:
      "도달 극대화·브랜드 상기도 최적화. 릴스/피드 믹스로 코어 타겟(연령·성별·지역·관심사) 인지 확보에 적합.",
    descriptionEn:
      "Reach and brand awareness via Reels/Feed mix with core demographic targeting.",
    strengths: ["도달 극대화", "브랜드 상기도", "릴스·피드 믹스"],
    kpiHints: ["예상 CPM 4,000~8,000원", "주간 도달 8만~25만"],
    bestFor: ["런칭 초기", "브랜드 인지도가 낮은 신규 사업자"],
  },
  "ig-lead-gen": {
    description:
      "인스타그램 내 폼 작성 완결형 리드 수집. CRM 연동·퀄리티 필터링 포함.",
    descriptionEn: "In-app instant form leads with CRM integration.",
    strengths: ["인앱 폼 완결", "이탈 없는 DB 확보", "모바일 전환"],
    kpiHints: ["예상 CPL 8,000~25,000원"],
    bestFor: ["상담·견적 문의 DB 수집", "교육·의료·부동산 업종"],
  },
  "ig-conversion-shop": {
    description:
      "카탈로그 연동 자동 상품 노출, 픽셀 기반 리타겟팅으로 구매·신청 최적화.",
    descriptionEn: "Catalog and pixel retargeting for purchase optimization.",
    strengths: ["카탈로그 연동", "픽셀 리타겟팅", "전환 최적화"],
    kpiHints: ["예상 ROAS 2~4x (업종 편차)"],
    bestFor: ["자사몰 이커머스", "재구매·장바구니 이탈자 유도"],
  },
  "fb-traffic": {
    description: "가장 대중적인 유입형 캠페인. 자사몰·랜딩 활성화에 적합.",
    descriptionEn: "Broad traffic campaigns for landing and site visits.",
    strengths: ["광역 유입", "대중적 유입형", "랜딩 활성화"],
    kpiHints: ["예상 CPC 200~600원"],
    bestFor: ["자사몰 신규 방문자 확보", "콘텐츠 소비 유도"],
  },
  "fb-awareness": {
    description:
      "광역 도달·동영상 조회 중심 인지도 캠페인. 코어 타겟(연령·성별·지역·관심사) 기반.",
    descriptionEn: "Broad reach and video-view awareness with core targeting.",
    strengths: ["광역 도달", "동영상 조회", "브랜드 인지"],
    kpiHints: ["예상 ThruPlay 단가 업종별 상이"],
    bestFor: ["브랜드 인지도 확대", "신규 고객 도달"],
  },
  "yt-awareness": {
    description:
      "인스트림·숏츠 믹스 영상 기반 브랜드 스토리텔링. 스킵 가능 광고로 관심 시청자만 과금.",
    descriptionEn: "In-stream + Shorts video awareness with skippable ads.",
    strengths: ["영상 스토리텔링", "스킵 가능 과금", "뷰 도달"],
    kpiHints: ["예상 CPV 30~80원"],
    bestFor: ["브랜드 영상 인지도 확대", "신규 브랜드 런칭"],
  },
  "kakao-traffic": {
    description:
      "카카오톡·다음·카카오스토리 등 국민 메신저 기반 압도적 도달. 데모·행동·관심사 타겟.",
    descriptionEn: "Kakao/Daum network traffic with demographic targeting.",
    strengths: ["국민 메신저 도달", "카카오톡 접점", "국내 모바일"],
    kpiHints: ["예상 CPC 150~450원"],
    bestFor: ["국내 모바일 트래픽 확보", "지역·업종별 유입"],
  },
  "naver-sa-brand": {
    description:
      "브랜드·카테고리 키워드 점유로 검색 인지도 확보. 구매 의도가 명확한 검색 순간 노출.",
    descriptionEn: "Brand/category keyword presence at high-intent search moments.",
    strengths: ["검색 점유", "브랜드 방어", "구매 의도 연결"],
    kpiHints: ["브랜드 키워드 점유 목표 설정"],
    bestFor: ["브랜드명 검색 방어", "검색 인지도 확보"],
  },
  "naver-sa-conversion": {
    description:
      "고의도 키워드·쇼핑검색 연동으로 전환 극대화. 키워드 기반 타겟(연령·지역 부가 가능).",
    descriptionEn: "High-intent keywords and shopping search for conversions.",
    strengths: ["고의도 검색", "쇼핑 연동", "전환 연결성"],
    kpiHints: ["예상 CPA 업종 벤치마크 대비 관리"],
    bestFor: ["구매 전환 극대화", "쇼핑검색 연동"],
  },
  "naver-sa-traffic": {
    description: "정보성·비교 키워드로 사이트 유입 확대. 일반 유입·비교 검색에 적합.",
    descriptionEn: "Informational and comparison keywords for site traffic.",
    strengths: ["비교·정보 키워드", "사이트 유입", "검색 유입"],
    kpiHints: ["예상 CPC 400~1,200원"],
    bestFor: ["일반 사이트 유입", "정보·비교 키워드 확보"],
  },
  "google-ads-search": {
    description:
      "구글 검색 최상단 타이밍 노출. 키워드·위치·기기 타겟으로 전환·리드 확보.",
    descriptionEn: "Google Search at peak purchase intent with keyword targeting.",
    strengths: ["구매 의도 최상단", "키워드 타겟", "스마트입찰"],
    kpiHints: ["예상 CPA/ROAS 목표 합의 후 운영"],
    bestFor: ["전환·리드 확보", "고의도 검색 키워드"],
  },
  "google-ads-awareness": {
    description:
      "GDN·유튜브 연동 디스플레이 네트워크 기반 광범위 도달. 신규 브랜드 런칭에 적합.",
    descriptionEn: "GDN/YouTube-linked display reach for brand launches.",
    strengths: ["GDN 광범위 도달", "리마케팅", "디스플레이 네트워크"],
    kpiHints: ["예상 CPM 2,000~6,000원"],
    bestFor: ["신규 브랜드 런칭", "브랜드 인지도 확대"],
  },
  "google-ads-lead": {
    description:
      "리드 폼·랜딩 전환 믹스. 구매 의도 타이밍에 리드 폼 연동으로 이탈 최소화.",
    descriptionEn: "Lead forms and landing mix for consultative industries.",
    strengths: ["리드 폼 연동", "이탈 최소화", "B2B·상담"],
    kpiHints: ["예상 CPL 10,000~40,000원"],
    bestFor: ["B2B·상담 업종", "견적·상담 리드 수집"],
  },
  "tiktok-spark-awareness": {
    description:
      "크리에이터 콘텐츠를 그대로 광고로 전환하는 Spark Ads. 네이티브한 느낌으로 거부감 낮음.",
    descriptionEn: "Spark Ads using creator content natively for awareness.",
    strengths: ["Spark Ads", "네이티브 숏폼", "Z세대·2030"],
    kpiHints: ["예상 CPM 3,000~9,000원 (편차 큼)"],
    bestFor: ["트렌드 민감 업종", "숏폼 콘텐츠 보유 브랜드"],
  },
  "meta-advantage-plus": {
    description:
      "머신러닝이 타겟·소재·입찰을 전부 자동화. 예산만 정하면 AI가 효율 높은 조합을 스스로 찾습니다. 논타겟 기반 자동 확장이 원칙입니다.",
    descriptionEn:
      "Meta Advantage+ — AI optimizes targeting, creative, and bidding from budget alone.",
    strengths: ["AI 자동 최적화", "소재 자동 테스트", "카탈로그 연동"],
    kpiHints: ["예산 설정 후 AI 최적화", "ROAS 목표 합의 후 운영"],
    bestFor: ["광고 운영 리소스가 부족한 경우", "전환 데이터가 쌓인 업종"],
  },
  "naver-gfa-traffic": {
    description:
      "네이버 메인·카페·밴드까지 아우르는 디스플레이. 논타겟(신규유입) → 리타겟(전환) 투트랙 퍼널에 강함. CPC/CPM은 업종·지면별 편차가 커 사전 견적 후 안내합니다.",
    descriptionEn:
      "Naver GFA display across main/cafe/band; rates vary — inquire for quote.",
    strengths: ["네이버 지면 도달", "논타겟·리타겟 퍼널", "국내 트래픽"],
    kpiHints: ["단가 사전 견적", "퍼널별 예산 설계"],
    bestFor: ["브랜드 인지 + 리타겟 병행", "국내 DA 트래픽 확대"],
  },
  "kakao-moment-message": {
    description:
      "카카오톡 채널 메시지·친구 타겟. 채팅방 직접 노출로 주목도 최상. 공식 CPMS: 전체 발송 15원/건, 타겟 지정(성별·연령·지역·맞춤) 20원/건.",
    descriptionEn:
      "KakaoTalk message ads; official CPMS 15–20 KRW per send (not CPC).",
    strengths: ["카톡 채팅방 노출", "이벤트·쿠폰 발송", "기존 고객 리텐션"],
    kpiHints: ["발송당 15~20원 (CPMS)", "CPC/CPM과 다른 과금 구조"],
    bestFor: ["기존 고객 재구매 유도", "프로모션·쿠폰 발송"],
  },
  "youtube-action": {
    description:
      "영상 시청 중 구매·가입 등 액션 CTA 노출. 예산만 정하면 AI가 전환 최적화·자동입찰을 수행합니다. CPV/CPA는 소재·업종별 편차가 커 사전 견적 후 안내합니다.",
    descriptionEn:
      "YouTube action campaigns with AI bidding; CPV/CPA varies — inquire.",
    strengths: ["영상 CTA 전환", "AI 자동 입찰", "관심사·검색 기반 확장"],
    kpiHints: ["예산 설정 후 AI 최적화", "CPV/CPA 사전 견적"],
    bestFor: ["브랜드 인지 후 전환 유도", "영상 기반 액션 캠페인"],
  },
  "google-pmax-conversion": {
    description:
      "검색·디스플레이·유튜브·지메일·지도를 하나의 캠페인으로 통합. 예산만 정하면 AI가 채널 간 예산을 자동 재배분합니다. 타겟 CPA/ROAS 목표 설정 후 AI 최적화.",
    descriptionEn:
      "Performance Max — AI allocates budget across all Google surfaces from your goal.",
    strengths: ["전 지면 통합", "AI 채널 배분", "자동화"],
    kpiHints: ["타겟 CPA/ROAS 후 AI 최적화", "채널 간 예산 자동 재배분"],
    bestFor: ["멀티채널 운영 리소스 부족", "전환 데이터가 있는 경우"],
  },
  "karrot-local-traffic": {
    description:
      "동 단위 초정밀 지역 타겟(반경 2~3km). 네이티브 피드 형식으로 CTR·전환율이 높고 '우리 동네' 신뢰 효과. CPC는 지역·업종별 편차가 커 사전 견적 후 안내합니다.",
    descriptionEn:
      "Karrot hyper-local traffic; CPC varies by area — inquire for quote.",
    strengths: ["동 단위 하이퍼로컬", "네이티브 피드", "지역 신뢰 효과"],
    kpiHints: ["단가 사전 견적", "동·반경 타겟"],
    bestFor: ["오프라인 매장(카페·미용·학원)", "지역 기반 서비스"],
  },
  "baemin-ad-visit": {
    description:
      "배달의민족 앱 내 가게 노출·주문 연결. 배달 직전 시점 노출로 구매 연결성 높음. 과금은 CPC(우리가게클릭)와 정률·정액 상품이 혼재 — 상품별 사전 견적 후 안내합니다.",
    descriptionEn:
      "Baemin store ads; mixed CPC/commission models — inquire for quote.",
    strengths: ["푸드 앱 접점", "주문 직전 노출", "지역·카테고리 타겟"],
    kpiHints: ["과금 모델별 사전 견적", "상품·지역별 편차"],
    bestFor: ["외식업 신규 입점 초기", "재주문·노출 확보"],
  },
  "app-uai-install": {
    description:
      "앱 설치 후 특정 인앱 이벤트(가입·구매)까지 최적화하는 UAI 캠페인. 예산만 정하면 AI가 타겟·입찰을 자동 최적화합니다. 설치·이벤트당 비용은 앱 카테고리·난이도에 따라 편차가 커 사전 견적 후 안내합니다.",
    descriptionEn:
      "Meta app install + in-app event optimization with AI bidding; CPI varies.",
    strengths: ["앱 설치·인앱 이벤트", "유사 타겟 확장", "AI 자동 최적화"],
    kpiHints: ["예산 설정 후 AI 최적화", "CPI·CPA 사전 견적"],
    bestFor: ["앱 서비스 초기 유저 확보", "첫 구매 등 인앱 이벤트 유도"],
  },
  "native-taboola-traffic": {
    description:
      "언론사·포털 등 프리미엄 사이트 하단 '추천 기사' 형태 노출. 콘텐츠형 광고로 거부감 낮음. CPC는 매체·지면별 편차가 커 사전 견적 후 안내합니다.",
    descriptionEn:
      "Native content-recommendation traffic; CPC varies by placement — inquire.",
    strengths: ["프리미엄 지면", "콘텐츠형 노출", "낮은 거부감"],
    kpiHints: ["단가 사전 견적", "콘텐츠·랜딩 연동"],
    bestFor: ["브랜드 콘텐츠 트래픽", "정보성 랜딩 유입"],
  },
};
