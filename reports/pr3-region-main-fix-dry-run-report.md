# region_main 불일치 7건 정정 — dry-run (2026-08-19)

**목적:** 플래너 지역 필터 정확도 — "서울 캠페인"에 인천·대구·경기 매체가 섞이는 문제  
**범위:** 도달률 엔진 아님 (`regionMain` / `regionSub` 정정)

---

## 정정 목록 (7건)

| # | mediaId | name | before → after | regionSub |
|---|---------|------|------------------|-----------|
| 1 | `cmrm2f88…` | 전통시장 LED | seoul → **gyeonggi** | gyeonggi_bucheon |
| 2 | `cmqrpy6…` | 공항철도 검암역 | seoul → **incheon** | incheon_airport |
| 3 | `cmqrnc9…` | 공항철도 Full PKG | seoul → **incheon** | incheon_airport |
| 4 | `cmoy5jr…` | 대구 지하철 동대구역 | seoul → **daegu** | daegu_downtown |
| 5 | `cmqrpnx…` | 김포공항역 | seoul → **gyeonggi** | gyeonggi_gimpo |
| 6 | `cmqt7eg…` | 광역전철 PKG | seoul → **gyeonggi** | gyeonggi_seongnam |
| 7 | `cmqt906…` | 부평역 | seoul → **incheon** | incheon_downtown |

---

## dry-run 결과 (production)

| 항목 | 값 |
|------|-----|
| wouldUpdate | **7** |
| skip | 0 |
| verdict | **ready** |

### 플래너 필터 (정정 후)

| 매체 | matchesSeoul | matchesGyeonggi | matchesIncheon | matchesDaegu |
|------|:---:|:---:|:---:|:---:|
| 경기 3건 | ✗ | ✓ | ✗ | ✗ |
| 인천 3건 | ✗ | ✗ | ✓ | ✗ |
| 대구 1건 | ✗ | ✗ | ✗ | ✓ |

→ **서울 필터에 더 이상 포함되지 않음** ✅

---

## coverage 매핑 재확인 (부수 효과)

| 구분 | 건수 | coverageAfter |
|------|-----:|---------------|
| 경기 3건 | 3 | **매핑 가능** (부천 원미 382,134 / 김포 / 분당 467,039) |
| 인천 3건 | 3 | NULL (`not_seoul_gyeonggi`) — **정상** |
| 대구 1건 | 1 | NULL — **정상** |

execute 시 `--with-coverage` 옵션으로 경기 3건만 coverage backfill 가능 (선택).

---

## Execute (승인 후)

```bash
# regionMain만
npx tsx scripts/backfill-pr3-region-main-mismatch-fix.mts --execute --allow-prod

# regionMain + 경기 3건 coverage
npx tsx scripts/backfill-pr3-region-main-mismatch-fix.mts --execute --allow-prod --with-coverage
```

정정 후 `remainingMismatches.count` = **0** 기대.

JSON: [`pr3-region-main-fix-dry-run-production.json`](pr3-region-main-fix-dry-run-production.json)

---

**execute 승인 대기.**
