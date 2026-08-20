# #411 Phase A — admin 메트릭 방어

생성: 2026-08-20  
브랜치: `feat/pr3-phase411-admin-metrics-guard`  
범위: **Phase A only** (데이터 정정 B / FactSheet C / 엔진 D 제외)

> Claude Code Opus 전환은 이 Cursor 세션에서 수행할 수 없음. 구현은 동일 범위로 진행.

---

## 3-3 영향 경로 (전수)

### calcImpressions (엔진 — Phase A 미변경)

| 파일 | 역할 |
|------|------|
| `lib/metrics/impressions.ts` | 정의 |
| `lib/metrics/cpm.ts` | CPM 산출 |
| `lib/planner/brief/mix-metrics.ts` | 플래너 mix |
| `lib/metrics/__tests__/*` | 테스트 |
| `scripts/dry-run-pr3-phase4a-5-lts-split.mts` 등 | 감사 스크립트 |

### dailyFootTraffic (read — Phase A 미변경)

카탈로그 매핑 `lib/public-media-catalog.ts` (`dailyFootfall` → `dailyFootTraffic`)가 단일 정규화 지점. 플래너·견적·카드는 이 값을 소비.

### validateMediaMetricsWrite 호출처 (Phase A 확장)

| 경로 | 이전 | 이후 |
|------|------|------|
| `POST /api/admin/medias` | ✅ 검증, 경고 저장 허용, UI 미표시 | ✅ 3×/10×/cap/PKG + **409 ack** |
| `PATCH /api/admin/medias/[id]` | 동일 | 동일. `isActive`만 바꾸면 **스킵** (grandfather) |
| `POST /api/admin/medias/quick-add` | ❌ | ✅ mapped 검증 + 409 ack |
| `PUT /api/admin/medias/[id]/json` | ❌ | ✅ mapped 검증 + 409 ack |
| `POST /api/admin/medias/bulk-import` | ❌ | ✅ 행 단위 **error 실패**, 경고는 저장 허용(배치 부분커밋 방지) |
| `POST /api/admin/medias/import-csv` | △ footfall 2M만 | ✅ + 이름/유형 PKG, dry-run에도 검증 |
| `POST /api/media-applications` | ❌ | ✅ dailyFootfall 2M 하드 거부 |
| `approveMediaApplication` | ❌ | ✅ mapped 하드 거부 |
| `POST/PATCH /api/admin/networks` | ❌ | ✅ 네트워크 합산 5M, 지점 2M |

---

## 클래스별 월노출 hard cap (초안 → 이번 PR 채택)

판매단위 1개 기준. `bus_exterior` **2M 재한 확정**.

| class | cap | 근거 |
|-------|----:|------|
| **bus_exterior** | **2,000,000** | 1대 월 ~189k의 ~10×. G버스 64M 차단 |
| bus_shelter | 5,000,000 | PLAUSIBLE 150k×30 ≈ 4.5M |
| elevator_tv | 2,000,000 | 50k×30 = 1.5M |
| subway_psd | 15,000,000 | 강남급 여유. 메트로라이브 45M 차단 |
| subway_light | 15,000,000 | 동상 |
| dooh_large | 20,000,000 | 18.5M Full Package는 cap 통과 → **PKG warn** |
| dooh_mid | 8,000,000 | 중형 면 |
| airport | 10,000,000 | 300k×30 |
| static_other | 15,000,000 | 기본 폴백 |

CPM: **3× warn + 10× error + ₩1–10 placeholder warn**

기존 불량 행은 impressions를 **이번 요청에서 쓰지 않으면** cap 미적용 (grandfather).

---

## dry-run

```
npx tsx scripts/dry-run-pr3-phase411-admin-guard.mts
```

픽스처 기대:

| id | gate |
|----|------|
| gbus-64m | error `impressions_class_cap` |
| ee-placeholder | error `cpm_mismatch` (+ placeholder warn) |
| full-package-18-5m | needs_ack `package_network_scale` |
| metro-live-45m | error `impressions_class_cap` |
| normal-bus-wrap | ok |

데이터 execute 없음. Phase B에서 G버스 traffic 정정.

---

## 검증 (재한 승인 후)

- [ ] 단위 테스트 `lib/media-metrics-write.test.ts`
- [ ] 위 dry-run 스크립트
- [ ] admin 매체 저장: 경고 모달 → 확인 후 저장
- [ ] 버스 64M impressions API 직접 입력 시 400
- [ ] 네트워크 지점 2M 초과 400, 합산 5M 초과 400
