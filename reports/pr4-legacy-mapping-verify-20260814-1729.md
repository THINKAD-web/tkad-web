# PR4 legacy mapping verify (production)

**생성**: 20260814-1729  
**DB**: production (`ep-holy-cloud-ah6w4cml`)  
**read-only SELECT**

## 검증 규칙

| # | 규칙 |
|---|------|
| 1 | `m.daily_footfall` = `cm.legacy_daily_impressions` |
| 2 | `m.cpm` = `cm.legacy_cpm` (media.cpm NOT NULL일 때) |
| 3 | `cm.daily_impressions` = `m.daily_footfall` (백필: legacy → dailyImpressions) |
| 4 | `cm.cpm` = `m.cpm` (media.cpm NOT NULL일 때) |

## 샘플 10건

```sql
SELECT m.id, m.daily_footfall, m.cpm,
  cm.legacy_daily_impressions, cm.daily_impressions,
  cm.legacy_cpm, cm.cpm AS computed_cpm
FROM media m
JOIN media_computed_metrics cm ON cm.media_id = m.id
ORDER BY m.id
LIMIT 10;
```

| id | daily_footfall | cpm | legacy_daily | daily_impressions | legacy_cpm | computed_cpm | 판정 |
|----|----------------|-----|--------------|-------------------|------------|--------------|------|
| cmnz82khn000004kzmu9sap6n | 180000 | 93333 | 180000 | 180000 | 93333 | 93333 | ✅ |
| cmnz9wm17000004kyd4r72mug | 175000 | 16667 | 175000 | 175000 | 16667 | 16667 | ✅ |
| cmnz9yrxe000004l288jjt5uw | 250000 | 59000 | 250000 | 250000 | 59000 | 59000 | ✅ |
| cmnzaaifg000004ldkwd7yj8f | 380000 | 42000 | 380000 | 380000 | 42000 | 42000 | ✅ |
| cmnzd5ryk000004l40ww1vr5n | 85000 | 14035 | 85000 | 85000 | 14035 | 14035 | ✅ |
| cmnzdrhjl000004lbqyg22tag | 120000 | 133000 | 120000 | 120000 | 133000 | 133000 | ✅ |
| cmnzdtqyf000204lbz82w6ipv | 9970000 | NULL | 9970000 | 9970000 | NULL | 0 | ✅† |
| cmnzdx938000004juq74t26bh | 85000 | 31500 | 85000 | 85000 | 31500 | 31500 | ✅ |
| cmnzek19o000004l49pqmjq6k | 172357 | 83000 | 172357 | 172357 | 83000 | 83000 | ✅ |
| cmnzk6cpf000004iefjf4kpq5 | 45000 | NULL | 45000 | 45000 | NULL | 0 | ✅† |

† `cpm` NULL → `legacy_cpm` NULL, `computed_cpm` 0 (백필 스크립트 `toComputedMetric` 동작)

**샘플 10건: 10/10 PASS** (규칙 1–4, NULL cpm 케이스 포함)

## 전체 821건

| 항목 | 건수 |
|------|------|
| join row | 821 |
| `daily_footfall` NOT NULL | 820 |
| `daily_footfall` NULL | 1 |

| 규칙 | mismatch |
|------|----------|
| 1 legacy_daily = daily_footfall | **0** |
| 2 legacy_cpm = cpm (cpm NOT NULL) | **0** |
| 3 daily_impressions = daily_footfall | **1** |
| 4 computed_cpm = cpm (cpm NOT NULL) | **0** |

## 불일치 1건 상세

| mediaId | name | daily_footfall | impressions | daily_impressions | 원인 |
|---------|------|----------------|-------------|-------------------|------|
| `cmp3cfdsy000004jo3v38d9f4` | 헤스티아 (익스클루시브) 버스 외부 LED 전광판 | **NULL** | 52,000,000 | **1,733,333** | `daily_footfall` 없음 → 백필이 `impressions/30`으로 `daily_impressions` 채움 (`legacy_daily_impressions` NULL) |

규칙 3은 **`daily_footfall` 있는 820건 전부 PASS**.  
유일 예외는 `daily_footfall` NULL 1건 — PR3 `toComputedMetric()` fallback (`impressions ÷ 30`)과 일치, 버그 아님.

## 결론

- **820/821**: 4규칙 모두 strict PASS (`daily_footfall` 보유 row)
- **1/821**: 규칙 3만 예외 — documented fallback
- PR4 read-only 전환 시 `legacy_*` 컬럼은 media 원본과 **100% 일치** (cpm NULL 제외 0 처리)
