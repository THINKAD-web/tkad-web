# Cross-app / orphan DB objects (tkad-web production)

**갱신**: 2026-08-14  
**관련 리포트**: `reports/digital-media-orphan-20260814-1444.md`, `reports/schema-drift-20260814-1432.md`

---

## `digital_media` (production only)

| 항목 | 값 |
|------|-----|
| 테이블 | `digital_media` |
| Rows | 30 (2026-08-14 조사) |
| Migration | `20260725120000_digital_media_catalog` — **git `prisma/migrations/`에 파일 없음** |
| tkad-web 코드 | **참조 없음** (`app/` `lib/` `prisma/schema.prisma`) |
| 용도 추정 | 디지털 광고 플랫폼 카탈로그 (Google, Naver, Meta, Kakao 등) — **dmpilot 또는 별도 앱 실험** |
| PR3 백필 | **접근 금지** (SELECT 포함) |

### 운영 원칙

- tkad-web Prisma schema에 포함하지 않음 (orphan 유지)
- DROP / migrate는 재한 + dmpilot 담당자 합의 후
- `_prisma_migrations` drift 해소 시 migration SQL 복구 또는 `migrate resolve` 검토

---

## Preview-only orphans (production 없음)

| 객체 | migration | 비고 |
|------|-----------|------|
| `campaign_plans` | `20260810150000_pr3_media_metric_fields_and_campaign_plans` | branch `claude/thinkad-planner-engine-audit-vvaaym`, main 미merge |
| `media` +23 cols | 동일 migration | Preview drift — production **71 cols** 기준 유지 |

Preview 정리: production 브랜치 rebase 또는 orphan rollback 후 **71 cols** 확인 (PR3 선행 조건).

---

## PR3 write 화이트리스트

| 테이블 | PR3 |
|--------|-----|
| `media` | SELECT only |
| `media_fact_sheets` | INSERT/UPDATE |
| `media_computed_metrics` | INSERT/UPDATE |
| `media_external_signals` | 미사용 |
| **그 외 전부** | **접근 금지** |
