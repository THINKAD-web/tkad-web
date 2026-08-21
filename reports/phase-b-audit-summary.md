# Phase B 1단계 감사 요약 (읽기 전용)

값 미변경. reviewStatus 컬럼은 스키마에 없음 (2단계 후보).

## Prisma 매핑

| 논리명 | 실제 필드 | 모델 |
|---|---|---|
| impressions | `Media.impressions` | Media |
| dailyFootfall | `Media.dailyFootfall` → `daily_footfall` | Media |
| network cap | `MediaNetwork.dailyFootfall` | MediaNetwork (#428 `validateNetworkAggregateFootfall`) |
| subway | `classifyForMetricsWrite` → subway_psd / subway_light | #428 |
| Package | `detectPackageNetworkKeyword` (타입 컬럼 없음) | #428 |
| lastUpdatedAt | `updatedAt` | Media / MediaNetwork |
| lastUpdatedBy | 없음. CSV는 `ownerUserId` 또는 공란 | |
| reviewStatus | **없음** | Phase 2 |

## 건수

| A network-cap | 0 |
| B subway 15M | 5 |
| C package+dailyFootfall≥2M | 1 |
| D ratio (참고, 별도 CSV) | 189 |
| E null/negative (별도 CSV) | 72 |
| catalog rows scanned | 882 |
| networks scanned | 8 |
| G버스 TV in A/B/C CSV | true |

ABC: `/Users/jaehanlee/thinkad-work/tkad-web/reports/phase-b-audit-report.csv`
D: `/Users/jaehanlee/thinkad-work/tkad-web/reports/phase-b-audit-report-d.csv`
E: `/Users/jaehanlee/thinkad-work/tkad-web/reports/phase-b-audit-report-e.csv`
