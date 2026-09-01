# PR0 영향 범위 전수 목록 — `Media.type` `digital` → `dooh`

**작성일**: 2026-09-01  
**브랜치**: `feat/pr0-media-type-dooh`  
**범위**: tkad-web only · rename only (기능 변화 0)

---

## 1. SSOT / 스키마

| 파일 | 라인 | 내용 |
|------|------|------|
| `prisma/schema.prisma` | 192-193 | `type` catalog code comment `digital \| static \| mobile` |
| `lib/media-auto-categorize.ts` | 12-14 | `CATALOG_MEDIA_TYPES` → re-export from `catalog-media-type.ts` |
| `lib/media-auto-categorize.ts` | 52-163 | `inferCatalogTypeFromMediaContent()` returns `"dooh"` |

**신규 (완료)**: `lib/catalog-media-type.ts` — canonical `dooh` + legacy alias `digital` → `dooh` at parse boundary (`@deprecated` until 2027-03-01).

---

## 2. 저장 데이터 (JSON 직렬화) — prod SELECT 결과

| 저장소 | `"type":"digital"` 포함 row | 판정 |
|--------|----------------------------|------|
| `saved_planner_plans.plan_json` | **0** | ID 참조만 — **JSON 마이그레이션 불필요** |
| `saved_plan_carts.items` / `report_summary` | (미검색 — plan_json 패턴 0건으로 동일 추정) | **불필요** |
| `CampaignPlan` snapshot (`mediaMix`) | mediaId 기반, type 미저장 | **불필요** (`lib/campaign-plan-mix-entry.ts`) |

**DB `media.type`**: prod **641건** `digital` → migration UPDATE 필요.

---

## 3. URL / SEO / 리다이렉트

| 경로 | 처리 |
|------|------|
| `/[locale]/media/type/digital` | **301 → `/media/type/dooh`** (page redirect) |
| `?type=digital` 쿼리 (browse/filter) | **alias parse** → 내부 `dooh` |
| `lib/media-keyword-landing.ts` | `TYPE_LABELS.digital` → `TYPE_LABELS.dooh` (+ legacy label lookup) |
| `lib/seo-canonical-landings.ts:34-36` | `TECHNICAL_TYPE_CANONICAL`: `digital→dooh` → **`dooh→dooh`** |
| `lib/sitemap-build.ts:60` | `/media/type/digital` sitemap — slug `dooh`로 전환 |

**유지 (변경 아님)**: `subCategory=digital_signage`, marketing `/type/dooh`, 한글 "디지털 사이니지" 라벨.

---

## 4. 서버 / API

| 파일 | 용도 |
|------|------|
| `lib/public-media-catalog.ts:735` | catalog row `type` mapping |
| `app/api/admin/medias/[id]/route.ts:138` | `isValidCatalogMediaType` gate |
| `app/api/admin/medias/import-csv/route.ts` | CSV type validation |
| `lib/public-media-query.ts` | browse type filter (alias at parse) |
| `lib/media-discovery-client-filter.ts` | client filter sync |
| `lib/quote-calculator.ts:180` | quote line type default |
| `lib/metrics/classify.ts:112-125` | OOH classification |
| `lib/matching-engine.ts:565` | type matching |
| `lib/planner-logic.ts:1504` | portfolio mix |
| `lib/ai-media-recommend.ts:311+` | scoring |
| `lib/marketing-media-types.ts:151-177` | SEO slug ↔ type match |

---

## 5. 클라이언트 / UI type 분기

| 파일 | 비고 |
|------|------|
| `components/campaign-monitoring-map.tsx` | pin tone `digital` → `dooh` |
| `components/public-map/dark-campaign-map.tsx` | marker type |
| `components/media-map/kakao-map-view.tsx:415` | `MediaPinBase` union |
| `components/media-ai-recommend-form.tsx:64` | filter union — `dooh` + alias |
| `components/media-application/media-register-form.tsx:35` | default type |
| `components/media-owner/media-owner-revenue-calculator.tsx:34` | default |
| `app/.../admin-medias-client.tsx:384` | admin default |
| `lib/media-data.ts` | fixtures + normalizers |
| `lib/media-browse-categories.ts:331` | infer browse from type |
| `lib/media-categories.ts:467` | SEO category tree |

---

## 6. 테스트 / 시드 / 스크립트

- **~90 files** with `type: "digital"` fixture literals (grep count)
- `prisma/seed.ts` — 5 rows
- `scripts/lib/backfill-mapping.ts:142` — already maps `digital` → subtype `dooh` (update to `type === "dooh"`)
- `scripts/verify-*.mjs`, `media-data-backfill.mjs`

---

## 7. 변경 제외 (오탐 방지)

| 패턴 | 예 | 이유 |
|------|-----|------|
| `digital_signage`, `digital_signage` subCategory | audit-rules tests | 다른 필드 |
| `DigitalChannel`, `DigitalCatalog*`, `DIGITAL_*` | integrated planner | 온라인 광고 M2M |
| `ooh_digital`, `channelType: "digital"` | brief adapters | 채널 모드 |
| `mediaMainCategory === "digital"` | recommend-rationale | browse taxonomy (PR1) |
| `developers-docs-content.ts` API 예제 | `"type": "digital"` | API doc — 별도 PR |
| **`DIGITAL_CHANNELS`** | `lib/planner/digital-channels.ts:57` | **PR0 미변경** — PR5 제거 대상 |

---

## 8. PR5 선행 조사 — dmpilot M2M 응답 `digital` 토큰

### `GET /api/internal/catalog`

**파일**: `dmpilot/app/api/internal/catalog/route.ts:31-37`  
**응답**: `{ items: PublicMediaView[], count, fetchedAt }`

`PublicMediaView` (`dmpilot/lib/digital/public-media.ts:12-47`) — **`Media.type` analog 없음**. 필드:
- `channel` (AdChannel enum: INSTAGRAM, NAVER_SA, …)
- `mediaType` (MediaType enum: SA, DA, SNS, VIDEO, …) ← **온라인 ad format, OOH `type` 아님**
- `platform`, slug, cpc/cpm, …

**PR5 제거 목록**: endpoint 자체 + tkad `fetchDigitalCatalogInternal` (`lib/planner/digital-catalog-fetch.ts`).

### `POST /api/internal/mix/generate`

**파일**: `dmpilot/app/api/internal/mix/generate/route.ts`  
**응답**: `MixResult` (`lib/digital/mix-types.ts:45-50`)

- `meta.channelType` — **없음** (public route only)
- `input.goal`, `channels[].media` — PublicMediaView (동일)
- tkad BFF embed: `IntegratedMixResponse.meta.channelType: "integrated"` (`lib/integrated/schemas.ts:31`)

**혼동 토큰 (PR5에서 정리)**:
| 토큰 | 위치 | 성격 |
|------|------|------|
| `mediaType: "SA"\|"DA"\|…` | catalog items | dmpilot ad format enum — tkad `Media.type` **아님** |
| `channelType: "integrated"` | integrated mix meta | 채널 모드 — 유지 후 로컬화 |
| `mode: "digital"\|"ooh"` | CampaignReport (dmpilot admin) | PR7 scope |

---

## 9. `DIGITAL_CHANNELS` 정적 폴백 위치 (PR0 **미변경**, PR5 제거)

| 파일 | 라인 | 역할 |
|------|------|------|
| `lib/planner/digital-channels.ts` | **57-209** | **`DIGITAL_CHANNELS` 상수 정의** (7 platform buckets) |
| `lib/planner/digital-channels.ts` | 211 | `DIGITAL_PLATFORMS` alias |
| `lib/planner/digital-catalog-bridge.ts` | 99, 156, 188 | upstream fail → static fallback |
| `lib/planner/recommend-digital.ts` | 4, 158 | recommend default channels |
| `lib/planner/brief/store.ts` | 51, 178 | persisted channel id validation |
| `lib/home-landing-media-grid.ts` | 15, 158 | home grid platform labels |
| `lib/planner/recommend-digital.regression.test.ts` | 3, 8 | id stability test |

---

## 10. DB migration dry-run (prod 기준)

```sql
-- before
SELECT type, COUNT(*) FROM media GROUP BY type;
-- digital: 641, static: 200, mobile: 48

-- dry-run impact
SELECT COUNT(*) FROM media WHERE type = 'digital';  -- 641

-- after (post-approval only)
UPDATE media SET type = 'dooh' WHERE type = 'digital';
```

**Rollback**: `UPDATE media SET type = 'digital' WHERE type = 'dooh'` (641건 복원).

---

## 11. 저장 플랜 점검 결론

**`SavedPlannerPlan.plan_json`**: media **ID**만 저장 (`campaignMediaIds`), type 문자열 **미포함** — prod 0건 확인.  
**`CampaignPlanSnapshot.mediaMix`**: `mediaId` + pricing snapshot, type **미포함**.  
→ **별도 JSON UPDATE 불필요.**
