-- Normalize Media.type to digital | static | mobile (English codes).
-- Legacy codes + free-text (e.g. Korean labels from older seeds) are mapped.

UPDATE "Media" SET type = 'digital'
WHERE type IN ('digital', 'premium', 'indoor', 'apartment', 'network');

UPDATE "Media" SET type = 'static'
WHERE type IN ('billboard', 'highway', 'static');

UPDATE "Media" SET type = 'mobile'
WHERE type IN ('bus', 'subway', 'mobile');

-- Korean / descriptive labels not matching above
UPDATE "Media" SET type = 'static'
WHERE type NOT IN ('digital', 'static', 'mobile')
  AND (
    type ILIKE '%빌보드%'
    OR type ILIKE '%외벽%'
    OR type ILIKE '%현수막%'
    OR type ILIKE '%고속%'
    OR type ILIKE '%휴게%'
  );

UPDATE "Media" SET type = 'mobile'
WHERE type NOT IN ('digital', 'static', 'mobile')
  AND (
    type ILIKE '%지하철%'
    OR type ILIKE '%버스%'
    OR type ILIKE '%택시%'
    OR type ILIKE '%스크린도어%'
  );

UPDATE "Media" SET type = 'digital'
WHERE type NOT IN ('digital', 'static', 'mobile');
