ALTER TABLE "shares" ADD CONSTRAINT "shares_recipe_id_unique" UNIQUE("recipe_id");--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_collection_id_unique" UNIQUE("collection_id");