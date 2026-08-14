-- R-9 즉시예약 amount 이상치 조사 (읽기 전용, 실행은 오퍼레이터가 수동).
--
-- 배경: PR-5a 이전 `calculateInstantBookingAmount` 는 pricePeriod 를 그대로
-- 월 환산에 사용해 M-CITY 같은 "day" 오라벨 매체를 30배 과청구했다.
-- 아래 쿼리는 이미 생성된 booking 레코드에서 그 흔적을 찾는다.
--
-- ⚠️ 스크립트는 SELECT 만 수행한다. INSERT/UPDATE/DELETE 문 없음.
--    psql 로 그대로 붙여 넣거나, `\i` 로 실행한다.
-- ⚠️ 결과 판단에는 매체별 실제 등록 상품가 확인이 필요하다 —
--    아래 쿼리는 "매체 최장 상품가" 를 priceOptions JSON 에서 뽑아
--    비교하지만, priceOptions 자체가 비어 있으면 base row 를 fallback 한다.

BEGIN;
SET LOCAL statement_timeout = '30s';
SET LOCAL default_transaction_read_only = true;

-- ─────────────────────────────────────────────────────────────
-- Q1 — 최장 상품가의 5배 초과 booking (30× 버그 유력 후보)
-- ─────────────────────────────────────────────────────────────

WITH product_max AS (
  SELECT
    m.id                                            AS media_id,
    m.name                                          AS media_name,
    m.price                                         AS base_price,
    m.price_period                                  AS base_period,
    m.price_options                                 AS price_options,
    -- priceOptions 중 최대 price. 없으면 base 로 대체.
    COALESCE(
      (SELECT MAX((elem->>'price')::bigint)
       FROM jsonb_array_elements(m.price_options) AS elem
       WHERE (elem->>'price') ~ '^[0-9]+$'),
      m.price
    )                                               AS product_max_won
  FROM media m
)
SELECT
  b.id                                              AS booking_id,
  b.status,
  b.paid_at,
  b.created_at,
  b.start_date,
  b.end_date,
  (b.end_date - b.start_date + 1)                   AS booking_days,
  b.amount                                          AS charged_won,
  p.product_max_won,
  ROUND(b.amount::numeric / NULLIF(p.product_max_won, 0), 1) AS overcharge_multiple,
  p.media_id,
  p.media_name,
  p.base_price,
  p.base_period
FROM bookings b
JOIN product_max p ON p.media_id = b.media_id
WHERE p.product_max_won > 0
  AND b.amount > p.product_max_won * 5
ORDER BY overcharge_multiple DESC NULLS LAST, b.created_at DESC
LIMIT 500;

-- ─────────────────────────────────────────────────────────────
-- Q2 — 위 이상치 booking 의 status 분포 (결제 도달 여부)
-- ─────────────────────────────────────────────────────────────

WITH product_max AS (
  SELECT
    m.id AS media_id,
    COALESCE(
      (SELECT MAX((elem->>'price')::bigint)
       FROM jsonb_array_elements(m.price_options) AS elem
       WHERE (elem->>'price') ~ '^[0-9]+$'),
      m.price
    ) AS product_max_won
  FROM media m
),
overcharged AS (
  SELECT b.*
  FROM bookings b
  JOIN product_max p ON p.media_id = b.media_id
  WHERE p.product_max_won > 0
    AND b.amount > p.product_max_won * 5
)
SELECT
  status,
  COUNT(*)                                          AS booking_count,
  SUM(amount)                                       AS charged_total_won,
  MIN(created_at)                                   AS earliest,
  MAX(created_at)                                   AS latest
FROM overcharged
GROUP BY status
ORDER BY booking_count DESC;

-- ─────────────────────────────────────────────────────────────
-- Q3 — 영향 매체 vs 비영향 매체의 즉시예약 완료율
--       완료 = status IN ('paid','confirmed')
-- ─────────────────────────────────────────────────────────────

WITH product_max AS (
  SELECT
    m.id AS media_id,
    COALESCE(
      (SELECT MAX((elem->>'price')::bigint)
       FROM jsonb_array_elements(m.price_options) AS elem
       WHERE (elem->>'price') ~ '^[0-9]+$'),
      m.price
    ) AS product_max_won
  FROM media m
),
media_flag AS (
  SELECT
    b.media_id,
    -- 이 매체가 과청구를 낸 적이 한 번이라도 있으면 영향 매체
    BOOL_OR(b.amount > p.product_max_won * 5 AND p.product_max_won > 0) AS affected
  FROM bookings b
  JOIN product_max p ON p.media_id = b.media_id
  GROUP BY b.media_id
)
SELECT
  mf.affected                                       AS is_overcharged_media,
  COUNT(*)                                          AS booking_count,
  COUNT(*) FILTER (WHERE b.status IN ('paid', 'confirmed')) AS completed_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE b.status IN ('paid', 'confirmed'))
    / NULLIF(COUNT(*), 0),
    1
  )                                                 AS completion_rate_pct,
  COUNT(DISTINCT b.media_id)                        AS distinct_media
FROM bookings b
JOIN media_flag mf ON mf.media_id = b.media_id
GROUP BY mf.affected
ORDER BY mf.affected DESC;

-- ─────────────────────────────────────────────────────────────
-- Q4 — 특히 위험한 조합: pricePeriod="day" 이면서 priceOptions 비어 있는 매체의 booking
--       (R-7 base-only + day 라벨 = 30× 위험 커널)
-- ─────────────────────────────────────────────────────────────

SELECT
  b.id                                              AS booking_id,
  b.status,
  b.paid_at,
  b.amount,
  (b.end_date - b.start_date + 1)                   AS booking_days,
  m.name                                            AS media_name,
  m.price                                           AS base_price_won,
  m.price_period                                    AS base_period
FROM bookings b
JOIN media m ON m.id = b.media_id
WHERE m.price_period = 'day'
  AND (
    m.price_options IS NULL
    OR jsonb_array_length(m.price_options) = 0
  )
  AND m.price > 0
ORDER BY b.created_at DESC
LIMIT 200;

ROLLBACK;
