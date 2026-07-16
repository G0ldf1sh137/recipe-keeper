-- Copy the single photo_url into the new photo_urls array.
UPDATE `recipes`
SET `photo_urls` = json_array(`photo_url`)
WHERE `photo_url` IS NOT NULL AND `photo_url` != '';
--> statement-breakpoint
-- Convert step objects from {text, imageUrl?} to {text, imageUrls: [...]}.
-- Guarded so it only rewrites steps that don't have imageUrls yet (idempotent).
UPDATE `recipes`
SET `steps` = COALESCE(
  (SELECT json_group_array(
    json(CASE
      WHEN json_extract(je.value, '$.imageUrl') IS NOT NULL THEN
        json_object('text', json_extract(je.value, '$.text'),
                    'imageUrls', json_array(json_extract(je.value, '$.imageUrl')))
      ELSE
        json_object('text', json_extract(je.value, '$.text'), 'imageUrls', json_array())
    END)
  ) FROM json_each(`recipes`.`steps`) AS je),
  '[]'
)
WHERE json_array_length(`steps`) > 0
  AND json_extract(`steps`, '$[0].imageUrls') IS NULL;
