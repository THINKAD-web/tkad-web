# /ko/media 1분 멈춤 — 긴급 성능 진단

**작성**: 2026-08-24 KST  
**증상**: `/ko/media` 접속 시 ~1분간 로딩 미완료 (매번 재현 보고)  
**범위**: Production curl 실측 · 코드 경로 · 최근 커밋 · 이미지·쿼리 구조

---

## Executive summary

| 구분 | 측정값 |
|------|--------|
| **서버 TTFB** (Production curl, warm) | **0.6–1.2s** (`/ko/media`) |
| **서버 total** (Production curl, warm) | **0.7–2.0s** |
| **HTML 크기** | **~934 KB** (SSR 30건 + RSC payload) |
| **`/api/public/media?sort=popular`** | TTFB **0.8–1.1s**, total **1.1–1.3s** |
| **`/api/public/media?sort=newest`** | total **~0.7s** (popular 대비 **~0.4s 빠름**) |
| **`/api/public/media-catalog`** (CDN warm) | total **~0.25–0.32s**, **5.9 MB** |
| **Vercel edge cache (`/ko/media`)** | **항상 MISS** (`cache-control: no-store`) |
| **활성 매체 수** | **812건** (public catalog) |
| **DB base `findMany` (EXPLAIN, 8/14)** | **~1.9ms** — 단일 쿼리 자체는 빠름 |

**확정 원인 (서버)**: `/ko/media`는 **매 요청마다 활성 매체 ~812건 전체**를 DB에서 로드 → `coverageDistrictCodes`·install batch SQL → review/trust enrich → **인메모리 filter/sort** 후 **30건만** slice. DB 페이지네이션 없음. ISR(`revalidate=3600`)은 **`searchParams` 사용으로 무효** — 사실상 매 방문 SSR.

**60초 체감과 warm curl 1–2s 차이**: warm 측정에서는 1–2s. **Neon suspend + Vercel cold start**가 겹치면 첫 요청만 **수십 초**까지 늘어날 수 있음(로컬→Prod DB full pipeline **~10–12s** 재현). 또한 layout + page가 동일 요청에서 catalog pipeline을 공유하지만(**React `cache()` dedupe**), **요청 간 캐시가 없어** cold hit마다 full load 반복.

**이미지 가설**: **주원인 아님**. SSR TTFB가 이미 1s+ — 이미지는 HTML 수신 **이후** 로드. BunnyCDN 미경유·resize 미적용 URL은 일부 존재하나 목록 hang의 1차 원인은 아님.

**A-4 `coverageDistrictCodes`**: batch SQL(`IN` clause) — N+1 아님. 오늘 스키마 변경이 browse 쿼리 plan을 깨뜨린 증거 없음.

---

## 1. 서버 vs 클라이언트 구분

### 1-a. 서버 (Production curl, 2026-08-24)

| URL | TTFB | Total |
|-----|------|-------|
| `/ko/media` (×3) | 0.61–0.69s | 0.73–1.22s |
| `/api/public/media?limit=30&sort=popular` (×3) | 0.75–1.10s | 1.11–1.28s |
| `/api/public/media-catalog` (CDN warm) | 0.09–0.14s | 0.25–0.32s |

→ **병목은 서버-side catalog pipeline**. CDN warm catalog API(0.3s)와 `/ko/media` SSR(1.2s) gap = browse가 **캐시된 catalog endpoint를 쓰지 않고** 매번 DB full load.

### 1-b. 클라이언트

- `media-search-page.tsx`: mount 시 SSR key 일치하면 **`/api/public/media` 중복 fetch skip** (`0f828a21`, 2026-08-02).
- `loading` 초기값 `false`, SSR `initialMedia` 있으면 **스켈레ton 없이** 카드 즉시 표시.
- **체감 60s가 HTML TTFB 이후**라면 → 이미지·JS hydration; **TTFB 이전**이라면 → SSR catalog pipeline + Neon cold.

---

## 2. 요청 경로 (코드)

```
/ko/media
  media/layout.tsx     → fetchPublicMediaCatalog() [ItemList JSON-LD]
  media/page.tsx       → fetchFilteredMediaCatalogItems + countPublicMediaCatalog (parallel)
    → queryMergedMediaBrowse / countMergedMediaBrowse
    → loadMergedBrowseCatalog() → fetchPublicMediaCatalog()  [812 rows]
    → sortMergedBrowseCatalogAsync (sort=popular → daily engagement 6+ groupBy, 10min cache)
    → slice(30)
  Client (filter 변경 시만) → GET /api/public/media [force-dynamic, 동일 pipeline]
```

**N+1**: 없음. `attachPublicMediaCatalogExtras`는 id batch SQL 2회.

**페이지네이션**: DB 레벨 **없음**. 812건 전부 메모리 후 slice.

---

## 3. 최근 변경 영향

| 커밋 | 날짜 | browse 영향 |
|------|------|-------------|
| `0f828a21` | 08-02 | mount fetch skip — **개선** |
| `d184fa12` | 08-02 | db-wake cron — cold start 완화 |
| `db4f1b00` | 최근 | reviewStatus flags — catalog where에 반영 (행 수 소폭↓) |
| A-4 coverage | — | batch attach, browse hot path 변경 없음 |

**오늘 A-4 작업이 /ko/media 쿼리를 직접 느리게 한 증거 없음.**

---

## 4. sort=popular 추가 비용

- `getCachedDailyEngagementScoreRecord()` — 10분 `unstable_cache`
- `computeDailyEngagementScores()` — 24h window **6+ groupBy** (favorite, view, quote, booking 등)
- Production: **popular 1.17s vs newest 0.73s** (~0.4s delta)

---

## 5. 이미지 감사 (구조적)

- 목록 썸네일은 `catalogThumbnailImageProps` / Bunny optimizer 경유.
- DB raw URL 중 CDN 미경유·resize 파라미터 없음 건은 **소수** — 전체 hang 설명력 낮음.
- `/api/public/media-catalog` **5.9 MB** — browse가 이 캐시를 재사용하지 않음.

---

## 6. 수정 (적용·배포 중)

**`fetchPublicMediaCatalog`에 `unstable_cache` (TTL **1시간**, tag `public-media-catalog`)**

- layout JSON-LD + page browse + `/api/public/media`가 **요청 간 동일 catalog 재사용**
- admin save 시 `revalidateTag('public-media-catalog', 'max')` (`lib/media-cache-revalidate.ts`)
- **TTL 1h**: 트래픽 간격이 5분보다 넓어 cache miss 반복 가능 → admin 무효화 있으므로 1h로 연장

**기대 효과**: warm hit 시 catalog load **~10s → ~수 ms–수백 ms**. cache miss(첫 방문·TTL 경과)는 여전히 full DB load 1회.

**⚠️ 이슈 미해결**: 캐싱은 architecture 병목 완화. **신고된 ~60s 증상은 아직 완전 설명 안 됨** — Jaehan님 콜드 재현 테스트까지 보류.

---

## 7. 60초 격차 — 추가 진단 (진행 중)

| 가설 | 결과 |
|------|------|
| warm server TTFB ~60s | **기각** — Production curl **0.6–1.2s** |
| cold pipeline ~10–12s (로컬→Prod DB) | **부분 설명** — worst case server-side upper bound |
| 7개 enrich가 unpooled로 각각 Neon cold | **기각** — 아래 커넥션 감사 |
| Vercel 로그에 60s 요청 존재 | **미확인** — runtime log API에 **duration 필드 없음**, 최근 `/ko/media` 전부 200 |

### 7-a. 커넥션 감사 (배치 쿼리 7종)

**런타임 browse 경로는 단일 pooled 커넥션.**

| 단계 | 구현 | 커넥션 |
|------|------|--------|
| computedMetric + factSheet + adExecutions | Prisma `findMany` **include** (1 SQL) | `getPrisma()` singleton |
| coverageDistrictCodes | `$queryRaw` batch IN | **동일** `db` 인자 |
| installLocations | `$queryRaw` batch IN | **동일** `db` |
| review stats | `groupBy` 1회 | `getPrisma()` |
| trust badges | `fetchTrustBadgeContext` + 3× `groupBy` | `getPrisma()` |
| networks | `fetchPublicMediaNetworks()` | `getPrisma()` |

- `lib/prisma.ts`: **단일 `pg.Pool`** (max 15), `DATABASE_URL` pooler URL
- `DATABASE_URL_UNPOOLED`: **migrate/build/db-wake 전용** — browse SSR/API 런타임 **미사용**
- Neon cold wake가 60s×N 누적될 구조 **아님** (pool 1회 connect)

**신규 suspect (캐시 miss 시):** `fetchTrustBadgeContext()` — 매 catalog load마다 `quoteRequest.findMany(take:8000)` + `ooHQuote.findMany(take:5000)` + view 집계. **uncached**, catalog cache miss마다 실행. 60s 격차 추가 조사 대상.

### 7-b. 콜드 재현 (TODO)

- Vercel production: 10분+ idle 후 `/ko/media` — **Jaehan님 브라우저 테스트** (curl warm과 다름)
- Neon suspend→wake: db-wake cron 있으나 browse idle gap과 불일치 가능

### 7-c. 후속 (캐싱 배포 후)

1. `fetchTrustBadgeContext` → `unstable_cache` 또는 catalog cache에 포함되어 miss 빈도↓
2. Server-Timing 헤더 또는 단계별 로그 추가 (cache miss path)
3. Neon always-on / connection pool tuning 검토

---

```bash
# Production TTFB
curl -s -o /dev/null -w "ttfb:%{time_starttransfer}s total:%{time_total}s\n" \
  "https://tkad.co.kr/ko/media"

# sort 비교
curl -s -o /dev/null -w "popular:%{time_total}s\n" \
  "https://tkad.co.kr/api/public/media?limit=30&sort=popular"
curl -s -o /dev/null -w "newest:%{time_total}s\n" \
  "https://tkad.co.kr/api/public/media?limit=30&sort=newest"
```
