ALTER TABLE "shares" ADD CONSTRAINT "shares_exactly_one_target" CHECK (
	(("recipe_id" IS NOT NULL)::int + ("collection_id" IS NOT NULL)::int) = 1
);
