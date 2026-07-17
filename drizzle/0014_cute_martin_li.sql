ALTER TABLE "recipes" ALTER COLUMN "visibility" SET DEFAULT 'public';--> statement-breakpoint
ALTER TABLE "calendar_entries" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;