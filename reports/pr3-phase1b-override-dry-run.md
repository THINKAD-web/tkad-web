# Phase 1b-3 override dry-run (13건)

생성: 2026-08-20T02:22:18.417Z

## FactSheet

- 13건 FactSheet 존재: **YES (13/13)**
- execute 시 FactSheet `force_loop_sov=true` UPDATE만 필요 (행 생성 불필요)

## Admin 배지 (needsSovBadge)

| | 건수 |
|---|-----:|
| override 전 「SOV 미적용 · 5b 대기」 | 0 |
| override 후 | 0 |

needsSovBadge는 isStatic=true 매체에 false. 13건은 원래 배지 없음 — override 후에도 동일.

## Phase 1 backfill 영향

| | 건수 |
|---|-----:|
| 현재 isStatic skip (13건 중) | 13 |
| execute 후 backfill 재실행 시 포함 | 13 |

execute 후 Phase 1 backfill 재실행 시 13건이 loop cohort에 편입됨 — spot/loop default 채우기·computedMetric 갱신 여부는 별도 승인.

## Before / After (14d)

| 매체 | SOV before | SOV after | imp 14d before | imp 14d after | CPM before | CPM after | basis after |
|------|:----------:|:---------:|---------------:|--------------:|-----------:|----------:|:-----------:|
| 도심공항 리무진버스 내부동영상 광고 | 1 | 0.1 | 451,500 | 45,150 | 7752 | 77519 | override |
| 부산 BRT 버스쉘터 광고 | 1 | 0.1 | 672,000 | 67,200 | 4464 | 44643 | override |
| 독립문역 스마트쉘터 광고 | 1 | 0.1 | 1,400,000 | 140,000 | 4286 | 42857 | override |
| 도심공항 리무진버스 창문상단 광고 | 1 | 0.1 | 451,500 | 45,150 | 266 | 2658 | override |
| 경기 G버스 TV 광고 | 1 | 0.1 | 8,883,000 | 888,300 | 7205 | 72048 | override |
| 경기 버스 내부 유리창 프로모션 광고 | 1 | 0.1 | 1,365,000 | 136,500 | 59 | 586 | override |
| 서울 시내 버스 TV 광고 | 1 | 0.1 | 7,728,000 | 772,800 | 5176 | 51760 | override |
| (광역) 경기 버스 내부 파노라마 광고 | 1 | 0.1 | 798,000 | 79,800 | 125 | 1253 | override |
| 부산 스마트 쉼터형 버스쉘터 광고 | 1 | 0.1 | 476,000 | 47,600 | 6303 | 63025 | override |
| 헤스티아 (익스클루시브) 버스 외부 LED 전광판 | 1 | 0.1 | 0 | 0 | — | — | override |
| 택시 미디어바 광고 | 1 | 0.1 | 945,000 | 94,500 | 5291 | 52910 | override |
| 광주 시내버스 내부 영상 광고 | 1 | 0.1 | 923,160 | 92,316 | 87 | 867 | override |
| 서울 택시 상단 영상 광고 | 1 | 0.1 | 367,500 | 36,750 | 54422 | 544218 | override |

상세 JSON: pr3-phase1b-override-dry-run.json