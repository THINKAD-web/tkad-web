# THINKAD `/ko/insights` 자동 발행 사이클 핸드오프

작성일: 2026-04-25
다음 작업 재개 예정: 2026-04-27 (월)

---

## 1. 컨텍스트

### 프로젝트
- **레포**: `thinkad-web/tkad-web` (Next.js 16 App Router + React 19 + Prisma 7 + Neon Postgres + next-intl)
- **현재 브랜치**: `main` (모든 작업 머지됨)
- **사용자 역할**: 운영자, 코드 리뷰는 가볍게, "다 하고 한번에 확인할께" 패턴 선호. 머지 권한 위임함.

### 직전 사이클 (2026-04-25 마무리)
"AI 트렌드 리포트 자동 발행" 시스템 5 PR 완성:

| PR | 내용 | 상태 |
|---|---|---|
| #49 | cron + 스키마 (slug, generation_method, ai_model, month nullable) | merged + Neon SQL 적용 완료 |
| #50 | Tavily 웹 검색 + 자체 매체 DB 인사이트 (sources, internal_data_used) | merged + Neon SQL 적용 완료 |
| #51 | 자동 검증 레이어 (validation_score, validation_result, 4축 25점) | merged + Neon SQL 적용 완료 |
| #52 | Slack 알림 + 어드민 검증 결과 패널 | merged (DB 변경 없음) |
| #53 | 공개 상세 `/ko/insights/[slug]` + AI 배너 + 출처 + JSON-LD + RSS + sitemap | merged (DB 변경 없음) |

### 직전 직전 사이클 (같은 날 오전)
"매체 상세 페이지 고도화" PR #45 (PR-A~G 통합):
- `Media.trafficPattern` (JSONB), `SuccessCase.mediaIds` (TEXT[]) 신규
- 시간대 차트, 거리 정렬, Kakao 로드뷰, sticky CTA, JSON-LD Place, sitemap 매체 포함
- 핫픽스 PR #46~48 (silent mock fallback 제거, CLAUDE.md 준수)

---

## 2. 시스템 동작 흐름

```
[Vercel Cron 월/목 09:00 KST = 00:00 UTC] vercel.json
  ↓
[Auth: CRON_SECRET Bearer 헤더 검증]
  ↓
[Promise.all] Tavily 웹 검색 + 자체 매체 DB 인사이트 병렬 수집
  ↓ (각 fetcher try/catch + [] 폴백 — 한 소스 실패해도 진행)
[generateTrendReport(month, context)]
  Claude Sonnet 4.5 (env ANTHROPIC_MODEL 로 4.6 가능)
  user 프롬프트에 webSources [n] + internal data 주입
  ↓
[validateTrendReport(draft, sources)]
  Claude self-check 별도 호출, 4축 (factual/legal/tone/seo) 25점씩
  normalizeResult: critical 이슈 있으면 verdict 강제 fail
  ↓
[verdict 분기]
  pass    (80+ & critical 0)  → status="published" + publishedAt=now
  warning (60~80 또는 warning) → status="published" + publishedAt=now
  fail    (60 미만 또는 critical) → status="draft" 유지
  검증 자체 실패 → status="draft" + Slack 시스템 알림
  ↓
[DB 저장] (status, slug=auto-YYYY-MM-DD-mon, sources, internalDataUsed,
           validationScore, validationResult, aiModel, generationMethod="auto")
  ↓
[fire-and-forget Slack 알림]
  pass    → SLACK_WEBHOOK_URL (info)
  warning → SLACK_WEBHOOK_URL_WARNINGS → fallback main (warning)
  fail    → SLACK_WEBHOOK_URL_BLOCKED → fallback main (error)
  ↓
[공개 노출 — published 만]
  /ko/insights 리스트 카드 ("온라인 보기" 버튼 → Link)
  /ko/insights/<slug> 상세 (AI 배너 + TL;DR + 마크다운 + 출처 + JSON-LD)
  /sitemap.xml (slug 동적 포함)
  /feed.xml (RSS 2.0)
```

---

## 3. 핵심 파일 맵

```
신규 (PR-1~5)
  prisma/sql/2026_05_trend_report_auto_fields.sql        [PR-1]
  prisma/sql/2026_05_trend_report_research_fields.sql    [PR-2]
  prisma/sql/2026_05_trend_report_validation.sql         [PR-3]
  app/api/cron/generate-trend-report/route.ts            [PR-1, 2, 3, 4]
  app/api/admin/ai/validate-trend-report/route.ts        [PR-3, 4]
  app/[locale]/insights/[slug]/page.tsx                  [PR-5]
  app/feed.xml/route.ts                                  [PR-5]
  components/insights/ai-generation-banner.tsx           [PR-5]
  components/insights/markdown-body.tsx                  [PR-5]
  components/insights/sources-section.tsx                [PR-5]
  lib/insights/keyword-pool.ts                           [PR-2]
  lib/insights/trusted-domains.ts                        [PR-2]
  lib/insights/types.ts                                  [PR-2]
  lib/insights/sources/tavily.ts                         [PR-2]
  lib/insights/sources/internal.ts                       [PR-2]
  lib/insights/validators/auto-validator.ts              [PR-3]
  lib/insights/notifiers/slack.ts                        [PR-4]

수정
  prisma/schema.prisma                                   [PR-1, 2, 3]
  vercel.json                                            [PR-1]
  lib/ai-content-generator.ts                            [PR-1, 2, 3]
  lib/content-mappers.ts                                 [PR-1, 5]
  lib/insights-reports.ts                                [PR-5]
  lib/structured-data.ts                                 [PR-5]
  app/sitemap.ts                                         [PR-5]
  app/[locale]/insights/insights-page-client.tsx         [PR-5]
  app/[locale]/admin/(dashboard)/ai-content/edit/[id]/
    ai-content-edit-client.tsx                           [PR-4]
  .env.production.example                                [PR-2, 4]
```

---

## 4. ⚠️ 데이터 안전 규칙 (절대 금지)

이 세션에서 사고 1번 + 핫픽스 3개로 학습한 규칙들. 새 Claude 도 반드시 준수:

### 4-1. Prisma / DB
- ❌ **`prisma db push` 절대 금지** — schema 와 DB 직접 동기화 시도 금지
- ❌ **`prisma migrate reset` 절대 금지** — 데이터 전체 초기화 위험
- ❌ **`--accept-data-loss` 플래그 절대 사용 금지**
- ✅ 모든 스키마 변경은 `prisma/sql/2026_NN_*.sql` 파일로:
  - `DO $$ BEGIN ... END $$;` 로 감싸 idempotent 보장
  - `IF NOT EXISTS` / `IF EXISTS` 체크
  - `CREATE INDEX IF NOT EXISTS`
- ✅ 사용자가 **Neon SQL editor 에서 직접 실행** — 자동화 X
- ✅ 머지 전 PR 본문 상단에 "🚨 Neon SQL 실행 필요" 명시

### 4-2. Neon
- ❌ **Neon 의 "Set as default" 건드리지 말 것** — 사용자가 명시적으로 금지함
- ⚠️ Neon 에 여러 branch 존재 (Production / Preview 등). SQL editor 좌상단에서 어떤 branch 인지 확인 필요
- ⚠️ Vercel Production scope `DATABASE_URL` 의 host 가 가리키는 branch ≠ SQL editor 가 보고 있는 branch 인 경우 흔함 → 데이터 안 보이는 사고 발생 가능

### 4-3. Vercel
- ⚠️ env 변수는 **scope 3개** (Production / Preview / Development) 각각 따로 등록
- 진짜 사용자가 보는 prod 도메인 = **Production scope** 사용. Preview scope 만 등록되어 있으면 prod 가 빈 상태
- 이미 동작 중인 cron (`admin-digest`, `followup-reminders`) 가 사용하던 `CRON_SECRET` 은 같은 값 재사용 (insights cron 도 같은 시크릿)

### 4-4. Mock 데이터 절대 금지 (CLAUDE.md 핵심 규칙)
- 공개 매체 목록·상세는 `fetchPublicMediaCatalog` (DB 경로) 가 진실
- catch 블록에서 silent 하게 mock 으로 떨어지면 **운영자가 사고를 인지 못 함** → 큰 사고
- 현재 `lib/public-media-catalog.ts` 는 catch 시 **빈 배열 반환 + console.error** 로 수정됨 (PR #47)
- 클라이언트 (`media-browse-client.tsx`) 의 `mediaData` 폴백도 제거됨 (PR #48)
- 새 코드 작성 시 **catch 에서 mock 으로 떨어지지 말 것** — 빈 상태 UI 가 사고를 노출시킴
- ※ 단, `media-browse-client.tsx:158` 은 **사용자가 의도적으로 mediaData 폴백 복원** 했음 (배포 테스트 흔적). 이것은 그대로 유지 — 건드리지 말 것

### 4-5. 작업 금지 동작
- ❌ `git push --force` 메인 브랜치
- ❌ `--no-verify`, `--no-gpg-sign` 으로 hook 우회
- ❌ 사용자 인증 없이 서비스 키·DB·env 변경
- ❌ 큰 변경을 한 PR 에 몰아넣기 (CLAUDE.md "큰 변경 분할", < 600줄 권장)

---

## 5. 월요일 검증 체크리스트

다음 월요일 09:00 KST 에 첫 자동 cron 실행. 그 전후로:

### A. 사전 환경변수 등록 (Vercel Production scope, 선택)
없어도 cron 동작하지만 등록하면 풍부해짐:

```
TAVILY_API_KEY=tvly-...
  https://app.tavily.com/ 무료 1k/월
  미설정 시 외부 출처 인용 없음 (LLM 내부 지식만)

SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...
  Slack App → Incoming Webhooks → 채널 선택
  미설정 시 알림 silent skip

(옵션) SLACK_WEBHOOK_URL_BLOCKED=https://hooks.slack.com/.../#content-blocked
(옵션) SLACK_WEBHOOK_URL_WARNINGS=https://hooks.slack.com/.../#content-warnings
```

### B. 수동 테스트 (월요일 정시 기다리기 싫으면)
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
  https://<prod-host>/api/cron/generate-trend-report
```

응답 정상 예시:
```json
{
  "ok": true,
  "slug": "auto-2026-04-27-mon",
  "id": "...",
  "status": "published",
  "elapsedMs": 12345,
  "aiModel": "claude-sonnet-4-5-20250929",
  "sourcesCount": 6,
  "internalInsightsCount": 5,
  "keywordsUsed": ["...", "..."],
  "validation": {
    "score": 87,
    "verdict": "pass",
    "issuesCount": 1,
    "criticalCount": 0
  }
}
```

### C. 공개 페이지 확인
1. `/ko/insights` → 새 auto 카드 표시, "온라인 보기" 클릭
2. `/ko/insights/auto-...-mon` → AI 배너 + TL;DR + 마크다운 본문 + 출처 섹션 정상
3. View source → `<script type="application/ld+json">` 2개 (Article + BreadcrumbList) 노출
4. `/feed.xml` → RSS 응답 (Content-Type: `application/rss+xml`)
5. `/sitemap.xml` → `/insights/<slug>` URL 포함
6. Google Rich Results Test → Article schema 통과

### D. 어드민 확인
1. `/ko/admin/ai-content` → 새 row 표시 (status badge 확인)
2. 클릭 → edit 페이지 진입
3. 검증 결과 카드 (verdict 별 색상) + "재검증" 버튼
4. 4축 점수 + 이슈 목록 (있으면)

### E. Slack 메시지 확인
- 검증 verdict 따라 알림 도착 (registered 상태에서)
- "어드민에서 보기" / "공개 페이지" 버튼 동작

---

## 6. 알려진 미해결 항목 / 후속 작업 후보

### 6-1. 의뢰서 §10 미반영 (의도적 압축)
- 카테고리/태그 별도 페이지 (`/ko/insights/category/<slug>`) — 리스트 필터로 대체
- 댓글 시스템 — 비활성, 트래픽 본 후 결정
- 영문 자동 번역 발행 — 한국어만 우선
- 비용 모니터링 대시보드 — DB 비용 기록만 (현재는 `appendGenerationLog` 만 있음)
- 도메인 화이트리스트 어드민 UI — 현재 정적 (`lib/insights/trusted-domains.ts`)
- 키워드 풀 어드민 UI — 현재 정적 (`lib/insights/keyword-pool.ts`)

### 6-2. 발견 시 손볼 만한 작은 항목
- TrendReport `relatedMediaIds` 미구현 (PRD 언급, 현재 schema 없음). 매체 상세 ↔ 인사이트 양방향 링크 추가하려면 schema 확장 필요
- AI 자동 생성 콘텐츠 본문에 매체 인라인 링크 (`[매체명](/ko/media/<id>)`) 자동 변환은 미구현 — 필요 시 prompt 또는 markdown 렌더 단계에서 후처리
- 첫 자동 트리거 후 LLM 결과물 품질 보고 verdict 분포 확인 (pass 비율 높이기 위해 prompt 미세 조정 가능)
- `lib/insights/sources/internal.ts` 의 5개 인사이트 헬퍼 — 트래픽 보고 더 추가 가능 (지역 트렌드 변화, Planner 평균 예산대 등 PRD §1-2 모듈 B 일부 미반영)

### 6-3. 다음 큰 작업 후보
- 사용자가 별도 작업 의뢰할 예정 (이 핸드오프와 별개)

---

## 7. 운영 명령어 모음

```bash
# 타입체크 + lint
npx tsc --noEmit
npx eslint <path>

# Prisma 클라이언트 재생성 (스키마 변경 후)
npx prisma generate
# ※ db push 는 절대 사용 금지

# 어드민 수동 트렌드 리포트 생성 (월간, month unique 사용)
POST /api/admin/ai/generate-trend-report
body: { "month": "2026-05" }

# 어드민 수동 검증 재실행 (자동/수동 구분 없음)
POST /api/admin/ai/validate-trend-report
body: { "id": "<TrendReport.id>" }

# Cron 수동 호출 (테스트)
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://<host>/api/cron/generate-trend-report

# RSS 확인
curl -i https://<host>/feed.xml
```

---

## 8. 사용자 결정 기록 (재확인 불필요)

이 사이클에서 결정된 사항 — 새 Claude 가 다시 묻지 말 것:

| 항목 | 결정 |
|---|---|
| 페이지 명칭 | `/ko/insights` (기존 유지) |
| DB | Neon Postgres + Prisma 의 `TrendReport` 확장 (Supabase 추가 X) |
| 웹 검색 API | Tavily |
| 썸네일 전략 | 템플릿 기반 (현재 미구현, 트래픽 후 결정) |
| 발행 빈도 | 주 2회 월/목 09:00 KST |
| Slack | 채널 사용 (단일 webhook + 옵션 분리) |
| AI 모델 | Claude Sonnet 4.6 (env `ANTHROPIC_MODEL` 로 override) |
| 다국어 | 한국어만 우선, 영어 추후 |
| 댓글 | 비활성 |
| 법무 검토 | 면책 조항만 적용, 별도 변호사 검토 추후 |
| 어드민 페이지 | 기존 `/admin/ai-content/edit/[id]` 위에 검증 패널만 추가 |

---

## 9. 새 Claude 에게 전달할 첫 메시지 템플릿

```
THINKAD/tkad-web 프로젝트에서 작업합니다. docs/HANDOFF-insights-2026-04-25.md
읽고 컨텍스트 잡아주세요.

[새 작업 요청 내용 여기]

작업 시작 전 주의:
1. /ko/insights 자동 발행 시스템 (PR #49~53) 은 이미 완성·머지됨 —
   그 위에 추가하거나 별개 작업
2. 데이터 안전 규칙 (§4) 절대 준수 (prisma db push 금지, mock 폴백 금지)
3. 큰 변경은 PR 분할, 각 PR 에서 머지 + Neon SQL 실행 + 다음 PR 패턴
4. CLAUDE.md / AGENTS.md 의 "Mock 금지" 규칙 위반하지 말 것
```
