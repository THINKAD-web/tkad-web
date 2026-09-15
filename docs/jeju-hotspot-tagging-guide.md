# 제주 생활권 Hotspot 태깅 가이드

운영자용 1페이지 — 신규 제주 매체 등록·수정 시 참고.

## 개요

`hotspot_tags`는 제주 매체의 **생활권·동선 유형**을 JSON 배열로 저장합니다.  
브리프에 "생활권", "이동 동선" 등이 포함되면 매칭 점수에 **가·감점**(−10~+10)만 적용됩니다. **필터(제외)는 하지 않습니다.**

- `null` 또는 `[]` → hotspot 미적용 (기존 매칭과 동일)
- 제주 외 지역 → admin UI 미노출, 스코어링 무시

## Zone taxonomy (6개)

| zoneId | 라벨 | 허용 type |
|--------|------|-----------|
| `jeju_downtown` | 제주 시내·중앙로 | commercial, residential |
| `jeju_seogwipo` | 서귀포 | commercial, tourist |
| `jeju_airport` | 제주공항 | airport, tourist, transit_corridor |
| `jeju_nohyeong` | 노형·연동 | residential, commercial |
| `jeju_ara` | 애월·한림 | tourist, residential |
| `jeju_transit` | 시내·간선 버스 동선 | transit_corridor |

## Type 설명

| type | 의미 | 브리프 키워드 예 |
|------|------|------------------|
| `residential` | 주거·도민 생활권 | 생활권, 주거, 도민 |
| `commercial` | 상권·시내 | 상권, 시내 |
| `airport` | 공항 | 공항 |
| `tourist` | 관광 | 관광객, 관광 |
| `transit_corridor` | 이동·통근 동선 | 이동 동선, 버스 동선 |

## Admin 태깅

1. 매체 `regionMain = jeju` 로 설정
2. 매체 수정 폼 → **생활권 태그** 섹션
3. Zone + Type 조합 추가, weight 0.5~2.0 (기본 1.0)
4. 저장 → PATCH `/api/admin/medias/[id]` `hotspotTags`

### 태깅 예시

**제주공항 LED**
```json
[
  { "regionId": "jeju", "zoneId": "jeju_airport", "type": "airport", "weight": 1.2 },
  { "regionId": "jeju", "zoneId": "jeju_airport", "type": "tourist", "weight": 1.0 },
  { "regionId": "jeju", "zoneId": "jeju_airport", "type": "transit_corridor", "weight": 1.0 }
]
```

**중앙로 전광판**
```json
[
  { "regionId": "jeju", "zoneId": "jeju_downtown", "type": "commercial", "weight": 1.0 },
  { "regionId": "jeju", "zoneId": "jeju_downtown", "type": "residential", "weight": 1.0 }
]
```

## 초기 시드 (패턴 매핑)

```bash
# dry-run (전체 목록 확인)
npx tsx --env-file=.env.local scripts/seed-jeju-hotspot-tags.ts

# apply (승인 후)
npx tsx --env-file=.env.local scripts/seed-jeju-hotspot-tags.ts --apply
```

| 매체명 패턴 | tags |
|-------------|------|
| 제주공항 | airport, tourist, transit_corridor @ jeju_airport |
| 노형/중앙로/광양 | commercial, residential @ jeju_downtown |
| 시내 버스 | transit_corridor @ jeju_transit |
| 서귀포/중문 | tourist @ jeju_seogwipo |

## 주의

- 도민·생활권 브리프에서 **공항·관광 태그 매체는 감점** (제외 아님)
- 제주 외 매체·미태깅 매체는 점수 변화 없음
- `targetCategory` slug 추가 없음 — hotspot 전용 JSON만 사용
