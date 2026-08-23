# Phase C-lite — 광고주 제안서 보내기 (2026-08-23)

**상태:** 착수 (C-lite 1차)  
**전제:** Q-1/Q-2 quote_only·예산 정직성 머지 (#455), 프로덕션 마이그레이션 검증 완료  
**판정 기준:** *「이 PDF를 이메일에 그대로 첨부해도 되는가?」*

## 목표

플래너 보고서를 **내부 검토용 산출물**에서 **광고주 전달용 제안서**로 한 단계 끌어올린다.  
계산·KPI 잠금(Phase B 원칙)은 유지하고, **표지·각주·섹션 노출**만 손댄다.

## C-lite 1차 범위 (이번 착수)

| 항목 | 설명 | 계층 | 구현 상태 |
|------|------|------|-----------|
| **C-1 광고주명** | 표지·slim 헤더 `clientName` — 미리보기에서 입력 | 자유 | ✅ localStorage + SavedPlan |
| **C-2 제안 일자** | `generatedAt` 표지·헤더 (기존) | — | ✅ 이미 있음 |
| **C-3 표지 로고** | Step 5 업로드 로고 → 표지 우측 (PDF/PPT/웹) | 자유 | ✅ `creativeUploadedUrl` persist |
| **C-4 VAT·제작비 각주** | `mediaPriceExclNoteText` 기반 푸터 — RFP 견적과 동일 톤 | 고지 (숫자 무관) | ✅ `pricingFootnote` |
| **C-4b CPM 각주** | 협의가 제외 분모 노출 명시 + 유형별 CPM 분모 수정 | 고지 | ✅ `cpmFootnote` |
| **C-5 섹션 on/off** | `sectionVisibility` 패널 → PDF/PPT/웹 동기화 | 자유 | ✅ 기존 (패리티 유지) |
| **C-6 문서 제목** | `documentTitle` 인라인 편집 | 자유 | ✅ localStorage + SavedPlan |

## 비범위 (C-lite 1차)

- KPI·도넛·CPM·합계 수동 편집 (잠금 계층)
- 할인율·제작비 라인 입력 (Phase B-3 / C-full)
- 인사말·전략 요약 자유 문단 편집 (C-full)
- 이메일 리포트 API 본문·첨부 개편 (별도)
- `matching-engine` / 추천 스코어 변경
- 지도 섹션 PDF 임베드 (미리보기 전용 유지)

## 데이터·페이로드

```ts
PlannerReportExportPayload {
  documentTitle, campaignName, clientName?, coverLogoUrl?,
  generatedAt, pricingFootnote?,  // 신규
  disclaimer, currencyFootnote?, quoteOnlyNotice?, …
}
```

- `pricingFootnote`: `buildOohReportPayload` / `buildIntegratedReportPayload` 에서 항상 생성 (RFP와 동일 SSOT `mediaPriceExclNoteText`).
- `clientName` / `coverLogoUrl`: Zustand persist (`reportClientName`, `creativeUploadedUrl`) + SavedPlan `planJson`
- `documentTitle`: `reportDocumentTitle` persist + SavedPlan

## UI (Step 7)

1. 미리보기 히어로 — 제목(기존) + **광고주명(선택)** + 업로드 로고 썸네일
2. 섹션 노출 패널 (기존)
3. PDF/PPT 다운로드 — 편집된 payload 그대로

## Export 패리티

| 표면 | 표지 clientName | 표지 로고 | pricingFootnote | 섹션 토글 |
|------|-----------------|-----------|-----------------|-----------|
| 웹 미리보기 | ✅ | ✅ | ✅ 푸터 | ✅ |
| PDF | ✅ | ✅ | ✅ 면책 블록 | ✅ |
| PPT | ✅ | ✅ | ✅ 마지막 슬라이드 | ✅ |

푸터 순서: `currencyFootnote` → `pricingFootnote` → `disclaimer` (기존 quote_only 등 인라인 안내는 본문 유지).

## 검증 체크리스트

- [ ] 광고주명 입력 시 PDF 표지 하단·slim 헤더·PPT 표지에 반영
- [ ] 로고 업로드(Step 5) 후 보고서 표지 우측에 표시 (없으면 생략)
- [ ] PDF/PPT/웹 푸터에 「제작비·부가세 별도」 문구
- [ ] quote_only 포함 시 Q-2 안내(문의·확정 합계)와 각주 공존, 숫자 불변
- [ ] 섹션 off → PDF/PPT에서 해당 블록 미출력 (회귀)
- [ ] `npx vitest run lib/planner-report-export` 통과

## 권장 후속 (C-full / Phase B-3)

1. `clientName`·`documentTitle` localStorage / SavedPlan 스냅샷 persist
2. 인사말·Executive summary 자유 편집 블록
3. 제한 편집: 할인율·제작비 (재계산 경로)
4. 이메일 리포트 — export payload PDF 첨부

## 관련 파일

- `lib/planner-report-export/types.ts`, `payload-ooh.ts`, `format-export-budget.ts`
- `lib/planner-report-export/build-pdf.ts`, `build-pptx.ts`
- `components/planner/report-document.tsx`, `components/planner-report-step.tsx`
- `components/document/document-layout.tsx` (`DocumentGradientHero`)
- `lib/media-price-format.ts` (`mediaPriceExclNoteText` SSOT)
