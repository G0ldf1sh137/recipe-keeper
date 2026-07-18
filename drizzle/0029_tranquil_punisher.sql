ALTER TABLE "collection_recipes" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "collection_recipes" cr
SET "position" = sub.rn
FROM (
  SELECT collection_id, recipe_id,
         row_number() OVER (PARTITION BY collection_id ORDER BY added_at) - 1 AS rn
  FROM "collection_recipes"
) sub
WHERE cr.collection_id = sub.collection_id AND cr.recipe_id = sub.recipe_id;