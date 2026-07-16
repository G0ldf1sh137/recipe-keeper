CREATE TABLE "calendar_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"calendar_id" text NOT NULL,
	"recipe_id" text NOT NULL,
	"day_of_week" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendars" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shares" ADD COLUMN "calendar_id" text;--> statement-breakpoint
ALTER TABLE "calendar_entries" ADD CONSTRAINT "calendar_entries_calendar_id_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_entries" ADD CONSTRAINT "calendar_entries_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_calendar_id_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_calendar_id_unique" UNIQUE("calendar_id");