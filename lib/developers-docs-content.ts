export const DEVELOPERS_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://thinkad.co.kr";

export const DEVELOPERS_ENDPOINTS = [
  {
    id: "list",
    method: "GET",
    path: "/api/v1/media",
    titleKo: "매체 목록",
    titleEn: "Media list",
    descKo: "활성 매체 카탈로그를 필터·페이지네이션으로 조회합니다.",
    descEn: "List active media with filters and pagination.",
    params: [
      { name: "region", type: "string", descKo: "지역 (서울, 부산 등)" },
      { name: "type", type: "string", descKo: "digital | static | mobile" },
      { name: "minPrice", type: "number", descKo: "최소 월 가격(원)" },
      { name: "maxPrice", type: "number", descKo: "최대 월 가격(원)" },
      { name: "available", type: "boolean", descKo: "true 시 가용 매체만" },
      { name: "page", type: "number", descKo: "페이지 (기본 1)" },
      { name: "limit", type: "number", descKo: "페이지 크기 (최대 100, 기본 20)" },
    ],
    exampleResponse: `{
  "data": [
    {
      "id": "clx…",
      "name": "강남역 LED 전광판",
      "type": "digital",
      "region": "서울",
      "price": 15000000,
      "impressions": 1200000,
      "lat": 37.4979,
      "lng": 127.0276,
      "thumbnailUrl": "https://res.cloudinary.com/…",
      "isAvailable": true
    }
  ],
  "pagination": { "total": 142, "page": 1, "limit": 20 }
}`,
    exampleCurl: (base: string, key: string) =>
      `curl -s "${base}/api/v1/media?region=서울&limit=10" \\
  -H "Authorization: Bearer ${key}"`,
  },
  {
    id: "detail",
    method: "GET",
    path: "/api/v1/media/{id}",
    titleKo: "매체 상세",
    titleEn: "Media detail",
    descKo: "단일 매체의 상세 정보를 반환합니다.",
    descEn: "Returns detail for one media item.",
    params: [],
    exampleResponse: `{
  "data": {
    "id": "clx…",
    "name": "강남역 LED 전광판",
    "type": "digital",
    "region": "서울",
    "location": "서울 강남구 …",
    "price": 15000000,
    "impressions": 1200000,
    "lat": 37.4979,
    "lng": 127.0276,
    "thumbnailUrl": "https://…",
    "isAvailable": true,
    "dailyFootTraffic": 85000,
    "visibilityScore": 92
  }
}`,
    exampleCurl: (base: string, key: string) =>
      `curl -s "${base}/api/v1/media/{mediaId}" \\
  -H "Authorization: Bearer ${key}"`,
  },
  {
    id: "availability",
    method: "GET",
    path: "/api/v1/media/{id}/availability",
    titleKo: "가용 캘린더",
    titleEn: "Availability calendar",
    descKo: "예약 불가(차단) 기간을 조회합니다. PII는 포함하지 않습니다.",
    descEn: "Blocked booking ranges without PII.",
    params: [
      { name: "from", type: "YYYY-MM-DD", descKo: "시작일 (기본: 오늘)" },
      { name: "to", type: "YYYY-MM-DD", descKo: "종료일 (기본: +90일, 최대 +180일)" },
    ],
    exampleResponse: `{
  "data": {
    "mediaId": "clx…",
    "from": "2026-05-20",
    "to": "2026-08-18",
    "blockedRanges": [
      {
        "start": "2026-06-01T00:00:00.000Z",
        "end": "2026-06-15T00:00:00.000Z",
        "status": "blocked"
      }
    ]
  }
}`,
    exampleCurl: (base: string, key: string) =>
      `curl -s "${base}/api/v1/media/{mediaId}/availability?from=2026-06-01&to=2026-07-01" \\
  -H "Authorization: Bearer ${key}"`,
  },
] as const;

export const DEVELOPERS_PLANS = [
  { plan: "FREE", limitKo: "월 1,000회", limitEn: "1,000 req/month" },
  { plan: "PRO", limitKo: "월 10,000회", limitEn: "10,000 req/month" },
  { plan: "ENTERPRISE", limitKo: "무제한", limitEn: "Unlimited" },
] as const;
