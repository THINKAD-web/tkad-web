-- PR0 rollback: dooh → digital (run only if PR0 must be reverted)
-- Scope: 641 prod rows (2026-09-01 dry-run) + JSON companions — see rename-media-type-digital-to-dooh-json.sql

BEGIN;

UPDATE media SET type = 'digital' WHERE type = 'dooh';

-- user_saved_plans.items[].mediaType
UPDATE user_saved_plans u
SET items = sub.new_items
FROM (
  SELECT
    u2.id,
    jsonb_agg(
      CASE
        WHEN elem->>'mediaType' = 'dooh'
          THEN jsonb_set(elem, '{mediaType}', '"digital"'::jsonb)
        ELSE elem
      END
      ORDER BY ord
    ) AS new_items
  FROM user_saved_plans u2
  CROSS JOIN LATERAL jsonb_array_elements(u2.items::jsonb) WITH ORDINALITY AS t(elem, ord)
  WHERE u2.items::text ~ '"mediaType"\s*:\s*"dooh"'
  GROUP BY u2.id
) sub
WHERE u.id = sub.id;

-- saved_planner_plans.plan_json.categories[]
UPDATE saved_planner_plans
SET plan_json = jsonb_set(
  plan_json::jsonb,
  '{categories}',
  (
    SELECT jsonb_agg(
      CASE WHEN val = 'dooh' THEN '"digital"'::jsonb ELSE to_jsonb(val) END
    )
    FROM jsonb_array_elements_text(plan_json::jsonb->'categories') AS val
  )
)::json
WHERE plan_json::text ~ '"categories"\s*:\s*\[[^\]]*"dooh"';

COMMIT;
