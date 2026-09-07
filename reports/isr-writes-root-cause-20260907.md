# ISR Writes 비용 근본 원인 조사 — 2026-09-07

**청구 배경**: 이번 결제 기간 Infrastructure usage $110.91 중 ISR Writes $52.05(47%), 13,013,250건.
ISR Reads 10,918,716건 — Write > Read (비정상, 정상이라면 Read ≫ Write).

**결론(선요약)**: 근본 원인은 **관리자 편집 빈도나 크론이 아니라, 카탈로그 공개 라우트 전체가 공유하는
`unstable_cache` 데이터 캐시 2개(`fetchPublicMediaCatalogList` 3600s, `fetchTrustBadgeContext` 3600s)가
각 페이지가 선언한 훨씬 긴 `export const revalidate` 값(21600 / 86400 / 604800)을 조용히 덮어써,
사실상 사이트 전체 카탈로그 라우트가 "선언값과 무관하게 항상 1시간마다" 재생성되고 있기 때문**입니다.
과거 두 차례 수정(태그 분리, 상세 payload 축소)은 이 TTL 붕괴를 건드리지 않아 Write 건수가 줄지 않았습니다.

---

## 0단계. 과거 수정 시도 인벤토리

| 커밋 | 날짜 | 내용 | Write 건수에 효과가 없었던 이유 |
|---|---|---|---|
| `5fc9f72` (PR #513) | 2026-09-01 | `public-media-catalog` 단일 tag → list/detail 2-tag 분리. 상세 전용 필드 수정 시 list tag 무효화 skip. | **on-demand invalidation의 파급 범위만 축소.** 이 페이지들이 왜 그렇게 자주 다시 쓰이는지(time-based 재생성 주기 자체)는 그대로 — 아래에서 확인하듯 list/detail 모두 여전히 내부적으로 3600s TTL 캐시를 호출하므로 관리자 편집이 전혀 없어도 시간 기반으로 1시간마다 재생성됨. |
| `511f19c` (PR #520) | 2026-09-02 | media 상세 ISR에서 전체 카탈로그 컴패니언 제거 → 64건 region-first peer slice. "7-day revalidate와 list cache tag는 그대로 유지"(커밋 메시지 원문). | **재생성 1회당 비용(페이로드 크기)만 줄였을 뿐, 재생성 빈도는 그대로.** 커밋 메시지 자체가 "list cache tag unchanged"라고 명시 — 정작 그 list tag/TTL이 실효 재생성 주기를 604800s가 아니라 3600s로 만드는 진짜 문제였음. |
| `lib/nav-content-status.ts` 내 주석 (도입 시점부터 존재) | 2026-08-31 squash 시점 | site-header(모든 공개 페이지 공통 chrome)의 nav 배지 캐시를 300s가 아닌 3600s로 설정하며 "300s로 두면 모든 정적 페이지의 effective revalidate가 300s로 캡되어 ISR write가 과도하게 발생한다(ISR Writes 진단의 실제 근본 원인)"라고 명시. | **정확한 메커니즘을 이미 한 번 발견했지만, 딱 이 한 파일에만 적용하고 끝냄.** 동일한 메커니즘이 `fetchPublicMediaCatalogList`/`fetchTrustBadgeContext`(둘 다 3600s)에도 똑같이 적용되고, 이 둘은 site-header보다 문제가 훨씬 큼(카탈로그 라우트 전체가 직접 호출) — 이 부분은 손대지 않음. |

**공통 패턴**: 세 번의 시도 모두 "무엇을 캐시하는지"(payload 크기, invalidation 범위)는 고쳤지만
**"언제 다시 쓰는지"(effective revalidate 주기)** 는 한 번도 직접 검증·수정하지 않았음.
이번 조사에서 이 부분이 진짜 원인으로 확인됨.

---

## 1단계. Vercel Observability 데이터

**접근 불가**: 이 세션은 Vercel 대시보드/API에 접근 권한이 없고(`vercel.com` egress 차단, Vercel MCP/CLI 토큰 없음),
Production에도 직접 curl할 네트워크 경로가 없어 `x-vercel-cache`/`x-nextjs-cache` 헤더 실측도 하지 못했습니다.
**Top routes by ISR Writes, cache reason 비중, 3개월 추이 그래프는 이 조사에서 확인하지 못했습니다** — 대시보드 접근 권한이 있는 분이 직접 확인해야 합니다.

대신 코드 레벨에서 "이론상 Write를 유발할 수 있는 모든 경로"를 전수 조사했고, 아래 2단계에서
**카탈로그 관련 ISR 라우트 전부(사실상 공개 사이트의 대다수)가 동일한 매커니즘으로 영향받는다**는 것을
Next.js 16.2.3(설치된 정확한 버전, `node_modules/next/dist/docs`에서 직접 확인) 캐싱 문서로 검증했습니다.
Observability 접근이 가능해지면, 아래 "확정된 근본 원인" 표의 라우트들이 실제로 Top Writes에 몰려 있는지
1차 검증 포인트로 삼으면 됩니다.

---

## 2단계. 코드 전수 감사

### 2-1. revalidate 설정값 전수 조사 — **충돌 확인됨 (핵심 발견)**

`export const revalidate` (페이지 선언값):

| 라우트 | 선언된 revalidate |
|---|---|
| `/[locale]/media/[slug]` | **604800** (7일) |
| `/[locale]/quote`, `/[locale]/budget-tool` | **86400** (24시간) |
| `/[locale]/local/[region]/[district]`, `/type/[mediaType]`, `/target/[slug]`, `/industry/[slug]`, `/media/category/[slug]`, `/media/type/[type]`, `/special/[slug]` | **21600** (6시간) |
| `/[locale]`, `/media`(shell), `/media/online`, `/planner`, `/planner/integrated`, `/pricing` | 3600 (1시간) |

이 라우트들이 내부에서 호출하는 `unstable_cache` 함수 (실제 grep 결과, `app/[locale]/(site)/**`):

```
lib/public-media-catalog.ts:531  PUBLIC_MEDIA_CATALOG_REVALIDATE_SECONDS = 3600   (fetchPublicMediaCatalogList)
lib/public-media-catalog.ts:532  PUBLIC_MEDIA_CATALOG_DETAIL_REVALIDATE_SECONDS = 604800 (getCrossRequestMediaDetail — 참고용, 아래 참조)
lib/media-trust-catalog.ts:162   MEDIA_TRUST_BADGE_CONTEXT_REVALIDATE_SECONDS = 3600  (fetchTrustBadgeContext)
```

**`fetchPublicMediaCatalogList()`(3600s) 직접 호출 라우트** (grep 실측, 전부 해당):

- `app/[locale]/(site)/media/[slug]/page.tsx`는 직접 호출하지 않지만, **부모 레이아웃** `app/[locale]/(site)/media/layout.tsx`가 `generateMetadata`에서 `fetchPublicMediaCatalogList()`를 호출 (`buildMediaCatalogItemListJsonLd`용). 이 레이아웃은 `/media/[slug]`, `/media/category/[slug]`, `/media/type/[type]`, `/media/online` 등 `/media/*` 전체의 공통 부모.
- `/[locale]/media/[slug]/page.tsx` 자신은 `enrichMediaWithTrust()` → `fetchTrustBadgeContext()`(3600s)를 **직접** 호출.
- `local/[region]/[district]`, `type/[mediaType]`, `target/[slug]`, `industry/[slug]`, `media/category/[slug]`, `special/[slug]`, `media/type/[type]`, `quote`, `budget-tool` — **전부 페이지 본문에서 `fetchPublicMediaCatalogList()`를 직접 `await`.**

**Next.js 16.2.3 공식 문서(`caching-without-cache-components.md`, 이 프로젝트가 실제로 쓰는 캐싱 모델 — `cacheComponents` 미사용 확인함) 인용**:

> The lowest `revalidate` across each layout and page of a single route will determine the revalidation frequency of the *entire* route... Individual fetch requests can set a lower `revalidate` than the route's default `revalidate` to increase the revalidation frequency of the entire route.

이 규칙은 `fetch()`뿐 아니라 동일한 Next.js Data Cache 위에 구현된 `unstable_cache()`에도 적용됩니다
(`lib/nav-content-status.ts`의 기존 주석이 이 동작을 이미 실측 기반으로 서술하고 있고, "300s→3600s" 조치가 이를 뒷받침).

**결론**: `/media/[slug]`가 `revalidate=604800`을 선언해도, 실제로는 `min(604800, 3600) = 3600`.
**7일에 한 번 다시 써야 할 매체 상세 페이지(약 1,640개 = 활성 매체 ~820 × locale 2)가 실제로는 최대 1시간마다 재생성**됩니다(168배 증폭). local/type/target/industry/category/special/quote/budget-tool(`21600`·`86400` 선언)도 동일하게 `3600`으로 캡됩니다(6~24배 증폭).

이 증폭이 카탈로그 관련 공개 라우트 거의 전부(사실상 사이트 트래픽의 대다수)에 걸쳐 있다는 점이,
Read(10.9M)와 Write(13M)가 비슷한 크기로 나오는 현상과도 부합합니다: 각 페이지가 매 방문 시 "1시간 이내 재방문"이 아니면 stale-serve + 백그라운드 재생성이 함께 발생하므로, 방문 밀도가 낮은 롱테일 페이지일수록 Read:Write 비율이 1:1에 가까워집니다.

**부수 발견 — 선언 충돌**: `app/[locale]/(site)/pricing/page.tsx`는 `export const revalidate = 3600` +
`generateStaticParams`(정적 프리렌더 의도)이면서, 본문에서 `await searchParams`와 `await getCurrentUser()`(쿠키 읽음, Request-time API)를 호출합니다. Request-time API 사용은 해당 라우트를 완전히 dynamic으로 강제하므로 `revalidate=3600` 선언 자체가 무의미합니다(이건 ISR Write을 늘리기보다는 ISR 자체를 무력화 — Function 호출 비용 쪽 문제이지만 설정 위생 차원에서 함께 기재).

### 2-2. 비결정적 렌더링 출력 확인 — **주요 라우트에서는 미발견**

`Date.now()`/`new Date().toLocale*`/`Math.random()`/`crypto.randomUUID()`/`nanoid()`를 서버 컴포넌트 전체에서 grep한 결과, 카탈로그 ISR 페이지(`media/[slug]`, `local/*`, `type/*` 등)와 공유 레이아웃(`app/[locale]/layout.tsx`, `site-header.tsx`, `structured-data.ts`)에서는 발견되지 않았습니다. 매치된 두 파일(`planner/shared/[id]/page.tsx`, `proposal/[id]/page.tsx`)은 애초에 `force-dynamic`/per-user 콘텐츠라 ISR 대상이 아닙니다. **이 항목은 이번 비용의 원인이 아닌 것으로 판단됩니다.**

`app/[locale]/layout.tsx`의 `generateMetadata`가 매 리제너레이션마다 `getPublicMediaCountLabel()`(캐시 없는 raw DB count)을 호출하는 점은 발견했으나, 이건 revalidate 값 자체를 낮추는 게 아니라 재생성 1회당 DB 쿼리를 늘릴 뿐이라 Write 건수의 원인은 아닙니다(다만 DB 부하 측면에서는 부수적으로 손볼 가치 있음).

### 2-3. on-demand revalidation 호출부 — **이미 상당 부분 정리되어 있고, 부차적 요인**

`revalidateMediaCaches`/`revalidateMediaCachesBulk`(`lib/media-cache-revalidate.ts`)를 호출하는 곳은
관리자 단건 저장(`/api/admin/medias/[id]`, `route.ts` POST), CSV/quick-add/bulk-import, 그리고 마이그레이션 스크립트뿐입니다. 대량 작업은 전부 **루프당 1회가 아니라 배치당 1회**로 이미 통합되어 있음(과거 `5fc9f72` 전에도 이미 이렇게 작성돼 있었음 — 이 부분은 처음부터 문제가 아니었던 것으로 보임).

다만 **list tag(`public-media-catalog-list`)가 위 2-1의 모든 라우트에 걸쳐 공유**되므로, 가격·이름·slug 등
"list-affecting" 필드가 있는 관리자 편집 1건이 `local`(28개 조합) + `type`(N) + `target`(N) + `category`(N) + `industry`(N) + `special`(N) + `quote` + `budget-tool` — 총 수백 개 페이지를 동시에 stale 처리합니다. 이 자체는 2-1의 시간 기반 붕괴(어차피 1시간마다 다시 씀)에 비하면 부차적이지만, 편집 빈도가 높은 날에는 추가 증폭 요인입니다.

### 2-4. 크론/웹훅 — **직접 원인 아님**

`vercel.json`의 모든 `crons` 핸들러(`app/api/cron/**`)를 grep했으나 `revalidateTag`/`revalidatePath`를 호출하는 곳은 없습니다. `update-media-popularity`(매일, 활성 매체 전량 `popularityScore` UPDATE)도 DB만 갱신할 뿐 캐시 무효화를 트리거하지 않습니다. `warm-media-browse-cache`는 `fetchPublicMediaCatalogList`/`fetchTrustBadgeContext` 등을 직접 호출해 Data Cache를 "미리 데운다"는 의도인데, **정작 코드 주석은 "Hourly"라고 되어 있지만 `vercel.json` 스케줄은 `0 */3 * * *`(3시간마다)로 어긋나 있음** — 큰 비용 요인은 아니지만 설정 불일치로 기재.

---

## 3단계. 경로 개수 폭발 확인 — **해당 없음**

`generateStaticParams` 전수 확인 결과 전부 유한 목록(`dynamicParams=true`이지만 실제 매칭은 `notFound()` 가드가 있는 사전 정의 슬러그 집합):

| 라우트 | 조합 수(대략) |
|---|---|
| `local/[region]/[district]` | 28 landing × 2 locale = 56 |
| `target/[slug]` | `KNOWN_TARGET_SLUGS` × 2 |
| `industry/[slug]` | `INDUSTRY_SLUGS` × 2 |
| `media/category/[slug]` | `KNOWN_MEDIA_CATEGORY_SLUGS` × 2 |
| `special/[slug]` | `KNOWN_SPECIAL_SLUGS` × 2 |
| `type/[mediaType]` | `MARKETING_MEDIA_TYPE_SLUGS` × 2 |
| `media/[slug]` | 활성 매체(~820) × 2 locale ≈ 1,640 |

전부 수십~수천 단위로 bounded. 쿼리 파라미터가 별도 정적 경로로 취급되는 사례도 없음(`/media`, `/media/online`은 이미 8/26 수정으로 `searchParams` 미사용 shell). **경로 폭발은 이번 비용의 원인이 아닙니다.** 다만 1,640개 자체도 "정상 재생성 주기(7일)"라면 문제가 안 되지만, 2-1의 TTL 붕괴로 "1시간 주기"가 되면 이 개수 자체가 증폭 배수로 작용합니다.

---

## 4단계. 확정된 근본 원인 (우선순위순)

1. **[주 원인, 확정] revalidate 계층 붕괴** — `fetchPublicMediaCatalogList()`(3600s)와 `fetchTrustBadgeContext()`(3600s)가 카탈로그 관련 ISR 라우트 전체(사실상 공개 사이트 대부분: 매체 상세 1,640개 + local/type/target/industry/category/special 라우트 + quote/budget-tool)에서 직접 또는 부모 레이아웃을 통해 호출되어, 각 페이지가 선언한 21600s/86400s/604800s revalidate를 전부 3600s로 강제 붕괴시킴. Next.js 16.2.3 공식 문서("가장 낮은 revalidate가 라우트 전체의 재생성 주기를 결정")로 검증. 매체 상세는 최대 168배, local/type/target 등은 최대 6배, quote/budget-tool은 최대 24배 증폭.
2. **[부 원인, 확정] list tag 공유 파급** — `public-media-catalog-list` 태그가 위 라우트 전부에 공유되어, list-affecting 필드가 있는 관리자 편집 1건마다 수백 페이지가 동시에 stale 처리됨. 원인 1이 없다면 하루 수십~수백 건 규모로 그쳤겠지만, 원인 1과 겹쳐 매 시간 재생성 사이클마다 "이미 stale"인 페이지 수를 늘림.
3. **[경미] `pricing/page.tsx`의 revalidate/dynamic API 혼용** — ISR Write을 늘리진 않지만 ISR 선언 자체가 무력화됨(설정 위생 문제, Function 비용 쪽에 영향 가능).
4. **[경미] `warm-media-browse-cache` 크론 스케줄-주석 불일치** — 3시간 vs "Hourly" 주석. 비용 원인은 아니나 정리 필요.
5. 비결정적 렌더링, 경로 폭발, 크론發 revalidate 호출 — **원인 아님(조사 완료, 배제)**.

---

## 5단계. 수정 계획(제안 — 아직 미적용)

**핵심 수정**: `fetchPublicMediaCatalogList`/`fetchTrustBadgeContext`의 TTL을, 이를 소비하는 페이지들의 **가장 긴** 요구 주기에 맞춰 올리거나, 페이지별로 서로 다른 TTL이 필요하면 **레이어를 분리**해야 합니다. 두 가지 옵션:

- **Option A(단순)**: `PUBLIC_MEDIA_CATALOG_REVALIDATE_SECONDS`/`MEDIA_TRUST_BADGE_CONTEXT_REVALIDATE_SECONDS`를 21600(6h)로 상향 — quote/budget-tool(24h 요구)은 여전히 6h로 캡되지만 현재 24배 증폭이 4배로 줄고, 매체 상세(7일 요구)는 168배 → 28배로 감소. 관리자 편집 시 on-demand invalidation은 그대로 유지되므로 신선도 손실은 크지 않음(수정 즉시 반영은 revalidatePath가 담당).
- **Option B(정밀, 권장)**: 매체 상세 전용 캐시(현재 `getCrossRequestMediaDetail`, 이미 604800s로 정의되어 있으나 `media/layout.tsx`의 list catalog 호출과 `fetchTrustBadgeContext` 호출 때문에 실질적으로 묻힘)를 라우트별로 완전히 분리 — `media/[slug]`는 list catalog를 아예 호출하지 않도록 `media/layout.tsx`의 JSON-LD를 별도의 604800s 캐시로 옮기고, `fetchTrustBadgeContext`도 상세 페이지 전용으로 604800s 별도 태그를 만들거나 admin 저장 시 detail tag와 함께 무효화되는 별도 긴 TTL 캐시로 분리. local/type/target/industry/category/special은 21600s 그대로 유지, quote/budget-tool은 86400s 전용 캐시로 분리.

두 옵션 모두 **on-demand invalidation(`revalidateMediaCaches`)은 그대로 유지**해야 합니다(TTL을 올려도 관리자 저장 시 즉시 반영되는 경로는 안 건드림). 부수적으로 `pricing/page.tsx`는 `getCurrentUser()`/`searchParams`를 클라이언트 컴포넌트로 옮기거나 `revalidate` 선언을 제거해 설정을 일치시키고, `warm-media-browse-cache` 주석/스케줄을 일치시키는 것을 권장합니다.

**예상 감소폭**: Option B 기준, 매체 상세 재생성 빈도가 168배 → 1배(선언값 그대로)로 정상화, local/type 등도 6배 → 1배. 카탈로그 라우트가 전체 Write의 대다수를 차지한다는 가정(1단계 데이터 미확보로 미검증) 하에, **월 13M → 수십만 단위**로 감소할 것으로 추정하나, 이는 Observability 데이터로 확인되지 않은 추정치이므로 배포 후 반드시 24~48시간(배포 직후 전체 캐시 무효화로 인한 스파이크 제외) + 최소 1주일 관찰로 검증해야 합니다.

---

## 보고서 한계 (정직하게 명시)

- **1단계 Vercel Observability 데이터를 확보하지 못했습니다.** Top routes by Writes, cache reason 비중, 3개월 추이는 이 조사에서 검증되지 않은 추정입니다. 이 리포트의 "확정된 근본 원인"은 코드·공식 문서 기반의 강한 정황 증거이지, 대시보드 숫자로 직접 확인된 것은 아닙니다. **대시보드 접근이 가능한 분이 "Top routes by ISR Writes"에서 `/media/[slug]`, `/local/*`, `/type/*` 등이 실제로 상위를 차지하는지, cache reason이 "time-based"인지를 1차로 확인해 주시면 이 진단을 검증/반증할 수 있습니다.**
- Production에 직접 curl(`x-vercel-cache` 헤더 확인)도 이 세션에서는 수행하지 못했습니다(egress 정책).
