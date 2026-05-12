-- Booking 상태 머신 전환.
--
-- 운영 데이터 보존 전략:
--   1) 기존 status 컬럼은 String, 디폴트 "hold". DB에 들어있을 수 있는 값:
--      "hold", "confirmed", "cancelled" (어드민 dropdown 기준).
--      그 외 값은 의도치 않은 데이터 → 보수적으로 'tentative' 로 매핑.
--   2) "hold" → 'tentative' 로 의미 변경 (UI 워딩 동시 갱신).
--   3) 새로 추가되는 컬럼은 모두 NULLABLE 또는 디폴트 보유 → NOT NULL 추가도 안전.
--
-- 이 파일은 Neon SQL Editor 에서 직접 실행하거나 `prisma migrate deploy` 로 적용 가능.

BEGIN;

-- A. 데이터 정리: 기존 status 값을 새 enum 어휘로 정규화
UPDATE "media_bookings" SET "status" = 'tentative' WHERE "status" = 'hold';
UPDATE "media_bookings" SET "status" = 'tentative'
  WHERE "status" NOT IN ('requested','tentative','confirmed','cancelled','expired');

-- B. enum 타입 생성
CREATE TYPE "MediaBookingStatus" AS ENUM (
  'requested',
  'tentative',
  'confirmed',
  'cancelled',
  'expired'
);

-- C. status 컬럼 타입 String → enum, 디폴트도 신규 enum 값으로 갱신
ALTER TABLE "media_bookings"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "MediaBookingStatus" USING "status"::"MediaBookingStatus",
  ALTER COLUMN "status" SET DEFAULT 'tentative';

-- D. 신규 컬럼 추가 (모두 NULLABLE 또는 디폴트 보유 → 기존 row 영향 X)
ALTER TABLE "media_bookings"
  ADD COLUMN "requested_by_user_id" TEXT,
  ADD COLUMN "requester_name"       TEXT,
  ADD COLUMN "requester_email"      TEXT,
  ADD COLUMN "requester_phone"      TEXT,
  ADD COLUMN "budget_won"           INTEGER,
  ADD COLUMN "decided_at"           TIMESTAMP(3),
  ADD COLUMN "decided_by_admin_id"  TEXT,
  ADD COLUMN "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- E. 외래키 (User 삭제 시 NULL 로 — 신청 이력 자체는 보존)
ALTER TABLE "media_bookings"
  ADD CONSTRAINT "media_bookings_requested_by_user_id_fkey"
  FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- F. 인덱스 (충돌 쿼리 + 사용자별 신청 이력 조회용)
CREATE INDEX "media_bookings_media_id_status_idx"
  ON "media_bookings"("media_id", "status");
CREATE INDEX "media_bookings_requested_by_user_id_idx"
  ON "media_bookings"("requested_by_user_id");

-- G. 기존 단일 mediaId 인덱스는 (media_id, status) 복합 인덱스로 대체 가능 → 제거
--    (Postgres는 복합 인덱스의 leading column 으로 단일 컬럼 쿼리도 처리)
DROP INDEX IF EXISTS "media_bookings_media_id_idx";

COMMIT;
