-- Convert steps from ["text", ...] to [{"text": "..."}, ...] so steps can carry images.
-- Guarded by json_type so it only rewrites rows still in the old string format.
UPDATE `recipes`
SET `steps` = COALESCE(
  (SELECT json_group_array(json_object('text', je.value)) FROM json_each(`recipes`.`steps`) AS je),
  '[]'
)
WHERE json_array_length(`steps`) > 0
  AND json_type(`steps`, '$[0]') = 'text';
