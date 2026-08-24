# A-4 3-1 — seoul_gwanak Backfill Dry-Run

> 생성: 2026-08-24 · **적용 전** · Preview → 확인 → Production  
> 스크립트: `npx tsx scripts/a4-3-1-backfill-dry-run.mts`

---

## 요약

| 집합 | 기준 | 건수 | 설명 |
|------|------|------|------|
| **A** | `region_sub=seoul_guro` + `district` 관악 | **6** | 원래 증상(구로/신도림) 직접 원인 |
| **B** | `region_zone=gwanak` + `sub≠seoul_gwanak` | **11** | planner zone vs browse sub 불일치 (더 넓음) |
| **A∩B** | 두 기준 모두 | **4** | 겹침 |
| **A only** | guro+관악, zone≠gwanak | **2** | 맥스비전 2건 (`region_zone=downtown`) |
| **B only** | gwanak zone, A 아님 | **7** | 동작·금천 등 (**별도 정책 필요**) |
| **Tier 1 (백필 대상)** | `district` 관악 + `sub≠seoul_gwanak` | **6** | **승인된 백필 범위** |

**6건 vs 11건:** 겹치는 4건. 11건은 planner `gwanak` zone(관악·동작·금천) 전체이고, 6건은 그중 **관악구 행정구**만. 백필은 **Tier 1 = 6건 unique** 로 진행.

---

## Tier 1 백필 대상 (6건)

| id | name | region_sub (before) | region_zone | slug 이슈 |
|----|------|---------------------|-------------|-----------|
| `cmp02a32h000804jx74rsirpz` | 서울대입구역 우남빌딩 | seoul_guro | gwanak | OK |
| `cms7cpp85000e04jm72xswkrv` | 지하철 2호선 **서울대입구역** 맥스비전 | seoul_guro | downtown | ⚠️ slug `sinrimyeok` |
| `cmpbcufq0000004l4kl2vh2no` | 사당역 삼진빌딩 | seoul_guro | gwanak | OK |
| `cmp02109u000604jxnuzp4ypp` | 신림역 정도빌딩 | seoul_guro | gwanak | OK |
| `cmofq46f8000204leputaopdy` | 신림역사거리 | seoul_guro | gwanak | OK |
| `cms7cmnak000h04jlwlgu1viw` | 지하철 2호선 신림역 맥스비전 | seoul_guro | downtown | OK |

### 서울대입구 증상 매체 포함 확인 ✅

- `cmp02a32h000804jx74rsirpz` — 우남빌딩 (Tier 1)
- `cms7cpp85000e04jm72xswkrv` — 맥스비전 (Tier 1, slug 별도 이슈)

Set C(서울대입구 name/slug) 3건 중 Tier 1 포함 2건.  
**제외 1건:** `cms7cxwdg000604kyi4epi3tu` — 이름 **사당역**, slug `seouldaeipgu`, district **동작구** → 백필 대상 아님, slug 오입력 수동 검토.

---

## B only 7건 — 이번 백필 제외

`region_zone=gwanak` 이지만 district가 동작·금천 등. browse sub가 yeongdeungpo/gangnam/null인 경우 — **관악 sub로 일괄 변경하면 새 오분류**. 별도 PR/정책.

---

## Apply SQL (Tier 1, Preview 먼저)

```sql
-- Dry-run count
SELECT id, name, region_sub, region_zone, district
FROM media
WHERE is_active = true
  AND region_main = 'seoul'
  AND district ILIKE '%관악%'
  AND (region_sub IS NULL OR region_sub != 'seoul_gwanak');

-- Apply (Preview → verify → Production)
UPDATE media
SET region_sub = 'seoul_gwanak'
WHERE is_active = true
  AND region_main = 'seoul'
  AND district ILIKE '%관악%'
  AND (region_sub IS NULL OR region_sub != 'seoul_gwanak');
```

코드 PR과 함께: `MEDIA_BROWSE_REGIONS`에 `seoul_gwanak` taxonomy 추가 + `inferBrowseRegionFromMedia` zone-map.

---

## Rollback SQL

`reports/a4-3-1-backfill-dry-run.json` → `rollbackSql` 필드 (레코드별 before 값).  
pricing_mode 마이그레이션과 동일 — **apply 직전 JSON 스냅샷 + rollback SQL 보관**.

---

## Slug 수동 검토 (급하지 않음, 기록)

| id | 문제 |
|----|------|
| `cms7cpp85000e04jm72xswkrv` | 이름=서울대입구역, slug=`sinrimyeok` (신도림) |
| `cms7cxwdg000604kyi4epi3tu` | 이름=사당역, slug=`seouldaeipgu` (서울대입구) |

taxonomy/백필과 별개 — 레코드 메타데이터 오입력.

---

## 절차 (승인됨)

1. ✅ Dry-run (this doc)
2. Code PR: taxonomy + inference
3. Preview DB apply → PDF 상권표 `관악` 확인
4. Production apply + rollback SQL 대기
