-- PR0 Preview/Prod: single transaction — media.type + JSON companions
-- Run against PREVIEW first; prod only after explicit approval.
-- Rollback: scripts/migrations/rename-media-type-digital-to-dooh-rollback.sql

BEGIN;

-- ── before counts (logged to migration audit) ──
DO $$
DECLARE
  d_cnt int;
  j_cart int;
  j_plan int;
BEGIN
  SELECT COUNT(*) INTO d_cnt FROM media WHERE type = 'digital';
  SELECT COUNT(*) INTO j_cart FROM user_saved_plans WHERE items::text ~ '"mediaType"\s*:\s*"digital"';
  SELECT COUNT(*) INTO j_plan FROM saved_planner_plans WHERE plan_json::text ~ '"categories"\s*:\s*\[[^\]]*"digital"';
  RAISE NOTICE 'PR0 pre: media.digital=%, user_saved_plans.mediaType=%, saved_planner_plans.categories=%', d_cnt, j_cart, j_plan;
END $$;

UPDATE media SET type = 'dooh' WHERE type = 'digital';

UPDATE user_saved_plans u
SET items = sub.new_items
FROM (
  SELECT
    u2.id,
    jsonb_agg(
      CASE
        WHEN elem->>'mediaType' = 'digital'
          THEN jsonb_set(elem, '{mediaType}', '"dooh"'::jsonb)
        ELSE elem
      END
      ORDER BY ord
    ) AS new_items
  FROM user_saved_plans u2
  CROSS JOIN LATERAL jsonb_array_elements(u2.items::jsonb) WITH ORDINALITY AS t(elem, ord)
  WHERE u2.items::text ~ '"mediaType"\s*:\s*"digital"'
  GROUP BY u2.id
) sub
WHERE u.id = sub.id;

UPDATE saved_planner_plans
SET plan_json = jsonb_set(
  plan_json::jsonb,
  '{categories}',
  (
    SELECT jsonb_agg(
      CASE WHEN val = 'digital' THEN '"dooh"'::jsonb ELSE to_jsonb(val) END
    )
    FROM jsonb_array_elements_text(plan_json::jsonb->'categories') AS val
  )
)::json
WHERE plan_json::text ~ '"categories"\s*:\s*\[[^\]]*"digital"';

DO $$
DECLARE
  dooh_cnt int;
  digital_left int;
  j_cart int;
  j_plan int;
BEGIN
  SELECT COUNT(*) INTO dooh_cnt FROM media WHERE type = 'dooh';
  SELECT COUNT(*) INTO digital_left FROM media WHERE type = 'digital';
  SELECT COUNT(*) INTO j_cart FROM user_saved_plans WHERE items::text ~ '"mediaType"\s*:\s*"digital"';
  SELECT COUNT(*) INTO j_plan FROM saved_planner_plans WHERE plan_json::text ~ '"categories"\s*:\s*\[[^\]]*"digital"';
  IF digital_left > 0 THEN
    RAISE EXCEPTION 'PR0 post-check failed: % media rows still type=digital', digital_left;
  END IF;
  RAISE NOTICE 'PR0 post: media.dooh=%, digital_left=%, json_cart=%, json_plan=%', dooh_cnt, digital_left, j_cart, j_plan;
END $$;

COMMIT;
