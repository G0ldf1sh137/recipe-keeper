ALTER TABLE "shares" DROP CONSTRAINT "shares_exactly_one_target";--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_exactly_one_target" CHECK (
	(("recipe_id" IS NOT NULL)::int + ("collection_id" IS NOT NULL)::int + ("calendar_id" IS NOT NULL)::int) = 1
);