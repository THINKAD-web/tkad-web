-- ─────────────────────────────────────────────────────────────────────────────
-- 견적 마법사 PR-9 — OoHQuote 확장 (PR-3~6 클라이언트가 수집하던 추가 필드 영속화).
--
-- 🚨 NEON SQL EXECUTION REQUIRED
--    이 파일은 사용자가 직접 Neon SQL editor 에서 실행해야 한다(핸드오프 §4-1).
--    DO $$ BEGIN ... END $$ 로 감싸 idempotent 하므로 여러 번 실행해도 안전.
--
-- 추가 필드:
--   1. quote_number TEXT UNIQUE — 사람이 읽기 좋은 견적 번호 (예: Q-20260425-0001)
--   2. customer_business_number — 사업자등록번호 (선택, 체크섬은 클라이언트에서 검증)
--   3. customer_address          — 주소 (선택)
--   4. customer_position         — 부서/직책 (선택)
--   5. customer_message          — 추가 요청사항 (기존 quote_request 의 message 와 별도)
--   6. creative_mode             — 'upload'/'composite'/'design_request'/'later'
--   7. creative_assets           — Cloudinary 업로드 자료 메타 [{id,url,filename,size,mimeType}]
--   8. composite_logo_url        — Planner 합성 모드 시 사용된 로고 URL
--   9. design_brief              — 디자인 의뢰 모드 브리프 JSONB
--   10. needs_design_service     — 디자인 의뢰 여부 (운영팀 비용 산정 트리거)
--   11. time_slot                — 디지털 사이니지 송출 시간대 ('all_day' 등)
--   12. expires_at               — 견적 유효 기한 (Q7 결정: 14일 TTL)
--   13. quote_source             — 'planner'/'media'/'compare'/'direct' (분석용)
--   14. quote_source_id          — 진입 경로별 식별자 (Planner planId 등)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  -- 1. quote_number (UNIQUE — 동시 발급은 advisory lock + transaction 으로 처리)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ooh_quotes' AND column_name = 'quote_number'
  ) THEN
    ALTER TABLE ooh_quotes ADD COLUMN quote_number TEXT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ooh_quotes_quote_number_unique
  ON ooh_quotes(quote_number)
  WHERE quote_number IS NOT NULL;

DO $$ BEGIN
  -- 2~5. 고객 확장 필드
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ooh_quotes' AND column_name = 'customer_business_number')
  THEN ALTER TABLE ooh_quotes ADD COLUMN customer_business_number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ooh_quotes' AND column_name = 'customer_address')
  THEN ALTER TABLE ooh_quotes ADD COLUMN customer_address TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ooh_quotes' AND column_name = 'customer_position')
  THEN ALTER TABLE ooh_quotes ADD COLUMN customer_position TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ooh_quotes' AND column_name = 'customer_message')
  THEN ALTER TABLE ooh_quotes ADD COLUMN customer_message TEXT;
  END IF;

  -- 6~10. 광고 소재 관련
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ooh_quotes' AND column_name = 'creative_mode')
  THEN ALTER TABLE ooh_quotes ADD COLUMN creative_mode TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ooh_quotes' AND column_name = 'creative_assets')
  THEN ALTER TABLE ooh_quotes ADD COLUMN creative_assets JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ooh_quotes' AND column_name = 'composite_logo_url')
  THEN ALTER TABLE ooh_quotes ADD COLUMN composite_logo_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ooh_quotes' AND column_name = 'design_brief')
  THEN ALTER TABLE ooh_quotes ADD COLUMN design_brief JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ooh_quotes' AND column_name = 'needs_design_service')
  THEN ALTER TABLE ooh_quotes ADD COLUMN needs_design_service BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  -- 11. 시간대
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ooh_quotes' AND column_name = 'time_slot')
  THEN ALTER TABLE ooh_quotes ADD COLUMN time_slot TEXT;
  END IF;

  -- 12. 만료 (14일 TTL — Q7 결정)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ooh_quotes' AND column_name = 'expires_at')
  THEN ALTER TABLE ooh_quotes ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;

  -- 13~14. 진입 경로 추적 (분석용)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ooh_quotes' AND column_name = 'quote_source')
  THEN ALTER TABLE ooh_quotes ADD COLUMN quote_source TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ooh_quotes' AND column_name = 'quote_source_id')
  THEN ALTER TABLE ooh_quotes ADD COLUMN quote_source_id TEXT;
  END IF;
END $$;

-- 만료 견적 빠른 조회용 — D-3 리마인더 cron 등에서 사용 예정.
CREATE INDEX IF NOT EXISTS ooh_quotes_expires_at_idx
  ON ooh_quotes(expires_at)
  WHERE expires_at IS NOT NULL;

-- 분석/필터: 진입 경로별 분포.
CREATE INDEX IF NOT EXISTS ooh_quotes_quote_source_idx
  ON ooh_quotes(quote_source)
  WHERE quote_source IS NOT NULL;
