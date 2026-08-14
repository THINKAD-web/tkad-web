# PR5 verify SQL (§11-3)

Post-execute verification for metric engine v0 batch recompute.

Run:

```bash
npx tsx scripts/recompute-all-media.ts --mode=verify
```

## modelVersion 승격

```sql
SELECT model_version, COUNT(*)
FROM media_computed_metrics
GROUP BY model_version;
-- 기대: v0-fallback = 821, legacy-migration-v1 = 0
```

## 값 보존 검증 (edge case 제외)

PR3 백필에서 `daily_footfall`이 NULL이고 `impressions`만 있는 매체는
`legacy_daily_impressions = NULL`, `daily_impressions = impressions/30`으로 저장됨.
이 1건은 known exception이며 mismatch에서 제외한다.

```sql
-- 값 변화 검증 (edge case 제외)
SELECT COUNT(*)
FROM media_computed_metrics
WHERE daily_impressions != COALESCE(legacy_daily_impressions, 0)
  AND NOT (
    legacy_daily_impressions IS NULL
    AND daily_impressions > 0
  );
-- 기대: 0

-- Known exception count (증가 감지용)
SELECT COUNT(*)
FROM media_computed_metrics
WHERE legacy_daily_impressions IS NULL AND daily_impressions > 0;
-- 기대: 1
```

## cpm 보존

```sql
SELECT COUNT(*)
FROM media_computed_metrics
WHERE cpm != COALESCE(legacy_cpm, 0);
-- 기대: 0
```

## grade / computed_at

```sql
SELECT reliability_grade, COUNT(*)
FROM media_computed_metrics
GROUP BY reliability_grade;
-- 기대: C = 821

SELECT MAX(computed_at) FROM media_computed_metrics;
-- 기대: 방금 execute 시각
```

## Known Exception (PR3 백필 유래)

| 필드 | 값 |
|------|-----|
| mediaId | `cmp3cfdsy000004jo3v38d9f4` |
| name | 헤스티아 (익스클루시브) 버스 외부 LED 전광판 |
| legacy_daily_impressions | NULL |
| daily_impressions | 1,733,333 |
| impressions (media) | 52,000,000 |

원인: `scripts/lib/backfill-mapping.ts` `toComputedMetric()` — `daily_footfall` NULL 시
`legacyDailyImpressions = null`, `dailyImpressions = round(impressions/30)`.

v0 pass-through는 `current.dailyImpressions`를 유지 (변경 없음).
향후 v1에서도 동일 fallback 규칙 적용 예정.
