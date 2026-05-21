/** Big Buck Bunny (Blender Foundation) — embed-friendly demo video */
export const DEMO_VIDEO_EMBED =
  "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?rel=0";

export type AcademyLesson = {
  id: string;
  titleKo: string;
  titleEn: string;
  descKo: string;
  descEn: string;
  durationMin: number;
  videoEmbedUrl: string;
  pdfFileName: string;
  outlineKo: string[];
  outlineEn: string[];
};

export type AcademyWebinar = {
  id: string;
  titleKo: string;
  titleEn: string;
  descKo: string;
  descEn: string;
  datetimeIso: string;
  seatsLeft: number;
  levelKo: string;
  levelEn: string;
};

export type AcademyDownloadKind = "guide" | "checklist" | "media_matrix";

export type AcademyDownload = {
  id: string;
  kind: AcademyDownloadKind;
  titleKo: string;
  titleEn: string;
  descKo: string;
  descEn: string;
  pdfFileName: string;
  bulletsKo: string[];
  bulletsEn: string[];
};

export const academyLessons: readonly AcademyLesson[] = [
  {
    id: "lesson-ooh-101",
    titleKo: "OOH 광고 101 — 옥외매체의 종류와 도달",
    titleEn: "OOH 101 — formats and reach basics",
    descKo:
      "빌보드·디지털·교통·특수 매체의 역할과 캠페인 설계 시 체크포인트를 정리합니다.",
    descEn:
      "Billboards, digital, transit, and special placements—how they work in a plan.",
    durationMin: 42,
    videoEmbedUrl: DEMO_VIDEO_EMBED,
    pdfFileName: "thinkad-academy-ooh-101-outline.pdf",
    outlineKo: [
      "OOH 정의와 디지털 광고와의 차이",
      "매체 유형별 강점·약점",
      "도달·빈도·지리 타기팅 기초",
      "브랜드 vs 퍼포먼스 목표에 맞는 믹스",
    ],
    outlineEn: [
      "What counts as OOH vs digital channels",
      "Strengths and trade-offs by format",
      "Reach, frequency, and geo basics",
      "Brand vs performance-oriented mixes",
    ],
  },
  {
    id: "lesson-measurement",
    titleKo: "측정과 검증 — DOOH·OTS·증빙 데이터",
    titleEn: "Measurement — DOOH, OTS, and proof",
    descKo:
      "프로그래매틱 DOOH, 재생 증빙, 리포트 해석 방법을 실무 관점에서 소개합니다.",
    descEn:
      "Programmatic DOOH, proof-of-play, and how to read vendor reports.",
    durationMin: 36,
    videoEmbedUrl: DEMO_VIDEO_EMBED,
    pdfFileName: "thinkad-academy-measurement-outline.pdf",
    outlineKo: [
      "노출·재생·주목 지표 이해하기",
      "DOOH SSP/거래 구조 한눈에 보기",
      "계약서에 넣을 검증 조항 체크리스트",
      "사후 리포트 샘플 해석",
    ],
    outlineEn: [
      "Impressions, plays, and attention metrics",
      "A simple map of DOOH supply paths",
      "Contract clauses for verification",
      "Reading a sample post-campaign report",
    ],
  },
  {
    id: "lesson-planning",
    titleKo: "미디어 플래닝 실습 — 예산·기간·지역",
    titleEn: "Hands-on planning — budget, flight, region",
    descKo:
      "예산 쪼개기, 기간 설정, 수도권 vs 지방 믹스를 워크시트 형태로 따라합니다.",
    descEn:
      "Budget splits, flight length, and capital vs regional weighting with a worksheet mindset.",
    durationMin: 48,
    videoEmbedUrl: DEMO_VIDEO_EMBED,
    pdfFileName: "thinkad-academy-planning-outline.pdf",
    outlineKo: [
      "캠페인 목표 → KPI 트리 작성",
      "월별 예산 배분 시뮬레이션",
      "지역·시간대 우선순위 매트릭스",
      "견적 요청 전 내부 승인용 브리프",
    ],
    outlineEn: [
      "From goals to a KPI tree",
      "Monthly budget simulation",
      "Region and daypart priority matrix",
      "Internal brief before RFP",
    ],
  },
];

export const academyWebinars: readonly AcademyWebinar[] = [
  {
    id: "web-q2-strategy",
    titleKo: "2026 Q2 캠페인 전략 웨비나 — 수도권 OOH 믹스",
    titleEn: "Q2 2026 strategy webinar — capital-region OOH mix",
    descKo:
      "런칭·항속·리타겟 시나리오별 추천 패널 조합과 사례를 공유합니다.",
    descEn:
      "Panel combinations for launch, sustain, and retarget scenarios with examples.",
    datetimeIso: "2026-04-17T19:00:00+09:00",
    seatsLeft: 42,
    levelKo: "중급",
    levelEn: "Intermediate",
  },
  {
    id: "web-dooh-deep",
    titleKo: "DOOH 심화 — 데이터 연동과 크리에이티브 스펙",
    titleEn: "DOOH deep dive — data feeds and creative specs",
    descKo:
      "해상도·재생길이·안전영역, 데이터 피드 연동 시 주의점을 정리합니다.",
    descEn:
      "Resolution, length, safe zones, and pitfalls when wiring data feeds.",
    datetimeIso: "2026-05-08T19:00:00+09:00",
    seatsLeft: 28,
    levelKo: "심화",
    levelEn: "Advanced",
  },
];

export const academyDownloads: readonly AcademyDownload[] = [
  {
    id: "dl-guide",
    kind: "guide",
    titleKo: "OOH 미디어 가이드북 (PDF)",
    titleEn: "OOH media guidebook (PDF)",
    descKo: "용어, RFP 템플릿 개요, 협상 체크리스트를 담은 요약 문서입니다.",
    descEn: "Glossary, RFP outline, and negotiation checklist in one PDF.",
    pdfFileName: "thinkad-academy-ooh-guidebook.pdf",
    bulletsKo: [
      "옥외 광고 용어 30선",
      "RFP에 포함할 12개 항목",
      "견적 비교 시 질문 리스트",
    ],
    bulletsEn: [
      "30 OOH terms you should know",
      "12 sections every RFP should cover",
      "Questions to ask when comparing quotes",
    ],
  },
  {
    id: "dl-checklist",
    kind: "checklist",
    titleKo: "캠페인 런칭 전 체크리스트 (PDF)",
    titleEn: "Pre-launch campaign checklist (PDF)",
    descKo: "법규·크리에이티브·검증·리포팅까지 현장에서 바로 쓰는 리스트입니다.",
    descEn: "Legal, creative, verification, and reporting checks before go-live.",
    pdfFileName: "thinkad-academy-launch-checklist.pdf",
    bulletsKo: [
      "심의·규제 확인",
      "소재 스펙·납품 일정",
      "증빙·리포트 납기",
    ],
    bulletsEn: [
      "Regulatory and clearance checks",
      "Creative specs and delivery dates",
      "Proof and reporting deadlines",
    ],
  },
  {
    id: "dl-matrix",
    kind: "media_matrix",
    titleKo: "매체×목표 매트릭스 요약 (PDF)",
    titleEn: "Media × goal matrix (PDF)",
    descKo: "인지도·전환·리콜 목적별 추천 매체 조합을 표로 정리했습니다.",
    descEn: "Suggested format mixes by awareness, conversion, and recall goals.",
    pdfFileName: "thinkad-academy-media-matrix.pdf",
    bulletsKo: [
      "목표별 추천 매체",
      "예산 규모별 우선순위",
      "주의할 제약 사항",
    ],
    bulletsEn: [
      "Formats by objective",
      "Priorities by budget tier",
      "Common constraints to watch",
    ],
  },
];
