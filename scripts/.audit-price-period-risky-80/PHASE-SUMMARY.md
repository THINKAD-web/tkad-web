# Phase A + B 결과 — 한글 period 폴백

**브랜치**: `fix/price-period-normalization`  
**기준**: `358be7b8`

## Phase A — 구현

### 판단 (자유 입력 경로)
- Admin **카드 select**: 이미 enum 4키 — 정상 워크플로우.
- Admin **JSON textarea** / API / quick-add: 레거시·대량 편집 편의.
- **정책**: 안전 month 별칭(`1개월`/`월`/`monthly`)은 저장 시 **`month`로 coerce** + 서버 warn 로그.  
  그 외 비정규 값(`1일`/`2주` 등)은 **400 거절** (재발 방지). Phase B 자동 매핑 없음.

### 코드
- `lib/media-price-period-write.ts` — 쓰기 coerce/검증 SSOT
- `normalizePriceOptionsForPrisma` — 거절/coerce
- Admin JSON `validatePriceOptionsJsonField` — 동일 규칙
- `media-quick-add` — 동일 규칙

### 백필 (적용 완료)
- 대상: `1개월` | `월` | `monthly` only
- **596 media / 1021 option hits** → `month`
- **display diff-0** (전후 `resolveMediaDisplayPrice` 동일)
- 재실행 dry-run: **0건** (멱등)
- 백업: `scripts/.backups/month-period-alias-backfill-2026-07-21T11-25-26-733Z.json`

### 테스트
- `lib/media-price-period-write.test.ts`
- `lib/admin-media-price-options.test.ts`  
→ 10 pass

## Phase B — 감사만 (코드/데이터 자동 수정 없음)

- **80건** 리스트: `scripts/.audit-price-period-risky-80/`
  - `AUDIT.md` / `audit.csv` / `audit.json`
- 우선: **명동 미디어폴** — `1일` 70만 → 여전히 표시 `₩70만/month` (의도적으로 미수정)
- 운영자 수동 정정 대기 (자동화 금지)

## 비범위 (유지)
- 읽기 `normalizeMediaPricePeriod`의 단기 한글→day/week 자동 매핑 — 아직 안 함
- 80건 DB 정정 — 사람 검토 후
