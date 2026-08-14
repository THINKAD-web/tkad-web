# PR3 Media Layer Backfill

`media` (SELECT only) → `media_fact_sheets` + `media_computed_metrics`

## 선행 조건

- PR2 프로덕션 migrate 완료
- Preview DB **71 cols** (orphan 23 cols 정리)
- `docs/media-data-contract.md` §16.2 stationCode 옵션 확정 (또는 `RAW_COPY`)
- 재한 Preview dry-run/execute 승인

## 환경

```bash
export DATABASE_URL="..."   # 파일 저장 금지
# production: ep-holy-cloud-…
# preview:    ep-shiny-sun-… (vercel-preview branch)
```

## 명령

```bash
# dry-run (기본)
npx tsx scripts/backfill-media-layers.ts --mode=dry-run \
  --report=reports/pr3-backfill-preview-dryrun-$(date +%Y%m%d-%H%M).md

# execute (Preview)
npx tsx scripts/backfill-media-layers.ts --mode=execute \
  --confirm=YES-BACKFILL-preview \
  --report=reports/pr3-backfill-preview-execute-$(date +%Y%m%d-%H%M).md

# verify
npx tsx scripts/backfill-media-layers.ts --mode=verify

# rollback
npx tsx scripts/backfill-media-layers.ts --mode=rollback \
  --confirm=YES-ROLLBACK-preview

# production execute (재한 승인 후)
npx tsx scripts/backfill-media-layers.ts --mode=execute \
  --confirm=YES-BACKFILL-production
```

## 화이트리스트

| 테이블 | PR3 |
|--------|-----|
| `media` | SELECT only |
| `media_fact_sheets` | INSERT/UPDATE |
| `media_computed_metrics` | INSERT/UPDATE |
| 그 외 | **접근 금지** |

## 설정

- `STATIONCODE_MODE`: `scripts/lib/backfill-mapping.ts` — 현재 `RAW_COPY`
- `BACKFILL_MODEL_VERSION`: `legacy-migration-v1`
