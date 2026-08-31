# ISR catalog cache tag 분리 설계 (C — 실행 보류)

**작성:** 2026-08-27  
**상태:** 구현 완료 (2026-09-01) — list/detail tag 분리 + admin list-field gate.

## 배경

`revalidateTag(PUBLIC_MEDIA_CATALOG_CACHE_TAG)` (`public-media-catalog`) 한 번에 catalog 전체 data cache가 무효화된다.  
`revalidatePath`는 media list + 해당 detail만 좁게 건드리지만, **tag 무효화는 catalog를 읽는 모든 ISR 페이지**의 다음 요청 시 regen을 유발할 수 있다 → ISR Writes cascade.

## 현재 tag

| Tag | 정의 위치 | TTL |
|-----|-----------|-----|
| `public-media-catalog` | `lib/public-media-catalog.ts` | 3600s |
| `media-trust-badge-context` | `lib/media-trust-catalog.ts` | 3600s |

Admin 단건/대량 저장 시 `revalidateMediaCaches` / `revalidateMediaCachesBulk`가 **두 tag 모두** + path 무효화.

## `public-media-catalog` tag에 의존하는 라우트/경로 (ISR 또는 SSR fetch)

### ISR 페이지 (`export const revalidate` > 0)

| 라우트 | revalidate (2026-08-27 기준) | catalog 용도 |
|--------|------------------------------|--------------|
| `/[locale]` (홈) | 3600 | featured/popular subset |
| `/[locale]/media` (layout JSON-LD) | — (layout) | ItemList 30건 |
| `/[locale]/media/[slug]` | 604800 | detail + similar |
| `/[locale]/local/[region]/[district]` | 21600 | filter + grid |
| `/[locale]/type/[mediaType]` | 21600 | marketing type filter |
| `/[locale]/target/[slug]` | 21600 | target filter |
| `/[locale]/media/category/[slug]` | 21600 | category filter |
| `/[locale]/media/type/[type]` | 21600 | technical type filter |
| `/[locale]/industry/[slug]` | 21600 | industry filter |
| `/[locale]/special/[slug]` | 21600 | special landing filter |
| `/[locale]/quote` | 86400 | full catalog client props |
| `/[locale]/budget-tool` | 86400 | full catalog |

### force-dynamic (ISR Write 없음, tag 무효화 시 런타임 fetch만)

`/compare`, `/proposal`, `/recommend`, `/media/region/*`, `/media/area/*` 등.

### API / cron

- `/api/public/media-catalog` (ISR 3600)
- `/api/cron/warm-media-browse-cache` (data warm only)

## 제안: tag 2-tier 분리

### Tag 정의

```
public-media-catalog-list   — browse/list용 slim DTO (id, slug, name, region, type, price, thumb…)
public-media-catalog-detail — detail용 enrich 필드 (reviews, trust, analytics hooks…)
public-media-catalog-full   — legacy/full row (점진 deprecate)
```

### Admin 단건 저장 (`revalidateMediaCaches`)

| 동작 | 현재 | 제안 |
|------|------|------|
| List/browse data | `revalidateTag(full)` | `revalidateTag(list)` only |
| Detail page data | `revalidateTag(full)` + path | `revalidateTag(detail)` + `revalidatePath(detail)` |
| Trust badges | `revalidateTag(trust)` | 유지 |
| Path | list + detail 2 locale | 유지 |

**효과:** 홈/local/category 등 list-only 페이지는 **detail 필드 변경만으로 regen되지 않음**.  
가격·이름·slug 변경은 list tag도 invalidate 필요 (필드 매핑 테이블로 판단).

### Admin 대량 import (`revalidateMediaCachesBulk`)

| 동작 | 제안 |
|------|------|
| 항상 | `revalidateTag(list)` + list path 2 locale |
| affected details | `revalidatePath` per unique slug/id (현행 유지) |
| detail tag | 선택: bulk 시 `revalidateTag(detail)` 1회 또는 detail path만 |

### 구현 단계 (future)

1. `loadPublicMediaCatalogFromDb` → list loader / detail loader 분리
2. landing pages는 list loader + `tags: ['public-media-catalog-list']`
3. detail page는 detail loader + list fallback for similar media
4. admin gate: `detectChangedFields()` → list vs detail tag 선택 invalidation
5. 1주 usage A/B: tag split 전후 ISR Writes daily

## 리스크 / 트레이드오프

- Tag split 후 list/detail 불일치 window (최대 list TTL) — admin path invalidation으로 detail은 즉시, list는 field-class에 따라
- 구현 복잡도 중간 — loader 2개 + admin field classifier
- `unstable_cache` key/version migration 필요

## 이번 ISR 절감 패키지(A/B/D)와 관계

A/B는 **TTL**로 regen 빈도 감소. C는 **admin edit cascade** 축소.  
독립 적용 가능; C는 A/B 효과 plateau 이후 2차 작업 권장.
