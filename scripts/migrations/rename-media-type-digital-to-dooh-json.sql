-- PR0 companion: JSON fields that snapshot Media.type or PlannerCategory.
-- Run in the SAME transaction as media.type UPDATE (preview/prod after approval).

-- user_saved_plans.items[].mediaType
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

-- saved_planner_plans.plan_json.categories[] (PlannerCategory legacy token)
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
