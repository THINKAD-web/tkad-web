# PR4 CPM 결측 분석 (production)

**생성**: 20260814-1738  
**DB**: production (`ep-holy-cloud-ah6w4cml`)  
**read-only SELECT**

## 1. 전체 요약

```sql
SELECT 
  COUNT(*) AS total,
  COUNT(cpm) AS has_cpm,
  COUNT(*) - COUNT(cpm) AS null_cpm
FROM media;
```

| total | has_cpm | null_cpm | null 비율 |
|-------|---------|----------|-----------|
| **821** | **804** | **17** | **2.1%** |

## 2. CPM NULL 매체 — type × sub_category (상위)

```sql
SELECT type, sub_category, COUNT(*) AS cnt
FROM media
WHERE cpm IS NULL
GROUP BY type, sub_category
ORDER BY cnt DESC
LIMIT 20;
```

| type | sub_category | cnt |
|------|--------------|-----|
| static | 외벽광고 | 6 |
| digital | 디지털 전광판 | 5 |
| digital | 전광판 | 1 |
| mobile | 버스 외부광고 | 1 |
| static | 게릴라 포스터 | 1 |
| static | 매장 제휴 광고 | 1 |
| static | 빌딩 제휴 광고 | 1 |
| digital | 실내전광판 | 1 |

**8개 (type, sub_category) 조합**, 총 17건.

## 3. PR3 백필 연계

- `cpm` NULL → `media_computed_metrics.legacy_cpm` NULL, `computed_cpm` **0** (백필 스크립트)
- `pr4-legacy-mapping-verify`: cpm NOT NULL 804건 legacy/computed **100% 일치**
- CPM NULL 17건은 UI·플래너에서 0으로 노출될 수 있음 → PR4 read-only + PR5 engine v0 재계산 대상

## 4. 관찰

- **static / 외벽광고** 6건이 최다 — 가격은 있으나 CPM 미입력 가능성
- **digital / 디지털 전광판** 5건 — 규격·노출 데이터와 함께 dimension 정리 스프린트 후보
- 전체 821 대비 17건(2.1%) — 소수이나 유형별로 clustered
