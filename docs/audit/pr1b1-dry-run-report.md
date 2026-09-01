# PR1b-1 Dry-Run Report — Online Schema Addition

**Date**: 2026-09-01  
**Branch**: `feat/pr1b1-online-schema`  
**Status**: Implementation complete — Preview gate pending

---

## Summary

| Item | Result |
|------|--------|
| **Character** | Pure additive — no nullable/type/price changes |
| **Online mains** | 6 values defined (`search` … `local`) |
| **`media_online_spec`** | 1:1 table, typed columns, 0 rows expected |
| **`catalog_channel='online'`** | 0 rows (unchanged) |
| **Browse `digital` bucket** | Retired → 6 online mains + legacy aliases |

---

## 1-5. `media-map-page-client.tsx:858` 판정

```858:858:components/media-map/media-map-page-client.tsx
type: (it.type as MediaItem["type"]) ?? "dooh",
```

**Verdict: PR0 잔여물 — `dooh`로 정정.**

- Map API items without `type` defaulted to `"digital"`, which PR0 retired as `Media.type`.
- Map surface is OOH-only; missing type → conservative `dooh` (electronic display) is correct.
- **Not** displayMode axis intent — legacy default that survived PR0 rename.
- 라벨 트랙(`typeLabels.dooh`)과 무관.

---

## Multilingual (`media_online_spec`)

dmpilot 23건 확인:

| Field | EN data? | PR1b-1 column |
|-------|----------|---------------|
| `descriptionEn`, `featuresEn` | Yes (product level) | N/A — not in spec table |
| `strengths` | KO only | `strengths String[]` |
| `kpiHintsKo` | KO only | `kpiHints` (no `_ko` suffix) |
| `idealFor` | KO only | `bestFor` |

**Decision: `*En` columns not created** — spec text arrays are KO-only at seed; add siblings when EN content exists.

---

## Schema

### Online browse mains

| id | Label |
|----|-------|
| search | 검색광고 |
| display | 디스플레이 |
| video | 영상 |
| sns | SNS |
| message | 메시지 |
| local | 로컬·리테일 |

### `media_online_spec`

See `prisma/schema.prisma` — `platform`, `minBudget`, nullable CPC/CPM, `targetingOptions`, `strengths`, `kpiHints`, `bestFor`.

---

## Legacy URL compatibility

| Legacy | Resolves to |
|--------|-------------|
| `mainCategory=digital` | `search` |
| `subCategory=search_ad` | main `search` |
| `subCategory=social_media` | main `sns` |

`resolveCatalogChannelForMediaWrite({ mediaMainCategory: "digital" })` still → `online` via alias.

---

## Migrations

1. `npx prisma migrate deploy` — `20260901193000_media_online_spec`
2. `psql … -f scripts/migrations/pr1b1-online-schema-forward.sql` — count verification

Rollback: `scripts/migrations/pr1b1-online-schema-rollback.sql`

**Re-apply after rollback** (preview/prod):

1. `psql … -f prisma/migrations/20260901193000_media_online_spec/migration.sql`
2. `psql … -f scripts/migrations/pr1b1-online-schema-forward.sql`

(`prisma migrate deploy` skips if migration already recorded.)

---

## Verification checklist

- [ ] Preview: 889 offline, 0 online, 0 spec rows
- [ ] Price regression 34 samples — 0 mismatch
- [ ] Filter counts unchanged vs pre-PR1b-1
- [ ] Browse shows 6 online mains with 「검색광고」… labels (0 count each)
- [ ] Rollback → re-apply idempotent

---

## Out of scope (PR1b-2)

- `Media.type` / `Media.price` nullable
- `inferOfflineFromDisplayType()` / NULL-main error
- `resolveMediaDisplayLabels()`
- Invariant CHECK constraints
- A7 cart snapshot

See `docs/audit/pr1b1-a4-streaming-slug.md` for A4.
