# 회사소개 · 서비스 · 매체 검색 — 디자인·기능 스펙

에이전트/기획 참고용. 구현은 코드베이스 기준으로 확인할 것.

---

## 공통 디자인 원칙 (About / Services)

- 딥 네이비 + 골드 포인트 유지
- 여백 넉넉하게 (섹션 간 간격 확대)
- 카드 그림자 부드럽게
- 애니메이션 은은하게 (fade-in, slide-up)
- 모바일 우선 반응형

---

## 1. 회사소개 (`/about`) 개선

### 히어로 섹션

- 풀 와이드 배경 (그라데이션 + 패턴)
- 회사 슬로건 크게
- 핵심 수치 카드 (설립년도, 캠페인 수, 매체 수) — 카운트업 애니메이션

### 비전/미션 섹션

- 아이콘 + 텍스트 카드 3열
- hover 시 살짝 위로 떠오르는 효과

### 연혁 섹션

- 타임라인 레이아웃 (좌우 지그재그 또는 세로 라인)
- 각 연도에 아이콘/마일스톤 강조
- 스크롤 시 순차적으로 나타나는 애니메이션

### 팀 소개 섹션 (선택)

- 대표 프로필 카드
- 심플하게 이름 + 직책 + 한 줄 소개
- 사진 없으면 이니셜 아바타

### CTA 섹션

- 문의하기 버튼
- 배경 골드 그라데이션

---

## 2. 서비스 (`/services`) 개선

### 히어로 섹션

- 서비스 핵심 가치 한 줄
- 부제목으로 상세 설명

### 서비스 카테고리

- 큰 아이콘 카드 (3열)
- 매체 기획 / 매체 운영 / 데이터 분석
- hover 시 배경색 변화

### 프로세스 섹션

- 스텝 1→2→3→4→5 시각화
- 번호 + 제목 + 설명
- 가로 스크롤 또는 세로 타임라인

### 차별점 섹션

- 체크 아이콘 + 텍스트 리스트
- 배경 연한 색상으로 구분

### FAQ 섹션 (선택)

- 아코디언 형태
- 자주 묻는 질문 3–5개

### CTA 섹션

- 견적 요청 버튼
- 매체 둘러보기 버튼

---

## 3. 공통 컴포넌트 (About / Services)

- **SectionHeading**: 제목 + 부제목
- **AnimatedCard**: 스크롤 시 fade-in
- **Timeline**: 연혁/프로세스용

---

## 4. 스타일 가이드 (About / Services)

- 섹션 배경: 교차로 흰색/연한회색
- 카드: `rounded-2xl`, `shadow-sm`
- 버튼: `rounded-full`, 골드 강조
- 텍스트: 제목 딥네이비, 본문 `muted-foreground`

---

## 5. 매체 검색 기능 개선

### 목표

텍스트 검색 시 매체명·주소뿐 아니라 행정구역, 역, 주변 시설, 태그 등까지 매칭한다.

### 검색에 포함할 필드

- `name` (매체명)
- `nameEn`
- `location` (주소)
- `locationEn`
- `district` (구/군)
- `city` (시/도)
- `nearbyStations` (가까운 지하철역) — 예: `"논현역"` 검색 시 매칭
- `nearbyFacilities` (주변 시설)
- `nearbyFacilitiesEn` (다국어 검색용, 구현 시 포함 권장)
- `nearbyLandmarks` (주변 랜드마크)
- `tags` (태그 배열)
- `subCategory` (세부 카테고리)
- 매체 유형 라벨: `typeLabels[type]?.ko` / `typeLabels[type]?.en`

### 검색 로직 (참고 의사코드)

```javascript
function matchesTextQuery(m, lower) {
  const fields = [
    m.name,
    m.nameEn,
    m.location,
    m.locationEn,
    m.district,
    m.city,
    m.nearbyStations,
    m.nearbyFacilities,
    m.nearbyLandmarks,
    m.subCategory,
    typeLabels[m.type]?.ko,
    typeLabels[m.type]?.en,
    ...(m.tags || []),
  ];
  return fields.some((f) => f?.toLowerCase().includes(lower));
}
```

실제 구현에서는 `nearbyFacilitiesEn` 등 문자열 필드를 배열에 함께 넣고, `tags`는 별도로 순회하는 형태로 통일해도 된다.

### 코드베이스 연결 (구현 후)

- 공통 함수: `lib/media-data.ts`의 **`matchesMediaTextQuery(m, lower)`**
- 목록 필터: `components/media-browse-client.tsx`
- 검색 자동완성: `components/media-search-autocomplete.tsx` (동일 함수 사용)
- DB → `MediaItem` 매핑: `lib/public-media-catalog.ts`의 `prismaMediaToMediaItem`에서 `district`, `city`, `nearbyStations`, `nearbyLandmarks`, `subCategory`, `tags` 등 전달
- 타입: `lib/media-data.ts`의 `MediaItem`에 위 필드가 선택적(optional)으로 정의됨

---

## 6. AI 챗봇 — 싱커드 AI 미디어 플래너

### 개요

- 웹사이트 우측 하단 플로팅 버튼(카카오 버튼 옆)
- 클릭 시 채팅 패널 오픈
- 싱커드 서비스·매체 안내 및 추천(Claude API, 서버 전용)

### 기능

1. **매체 검색/추천** — 예: "강남역 근처 전광판?", "예산 500만원 매체?"  
   - 요청 시 서버가 공개 카탈로그 JSON을 시스템 프롬프트에 포함하고, 모델이 **카탈로그에 있는 항목만** 구체적으로 인용.
2. **웹사이트 안내** — 견적(`/quote`), 성공사례(`/cases`), 매체(`/media`), 문의(`/contact`) 등 경로 안내(Markdown 링크).
3. **OOH 상담** — 초보 질문, DOOH 용어 설명, 업종·예산·목표 확인 후 방향 제안.

### 컴포넌트

- `components/ai-chatbot.tsx` — 플로팅 버튼 + 패널 + 입력
- `components/ai-chatbot-message.tsx` — 사용자/어시스턴트 말풍선(어시스턴트는 Markdown + 내부 `Link`)

### API

- **`POST /api/chat`**
- Body: `{ message: string, history: { role: "user"|"assistant", content: string }[], locale?: "ko"|"en" }`
- 응답: `{ reply: string, media?: AiChatbotMediaCard[] }` — `media`는 툴 검색 결과를 카드로 보여줄 때(최대 6건)
- `ANTHROPIC_API_KEY` 미설정 시 503

### Tool calling (Function calling)

- **`lib/ai-chatbot-tools.ts`** — Anthropic 도구 정의 + 서버 실행
  - **`searchMedia`** — 자유 텍스트로 공개 매체 검색 (`matchesMediaTextQuery` 계열 + 다어절 토큰)
  - **`getMediaByBudget`** — 월 **만원** 기준 `minPrice`~`maxPrice` 필터
  - **`recommendMedia`** — `region` / `type` / `maxPrice` / `goals`·`keywords` 조합 후 점수 정렬
- **`POST /api/chat`**에서 `stop_reason === "tool_use"`일 때 툴 실행 → `tool_result`를 이어 붙여 최대 5라운드까지 반복

### 시스템 프롬프트

- **`lib/ai-chatbot-system.ts`** — **`buildAiChatbotSystemPromptWithTools(locale)`** (툴 모드, 시스템에 전체 JSON 카탈로그 미포함)
- 상단에 **`OOH_EXPERT_PERSONA`**
- 역할·도구 사용 지침·사이트 경로·가격 단위(만원/월)·환각 방지

### 카탈로그 (레거시 JSON 모드)

- **`buildAiChatbotSystemPrompt(locale, catalogJson)`** + **`catalogJsonForPrompt()`** — 참고용; 현재 공개 챗은 툴 모드가 기본

### 배치

- `components/deferred-public-widgets.tsx`에서 `dynamic(..., { ssr: false })` 로 로드
- `/admin` 은 `ConditionalPublicChrome` 밖이 아니라 위젯이 레이아웃에만 있으므로, 필요 시 경로 체크로 숨길 수 있음(현재는 공개 레이아웃 전용).

---

## 변경 이력 (요약)

| 영역        | 주요 파일 예시 |
| ----------- | -------------- |
| About       | `app/[locale]/about/page.tsx`, `messages/*.json` |
| Services    | `app/[locale]/services/page.tsx`, `components/services-faq.tsx` |
| 공통 UI     | `components/section-heading.tsx`, `animated-card.tsx`, `timeline.tsx` |
| 매체 검색   | `lib/media-data.ts`, `media-browse-client.tsx`, `media-search-autocomplete.tsx`, `public-media-catalog.ts` |
| AI 챗봇     | `components/ai-chatbot.tsx`, `ai-chatbot-message.tsx`, `ai-chatbot-inline-media.tsx`, `app/api/chat/route.ts`, `lib/ai-chatbot-system.ts`, `lib/ai-chatbot-tools.ts`, `lib/ai-chatbot-catalog.ts` |
