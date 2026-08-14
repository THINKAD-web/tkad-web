# PR3 UNKNOWN dimension_source 분석

**생성**: 20260814  
**DB**: production (`ep-holy-cloud-ah6w4cml`)  
**기준**: PR3 백필 완료 후 `media_fact_sheets`

## 1. 요약

| 항목 | 값 |
|------|-----|
| FactSheet 총 row | 817 |
| UNKNOWN | **145** |
| 비율 | **145 / 817 = 17.7%** |
| MEASURED | 672 (82.3%) |
| PARSED_FROM_TEXT | 0 |

UNKNOWN = `width_m`/`height_m` 없고, `width`/`height` 텍스트에서도 규격 파싱 불가한 경우.

## 2. 매체유형별 분포

```sql
SELECT fs.media_subtype, COUNT(*) AS unknown_count
FROM media_fact_sheets fs
WHERE fs.dimension_source = 'UNKNOWN'
GROUP BY fs.media_subtype
ORDER BY unknown_count DESC;
```

| media_subtype | unknown_count | 전체 UNKNOWN 대비 |
|---------------|---------------|-------------------|
| dooh | 58 | 40.0% |
| subway_platform | 45 | 31.0% |
| billboard | 32 | 22.1% |
| other | 4 | 2.8% |
| subway_concourse | 3 | 2.1% |
| bus_wrap | 2 | 1.4% |
| taxi | 1 | 0.7% |
| **합계** | **145** | 100% |

## 3. 매체유형별 대응 전략

### subway_platform (45건) + subway_concourse (3건) → **48건, 일괄 매핑**

- **원인**: 지하철 역사 디지털/포스터 규격이 DB `width_m`/`height_m` 미입력.
- **대응**: 서울교통공사·부산교통공사 등 **표준 규격표** 조사 후 `media_subtype` + 노선/역 유형별 **일괄 MEASURED 매핑** 가능.
- **기대 효과**: UNKNOWN 중 **~33%** (48/145) 일괄 해소.

### dooh (58건) → **개별 spec sheet 수집**

- **원인**: 빌딩·상업시설 전광판 등 규격이 매체마다 상이, legacy 텍스트 불완전.
- **대응**: 매체사·운영사 **spec sheet** 개별 수집 → `width_mm`/`height_mm` 수동 또는 반자동 입력.
- **우선순위**: 트래픽·매출 상위 매체부터.

### billboard (32건) → **실측 또는 폐기 판단**

- **원인**: 옥외 빌보드·래핑 등 현장 규격 미기록, 텍스트 필드만 존재.
- **대응**:
  - 활성 매체 → **현장 실측** 또는 위성/Street View 보조 추정
  - 비활성·단종 → **is_active` 검토 후 catalog 정리** (폐기 후보)

### 그 외 (10건: other 4 + bus_wrap 2 + taxi 1 + subway_concourse는 위에 포함됨)

- **other** 4, **bus_wrap** 2, **taxi** 1 → **개별 확인**
- 소수이므로 어드민 수동 1건씩 처리 후 `dimension_source = MEASURED` 갱신.

## 4. 권장 스프린트

**PR6+ 외부 데이터 signal 파이프라인 착수 전**, 별도 **「dimension 정리 스프린트」** 권장.

| Phase | 대상 | 예상 해소 |
|-------|------|-----------|
| A | subway 일괄 (platform + concourse) | ~48건 |
| B | dooh spec sheet (상위 N건) | 점진 |
| C | billboard 실측/정리 | ~32건 |
| D | 잔여 개별 | ~10건 |

목표: UNKNOWN **145 → 50 이하** (PR5 metric engine v0 입력 품질 확보).

## 5. 관련 리포트

- `reports/pr3-backfill-prod-execute-20260814-1637.md`
- `reports/pr3-station-field-check-20260814-1558.md`
