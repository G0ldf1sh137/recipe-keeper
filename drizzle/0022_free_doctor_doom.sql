ALTER TABLE "users" ADD COLUMN "notify_on_comment" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notify_on_rating" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notify_on_fork" boolean DEFAULT true NOT NULL;