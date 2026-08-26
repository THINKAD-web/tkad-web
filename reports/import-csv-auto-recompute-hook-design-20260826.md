# import-csv — `maybeAutoRecomputeMediaMetrics` 연결 설계 (2026-08-26)

**범위:** 설계만 (코드 변경 없음)  
**배경:** PR #473 검수에서 `import-csv` 경로만 auto-recompute 훅이 빠져 있음 → CSV 등록 시 `dailyFootfall`은 저장되지만 `impressions`가 비는 버그 재발 가능.

---

## 1. 조사 결과

### 1.1 구조적 차이 — bulk insert가 아님, 훅 누락 실수

| 항목 | bulk-import / quick-add / POST / PATCH | import-csv |
|------|----------------------------------------|------------|
| 처리 방식 | **행 단위** `for` 루프 + `db.media.create` / `update` | **동일** — 행 단위 `for` + `createMediaFromCsvRow` → `db.media.create` |
| bulk `createMany` | ❌ 없음 | ❌ 없음 |
| upsert | bulk-import만 (name/id 매칭) | **create-only** (중복·갱신 없음) |
| Kakao 지오코딩 | quick-add / bulk-import enrich | `enrichNewMediaLocationFromKakao` (행마다) |
| metrics gate | `gateMediaMetricsWrite` | `gateMediaMetricsWrite` + `validateCsvDailyFootfall` |
| auto-recompute | ✅ 4경로 모두 호출 | ❌ **미호출** |

**결론:** `createMany`/bulk insert 때문에 훅을 못 거는 구조가 **아님**. `bulk-import`와 거의 같은 per-row 패턴인데 PR #473에서 `import-csv`만 빠진 **연결 누락**으로 판단.

관련 코드:

```92:105:app/api/admin/medias/import-csv/route.ts
  for (const row of parsed.rows) {
    try {
      const id = await createMediaFromCsvRow(db, row);
      outcomes.push({ kind: "created", rowIndex: row.rowIndex, id, name: row.name });
    } catch (e) {
      // ...
    }
  }
```

```152:172:app/api/admin/medias/import-csv/route.ts
  const created = await db.media.create({
    data: {
      name: row.name,
      // ...
      dailyFootfall: footfall.values.dailyFootfall ?? null,
      // impressions 미설정 → null
    },
  });
  return created.id;
```

비교 — bulk-import는 create/update 직후:

```183:224:app/api/admin/medias/bulk-import/route.ts
        await maybeAutoRecomputeMediaMetrics(db, updated.id);
        // ...
        await maybeAutoRecomputeMediaMetrics(db, created.id);
```

### 1.2 전형적 CSV 규모

| 출처 | 규모 |
|------|------|
| **코드 상한** | `maxDuration = 120` (route), 행 수 하드캡 없음 |
| **Admin UI** | 파일 전체를 JSON body로 POST — 브라우저·Vercel payload 한계가 실질 상한 |
| **운영 문서** (`THINKAD-EXECUTION-PLAN-PRESPRINT-TO-SPRINT3.md`) | Pre-sprint 시드: 매체사 ~200곳, **면(행) 1,500~2,000** 목표 |
| **현재 UI 용도** | 관리자 수동 일괄 등록 — 템플릿 1행 + 실무 배치 **수십~수백 건**이 일반적, 대량 시드는 bulk-import(JSON) 또는 스크립트 경로가 더 적합 |

**성능 가늠 (행당):**

1. `enrichNewMediaLocationFromKakao` — Kakao REST 1회 (이미 병목)
2. `maybeAutoRecomputeMediaMetrics` — `findUnique` 1회 + (조건 충족 시) `recomputeOneMedia` (factSheet·signals include + transaction)

`shouldAutoRecomputeMediaMetrics`가 false인 행(footfall 없음, impressions 이미 있음)은 recompute 생략. CSV 경로는 신규 create-only이므로 impressions는 항상 null → **footfall 있는 행은 전부 recompute 후보**.

- 50행 × footfall 있음: bulk-import와 동급 (~수십 초, Kakao 지배)
- 500~2,000행: 120초 timeout 위험 — **이미 Kakao per-row 때문에 존재하는 문제**; 훅 추가만으로 поряд-of-magnitude 악화는 아니나, recompute DB 부하는 추가됨

### 1.3 `maybeAutoRecomputeMediaMetrics` 시그니처

```typescript
export async function maybeAutoRecomputeMediaMetrics(
  db: Db,
  mediaId: string,
): Promise<void>
```

**시그니처 변경 없이** import-csv 연결 가능 (옵션 1·2 모두).

#### 호출처 전수 grep (2026-08-26, `tkad-web` main @ 73b09d5d)

**프로덕션 API (4곳 — PR #473에서 연결됨):**

| 파일 | 호출 방식 |
|------|-----------|
| `app/api/admin/medias/bulk-import/route.ts` | `await maybeAutoRecomputeMediaMetrics(db, id)` ×2 (update/create) |
| `app/api/admin/medias/quick-add/route.ts` | `void maybeAutoRecomputeMediaMetrics(db, row.id)` (루프) |
| `app/api/admin/medias/route.ts` (POST) | `void maybeAutoRecomputeMediaMetrics(db, media.id)` |
| `app/api/admin/medias/[id]/route.ts` (PATCH) | `void maybeAutoRecomputeMediaMetrics(db, id)` |

**정의·테스트:**

| 파일 | 용도 |
|------|------|
| `lib/media/engine/auto-recompute.ts` | 정의 |
| `lib/media/engine/index.ts` | re-export |
| `lib/media/engine/auto-recompute.test.ts` | `shouldAutoRecomputeMediaMetrics` 단위 테스트 |

**스크립트 (훅 미호출, `shouldAuto*`만):**

| 파일 |
|------|
| `scripts/audit-pr473-pre-merge.mts` |
| `scripts/tmp-audit-pr473-report.mts` |
| `scripts/step3-hook-patch-verify.mjs` (인라인 복제) |

**import-csv:** 호출 없음 ← 이번 갭.

---

## 2. 옵션 비교

| | **옵션 1 — row 직후 개별 훅** | **옵션 2 — import 완료 후 배치** | **옵션 3 — fire-and-forget (void)** |
|---|------------------------------|-----------------------------------|-------------------------------------|
| **개요** | `createMediaFromCsvRow` return 직후 또는 loop 안에서 `await maybeAutoRecomputeMediaMetrics(db, id)` | 성공 `outcomes`의 id만 모아 루프末尾에서 순차 `await` | bulk-import/quick-add/POST/PATCH와 같이 `void maybeAutoRecomputeMediaMetrics(...)` |
| **시그니처 변경** | 불필요 | 불필요 | 불필요 |
| **변경 파일** | 1 (`import-csv/route.ts`) | 1 (`import-csv/route.ts`) | 1 (`import-csv/route.ts`) |
| **예상 diff** | +3~6 lines (import + 1 call) | +8~15 lines (id 수집 + post-loop) | +3~5 lines |
| **구조 일관성** | bulk-import와 **동일 (await)** | 동작은 같으나 호출 시점만 지연 | quick-add/POST/PATCH와 **동일 (void)** |
| **성능** | 행마다 순차 recompute; timeout과 동일 루프 | 동일 (순차); 실패 행 제외 가능 | 응답은 빨리 반환; recompute는 백그라운드 (함수 종료 후 취소 위험은 Next/Vercel에서 낮음) |
| **정확성** | import 응답 시점에 impressions 반영 가능 | 동일 | 클라이언트가 redirect 할 때 아직 recompute 중일 수 있음 |
| **회귀 리스크** | **낮음** — 기존 4경로 미변경 | **낮음** | **낮음** |
| **테스트** | route integration 또는 `createMediaFromCsvRow` extract 후 mock | 옵션 1과 동일 | 옵션 1과 동일 |

**옵션 2 변형 (시그니처 변경 — 비추천):** `maybeAutoRecomputeMediaMetrics(db, mediaIds: string[])` 또는 batch helper 신설 → grep 4곳 + export surface 변경 필요. 과거 `.map(fn)` 시그니처 사고 재발 위험으로 **이번에는 배제**.

---

## 3. 테스트 전략 (구현 승인 후)

1. **단위:** `shouldAutoRecomputeMediaMetrics` — 기존 `auto-recompute.test.ts` 재사용 (변경 없음).
2. **route 수준 (신규 권장):** `app/api/admin/medias/import-csv/route.test.ts` 또는 `lib/admin-media-csv` + mocked prisma
   - footfall O, impressions null CSV 1행 → create 후 `recomputeOneMedia` / impressions > 0 검증
   - footfall X → 훅 no-op (`shouldAutoRecompute` false)
3. **회귀:** `npm run test:metrics`, 기존 engine 테스트; bulk-import 경로 테스트 있으면 parallel 실행.
4. **수동:** admin CSV 1행 dry-run → import → DB에서 `impressions` / `computedMetric` 확인.

---

## 4. 추천안

**옵션 1 (row 직후 `await maybeAutoRecomputeMediaMetrics`)** 을 추천.

**이유:**

1. **bulk-import와 패턴·await semantics 일치** — 같은 admin batch import 계열로 유지보수자가 한 눈에 이해.
2. **시그니처·호출처 전수 변경 불필요** — grep 4곳 그대로.
3. **버그 목적에 부합** — CSV import HTTP 응답 전에 impressions 채움; redirect(`/admin/medias`) 후 목록에서 바로 메트릭 확인 가능.
4. **성능** — Kakao per-row가 이미 지배적; recompute 추가는 bulk-import가 이미 겪는 수준. 500+행 대량은 import-csv보다 bulk-import/스크립트 권장(기존 운영 가정).

**구현 스케치 (승인 후):**

```typescript
// createMediaFromCsvRow 내부, create 직후:
await maybeAutoRecomputeMediaMetrics(db, created.id);
return created.id;
```

또는 POST handler loop에서 `createMediaFromCsvRow`가 `{ id }` 반환 후 호출 — bulk-import create 분기와 동일.

---

## 5. 다음 승인 필요 사항

- [ ] 옵션 1 구현 PR 생성 (예: `fix/import-csv-auto-recompute`)
- [ ] route/integration 테스트 1건 포함 여부
- [ ] 500+행 CSV를 import-csv로 계속 쓸지, bulk-import로 유도할지 운영 가이드 갱신 (선택)

---

*작성: 2026-08-26 · main @ 73b09d5d (PR #476/#477 merge 후)*
