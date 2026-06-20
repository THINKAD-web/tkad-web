# 유료 API 서버 게이트 전수 점검 (2026-06-20)

## 이번 PR에서 수정한 구멍

| 엔드포인트 | 이전 | 이후 |
|-----------|------|------|
| `POST /api/planner/report/export` | 인증·PRO 없음 | `requirePlannerPdfAccess()` |
| `GET /api/compare/pdf` | 인증·PRO 없음 | `requirePlannerPdfAccess()` |
| `POST /api/planner/email-report` | 인증·PRO 없음 | `requirePlannerPdfAccess()` |
| `POST /api/quote/email-pdf` | IP rate limit만 | `requirePlannerPdfAccess()` |

## 이미 서버 검증 있음 (변경 없음)

| 엔드포인트 | 검증 |
|-----------|------|
| `POST /api/studio/proposal/generate` | `requirePlannerPdfAccess` |
| `POST /api/studio/proposal/pptx` | `requirePlannerPdfAccess` |
| `GET /api/media/[id]/proposal` | `checkReportAccess(planner_pdf, detail_data)` |
| `GET /api/quote/[id]/pdf` | `requirePlannerPdfAccess` |
| `GET /api/quote/[id]/pptx` | `requirePlannerPdfAccess` |
| `POST /api/quote/export` | `requirePlannerPdfAccess` |
| `GET /api/insights/market` | `checkReportAccess(market_dashboard)` |
| `GET /api/insights/market/export` | `checkReportAccess(market_dashboard)` |
| `GET /api/insights/competitive` | `checkReportAccess(competitor)` |
| `POST /api/recommend/parse` | `resolveIsPro` + `enforceAiRateLimit` |
| `POST /api/recommend` | `enforceAiRateLimit` |
| `POST /api/planner/recommend` | `enforceAiRateLimit` |
| `POST /api/chat` | `enforceAiRateLimit` |
| `GET /api/v1/insights/market` | ENTERPRISE API key only |

## 의도적 공개 / 별도 권한 모델 (게이트 미적용)

| 엔드포인트 | 사유 |
|-----------|------|
| `GET /api/proposal/[id]` | 만료 토큰 공유 링크 (의도적 공개) |
| `GET /api/v1/media`, `.../availability` | API 키 월 한도로 제한 (플랜별) |
| `POST /api/quote` | 무료 견적 요청 (리드) |
| `GET /api/my/dashboard/campaigns/[id]/report` | 로그인 + 캠페인 소유권 |
| Admin `*` routes | 관리자 세션 |

## 2단계에서 처리 예정 (UI·한도·가격표)

- 클라이언트 전용 `PlannerProGate` / `PlannerPdfDownloadGate` → `lib/entitlements.ts` 단일 소스
- 카트 FREE 10 / PRO 30 복원
- 플래너 Step 7 서버 측 결과 API (현재 클라이언트 계산만)
- `POST /api/my/api-keys` ENTERPRISE self-assign 차단
- 1회 무료 PDF (`free-pdf-status`) UI 연동 또는 제거

## PRO 회귀 체크리스트

- [ ] PRO / PRO_TRIAL 사용자: 플래너 PDF·PPT export 200
- [ ] PRO 사용자: 비교 PDF API 200
- [ ] PRO 사용자: 플래너 이메일 보고서 200 (SMTP 설정 시)
- [ ] PRO 사용자: 견적 이메일 PDF 201
- [ ] FREE 로그인: 위 엔드포인트 403
- [ ] 비회원: 위 엔드포인트 401
