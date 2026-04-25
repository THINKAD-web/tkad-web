<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Media catalog data source

- **Keep `fetchPublicMediaCatalog` (DB-backed) as the source of truth** for public media listing and detail flows. Do not swap it for mock data, static samples, or JSON-only catalogs in production paths.
- 목업·샘플 데이터로 교체하지 말 것 — 공개 매체 목록/상세는 DB 경로(`fetchPublicMediaCatalog`)를 유지할 것.

## Planner (`/[locale]/planner`) 아키텍처

- 상태: Zustand store `lib/planner/store.ts` (단일 소스). `usePlannerStore`.
  localStorage key `tkad-planner-plan-v2` 로 입력만 persist. `wizardStep`, `creativeObjectUrl` 은 비persist.
- 6단계 순서(고정): 목표 → 타깃·지역 → 예산·기간 → 매체 선택(AI 추천) → 로고+합성 → 보고서.
  단계 상수: `PLANNER_LAST_INPUT_STEP = 6`, `PLANNER_RESULT_STEP = 7` (`lib/planner/types.ts`).
- 검증: `canProceedFromStep()` in `lib/planner/validation.ts`. 단계 변경 시 반드시 이 함수 경유.
- 추천: `lib/planner/recommend.ts` — 규칙 기반 5가중치 스코어링. 목표별 가중치 분포는
  `WEIGHTS_BY_GOAL` 수정. LLM 확장 시 scoreMedia 인터페이스 유지하면서 새 구현체 추가.
- 합성 미리보기: `components/planner/composite-preview.tsx` — CSS 오버레이, pointer events 기반
  드래그/리사이즈. 좌표는 `mediaPlacements[mediaId]` 로 store 에 저장.
- 업로드: Cloudinary signed upload (`/api/planner/creative/sign`) — 전용 폴더
  `tkad/planner/creative`. 서명 + XHR upload 헬퍼 `lib/planner/creative-upload.ts`.
- 저장/공유: Prisma `SavedPlannerPlan` (30일 TTL). API `/api/planner/save`,
  `/api/planner/shared/[id]`. 공개 페이지 `app/[locale]/planner/shared/[id]/page.tsx`.
- PDF: 기존 `lib/html-to-pdf.ts` 패턴 유지(html2canvas + jsPDF, onclone 색상 정규화).
  `PlannerReportPreview` 에 logoUrl + mediaPlacements 전달되어 썸네일에 합성 로고 포함.
- 단계별 Tips: `components/planner-tips.tsx` wizardStep → tipKey 매핑 — 단계 순서 변경 시 동기화 필요.

## 매체 상세 (`/[locale]/media/[id]`) 아키텍처

- 페이지: `app/[locale]/media/[id]/page.tsx` (Server Component, 800+줄)
  서버에서 `resolveMediaForDetail(id)` + `fetchPublicMediaCatalog()` + `getSuccessCasesForMedia(id)` 병렬 fetch.
- 핵심 KPI 위젯: `components/media-detail-performance.tsx`
- 시간대/요일/월별 트래픽: `components/media-detail/traffic-charts.tsx`
  `lib/media-traffic-estimate.ts` 의 추정 헬퍼 사용. DB `Media.trafficPattern` (JSONB) 미입력 시 자동 폴백 + "추정치" 뱃지.
- 합성 로드뷰: `components/media-detail/roadview-card.tsx` — Kakao 로드뷰 임베드, 사용자 클릭 후 iframe 로드 (성능).
- 사례 연결: `SuccessCase.mediaIds: String[]` ↔ `getSuccessCasesForMedia()` 양방향. `mediaUsed` (카테고리 텍스트) 와 별도 운영.
- Sticky CTA: `components/media-detail/sticky-cta.tsx` (desktop) + `components/media-detail-sticky-cta.tsx` (mobile).
  3종: Planner / 비교 / 견적. Planner 진입은 `/planner?addMedia=<id>`.
- 추천 매체: `MediaSimilarCarousel` 의 `sortable` prop — 정렬 토글(score/distance/price/visibility).
  거리 계산은 `haversineKm` (lib/media-data.ts).
- SEO: `lib/structured-data.ts` 의 `buildMediaPlaceJsonLd` + `buildMediaBreadcrumbJsonLd`. `app/sitemap.ts` 에서 모든 활성 매체 ID 동적 포함.
- 비교 페이지: `app/[locale]/compare/page.tsx` + `compare-spec-table.tsx`. localStorage `tkad-compare-cart-v1`. 차이점 자동 하이라이팅(getBestIdx) + 매체별 "Planner 시작" 칩.
