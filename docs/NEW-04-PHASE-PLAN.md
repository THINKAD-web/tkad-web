# `[NEW-04]` 견적 → 전자서명 계약서 — 단계별 도입 플랜

> 작업 ID: `[NEW-04]` · 작성: 2026-05-16
> 사전 감사 결과 *이미* `OoHQuote / OohContract / 인앱 캔버스 서명 / PDF 생성 / 어드민 상태 전이 / Telegram 알림 / `MediaBooking` 인스턴트 부킹 캘린더 블록` 가 깔려 있습니다. 본 문서는 **무엇이 차이인지** 와 **어느 PR 에 무엇을 담을지** 를 정리합니다.

## 결론

브리프의 핵심 의도(**견적 → 검토 → 수락/수정 → 서명 → 계약 완료 + 캘린더 BLOCK**)는 **대부분 구현돼 있습니다**. 진짜 빠진 건 다음 6 가지뿐이고, 이 중 1·2·3·5·6 은 `Phase A` 한 PR 로 정리할 수 있습니다. 4(외부 e-sign 서비스 연동) 은 별도 PR 로 분리.

| # | 미구현 | Phase | 비고 |
|---|---|---|---|
| 1 | 고객 "**수정 요청**" 플로우 (status 전이 + 메모 저장) | **A** | `OoHQuoteStatus.revision_requested` 추가, `revisionNote/At` 컬럼 |
| 2 | 어드민 "수정 후 재발송 (revision resolve)" 액션 | **A** | `revision_requested → sent` 토글 |
| 3 | **계약 확정 시 가용 캘린더 자동 BLOCK** | **A** | `contract-confirm` 에서 `MediaBooking(confirmed)` 일괄 생성 (멱등) |
| 4 | **모두싸인 / iamsign / eformsign** 등 외부 법적 효력 e-sign | **B** | API 키 발급 + webhook + 본인확인 옵션 활성화 필요 |
| 5 | **Slack 알림** (현재 Telegram 만 존재) | **A** | `SLACK_WEBHOOK_URL` env-gated, 미설정 시 no-op |
| 6 | 광고주 대시보드(`/my`)에 OoHQuote+서명 상태 노출 | **A** | `/api/my/quotes` 응답에 `revisionRequestedAt`, `contractSignedAt` 등 노출 |

## Phase A (본 PR 에 포함)

### Prisma 변경 — additive only
```diff
 enum OoHQuoteStatus {
   draft
   sent
+  revision_requested
   booking_requested
   ...
 }

 model OoHQuote {
   ...
+  revisionRequestedAt DateTime?  @map("revision_requested_at")
+  revisionNote        String?    @map("revision_note") @db.Text
+  revisionResolvedAt  DateTime?  @map("revision_resolved_at")
 }
```
운영에 `prisma db push` 1회 — 기존 행은 모두 null 로 시작, 데이터 손실 없음.

### 신규 API
- `POST /api/quote/[id]/revision-request` — 고객. honeypot + 1분/IP 6회 rate limit. 메모 5–500자 검증.
- `PATCH /api/admin/ooh-quotes/[id]/revision-resolve` — 어드민. status `revision_requested → sent`, `revisionResolvedAt` 기록, 어드민 메모 append.

### 기존 API 변경
- `PATCH /api/admin/ooh-quotes/[id]/contract-confirm` — 캠페인 생성 + 상태 전이는 그대로. **추가**로 모든 `mediaIds` 에 대해 `MediaBooking(confirmed, campaignId=새 캠페인)` 을 `createMany + skipDuplicates` 로 일괄 생성. `endsAt` 누락 시 `estimateEndDate(start, periodKey)` 로 보정.
- `POST /api/quote/[id]/contract/sign` — 기존 Telegram·내부 webhook 옆에 `notifyOohQuoteEvent()` Slack 호출 추가 (env 없으면 no-op).
- `GET /api/quote/[id]/detail` — `revisionRequestedAt`, `revisionNote`, `revisionResolvedAt` 추가 노출.
- `GET /api/my/quotes` — 위 필드 + `oohContract.status/signedAt` join 으로 진행률 데이터 노출.

### UI
- `components/quote/quote-preview-view.tsx` — "수정 요청" 버튼 + 모달, revision_requested / revision_resolved 배너, "수락하고 계약 진행" 라벨로 명확화.
- `components/my/quote-status-badge.tsx` — `sent`(검토 대기) / `revision_requested`(수정 요청) 라벨 추가.

### 새 유틸
- `lib/slack-notify.ts` — Incoming Webhook 헬퍼 (`SLACK_WEBHOOK_URL` env-gated). 6 초 timeout, 실패해도 호출 측 흐름 막지 않음.

## Phase B (별 PR 권장)

### 모두싸인 / iamsign 외부 전자서명 통합

선택지(권장순):

1. **모두싸인 (modusign)** — 한국 시장 점유율 높고 본인확인(휴대폰/공동인증) 지원. SaaS 플랜 명확.
2. **이폼사인 (eformsign)** — 한컴 계열, 대기업 친화. API 풍부.
3. **아임서명 (iamsign)** — 가격 경쟁력.

각 SDK 가 요구하는 작업 (모두 모두싸인 기준):

1. **계정/API 키 발급** — 모두싸인 대시보드 → 개발자 → API 키 생성 + redirect/webhook 등록. 운영/스테이징 별도 키 필수.
2. **env**: `MODUSIGN_API_KEY`, `MODUSIGN_API_USER`, `MODUSIGN_TEMPLATE_ID`, `MODUSIGN_WEBHOOK_SECRET`.
3. **새 모델 컬럼** `OohContract`:
   - `provider: String?` (e.g. `"modusign"`)
   - `providerDocumentId: String?`
   - `providerSignerUrl: String?`
   - `providerStatus: String?` (provider 측 상태 미러)
   - `providerCompletedAt: DateTime?`
4. **새 라우트**
   - `POST /api/quote/[id]/contract/sign/modusign/start` — 모두싸인 문서 생성 + 서명 URL 발급 + DB 저장
   - `POST /api/webhook/modusign` — webhook 수신, signature 검증, `OohContract.status = signed` + PDF 다운로드 후 Cloudinary 저장
5. **UI**: 기존 캔버스 서명 패드와 동급의 "모두싸인으로 서명" 버튼. provider env 가 설정된 경우만 노출. 사용자 본인확인 옵션 default on.
6. **법적 효력 메타**: 서명 완료 PDF 의 SHA-256 + provider audit trail 다운로드를 별도 보관.

### 추가 후보 (장기)
- 견적/계약 PDF 자동 워터마크 (서명 후 변조 방지)
- 위약/지연 페널티 조항 토글
- 카카오 알림톡 — Telegram/Slack 대체 또는 보완 (`KAKAO_ALIMTALK_*` env)

## 영향도 / 위험

| 항목 | 위험 | 완화 |
|---|---|---|
| 스키마 변경 | enum value 추가는 Postgres `ALTER TYPE ADD VALUE` 필요 | `prisma db push` 가 자동 처리. 운영 직전 1회 push. |
| `MediaBooking` 자동 생성 | 같은 mediaId 에 이미 confirmed 가 있으면 중복 위험 | `createMany skipDuplicates` + 사전 조회 가드 |
| Slack 알림 | 미설정 시 호출 측 에러 | env 미설정이면 helper 가 false 반환 + 모든 호출이 `void ... .catch(() => {})` |
| 기존 인앱 서명 | 그대로 동작 | Phase B 가 별 PR 이므로 토글 단계로 점진 도입 가능 |
