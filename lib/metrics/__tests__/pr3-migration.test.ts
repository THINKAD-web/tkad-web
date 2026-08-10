/**
 * PR-3 스키마 확장 회귀 테스트.
 *
 * DB 없이 검증할 수 있는 것:
 *   1. 마이그레이션 SQL 이 신규 컬럼을 전부 담고 있는가
 *   2. Prisma 스키마의 컬럼 이름 ↔ SQL 컬럼 이름이 일치하는가
 *   3. 감사 하네스가 PR-3 필드를 실제로 읽어 결손을 카운트하는가
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { auditRow, createAccumulator, type AuditMediaRow } from "../audit-rules";

const ROOT = resolve(process.cwd());

const MIGRATION_SQL = readFileSync(
  resolve(
    ROOT,
    "prisma/migrations/20260810150000_pr3_media_metric_fields_and_campaign_plans/migration.sql",
  ),
  "utf8",
);

const SCHEMA_PRISMA = readFileSync(
  resolve(ROOT, "prisma/schema.prisma"),
  "utf8",
);

const NEW_MEDIA_COLUMNS = [
  "selling_unit",
  "unit_daily_traffic",
  "traffic_source",
  "traffic_updated_at",
  "contact_rate",
  "contact_rate_basis",
  "spot_duration",
  "loop_duration",
  "plays_per_hour",
  "coverage_dongs",
  "coverage_population",
  "demo_gender_split",
  "demo_age_split",
  "demo_source",
  "demo_confidence",
  "resolution_w",
  "resolution_h",
  "aspect_ratio",
  "file_formats",
  "max_file_size_mb",
  "has_audio",
  "submission_deadline",
  "region_code",
];

test("PR-3: 신규 컬럼이 마이그레이션 SQL 에 전부 있다", () => {
  for (const col of NEW_MEDIA_COLUMNS) {
    assert.ok(
      MIGRATION_SQL.includes(`"${col}"`),
      `마이그레이션에 컬럼 "${col}" 누락`,
    );
  }
});

test("PR-3: 신규 컬럼이 Prisma 스키마에도 mapping 돼 있다", () => {
  for (const col of NEW_MEDIA_COLUMNS) {
    assert.ok(
      SCHEMA_PRISMA.includes(`@map("${col}")`),
      `Prisma 스키마에 @map("${col}") 없음`,
    );
  }
});

test("PR-3: campaign_plans 테이블·인덱스·FK 가 정의돼 있다", () => {
  assert.ok(MIGRATION_SQL.includes('CREATE TABLE IF NOT EXISTS "campaign_plans"'));
  assert.ok(MIGRATION_SQL.includes('"share_token"'));
  assert.ok(MIGRATION_SQL.includes('"engine_version"'));
  assert.ok(
    MIGRATION_SQL.includes('"campaign_plans_share_token_key"'),
    "shareToken UNIQUE 인덱스 누락",
  );
  assert.ok(
    MIGRATION_SQL.includes('"campaign_plans_expires_at_idx"'),
    "TTL 정리용 expires_at 인덱스 누락",
  );
  assert.ok(
    MIGRATION_SQL.includes("ON DELETE SET NULL"),
    "owner 삭제 시 SET NULL 정책 누락 — 삭제된 사용자의 플랜이 유실될 수 있음",
  );
});

test("PR-3: 마이그레이션은 backfill 을 수행하지 않는다 (PR-4 몫)", () => {
  const bannedPatterns = [/\bUPDATE\s+"?media"?\s+SET/i, /\bINSERT\s+INTO\s+"?media"?/i];
  for (const re of bannedPatterns) {
    assert.equal(
      re.test(MIGRATION_SQL),
      false,
      `마이그레이션이 media 데이터를 쓰고 있음: ${re}. backfill 은 PR-4 로 분리해야 한다.`,
    );
  }
});

test("PR-3: NOT NULL 은 default 가 있을 때만 (기존 매체 안전)", () => {
  // NOT NULL DEFAULT ... 는 허용, NOT NULL 단독은 기존 행을 깨뜨린다.
  const notNullRe = /NOT NULL(?!\s+DEFAULT)/gi;
  const alter = MIGRATION_SQL.match(/ALTER TABLE "media"[\s\S]*?;/);
  assert.ok(alter, "ALTER TABLE media 블록을 찾지 못함");
  const matches = alter[0].match(notNullRe);
  assert.equal(
    matches,
    null,
    `ALTER TABLE media 에 DEFAULT 없는 NOT NULL 컬럼이 있음 (기존 매체 깨짐): ${matches?.join(", ")}`,
  );
});

// ── 감사 하네스가 PR-3 필드를 실제로 읽는지 ──────────────────────

function row(o: Partial<AuditMediaRow> = {}): AuditMediaRow {
  return {
    id: "cm1",
    slug: null,
    name: "테스트",
    type: "static",
    region: "서울",
    regionMain: "서울",
    location: "서울 중구",
    description: null,
    price: 1_000_000,
    pricePeriod: "month",
    priceOptions: null,
    priceNote: null,
    widthM: null,
    heightM: null,
    resolution: null,
    targetAge: null,
    dailyFootfall: 50_000,
    impressions: null,
    cpm: null,
    mediaMainCategory: "ooh",
    mediaSubCategory: "billboard",
    latitude: 37.5,
    tags: [],
    nearbyStations: null,
    nearbyLandmarks: null,
    ...o,
  };
}

test("PR-3: backfill 완료된 매체는 R-07 결손이 줄어든다", () => {
  const empty = createAccumulator();
  auditRow(row(), empty);

  const filled = createAccumulator();
  auditRow(
    row({
      sellingUnit: "panel",
      contactRate: 0.3,
      coveragePopulation: 100_000,
      coverageDongs: [{ code: "11680", weight: 1 }],
      demoGenderSplit: { male: 0.48, female: 0.52 },
      demoAgeSplit: { "20s": 0.28, "30s": 0.31 },
      resolutionW: 1920,
      resolutionH: 1080,
      aspectRatio: "16:9",
      fileFormats: ["mp4", "jpg"],
      regionCode: "11",
    }),
    filled,
  );

  for (const field of [
    "sellingUnit",
    "contactRate",
    "coveragePopulation",
    "demoGenderSplit",
    "demoAgeSplit",
    "resolutionW",
    "aspectRatio",
    "fileFormats",
    "regionCode",
  ]) {
    assert.equal(
      empty.fieldGaps[field] ?? 0,
      1,
      `백필 전 결손 미카운트: ${field}`,
    );
    assert.equal(
      filled.fieldGaps[field] ?? 0,
      0,
      `백필 후 결손이 여전히 카운트됨: ${field}`,
    );
  }
});

test("PR-3: 빈 JSON 객체·빈 배열도 결손으로 센다", () => {
  const acc = createAccumulator();
  auditRow(
    row({
      demoGenderSplit: {},
      demoAgeSplit: {},
      coverageDongs: [],
      fileFormats: [],
    }),
    acc,
  );
  assert.equal(acc.fieldGaps.demoGenderSplit, 1);
  assert.equal(acc.fieldGaps.demoAgeSplit, 1);
  assert.equal(acc.fieldGaps.coverageDongs, 1);
  assert.equal(acc.fieldGaps.fileFormats, 1);
});
