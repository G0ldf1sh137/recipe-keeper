CREATE TABLE "pantry_items" (
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pantry_items_owner_id_name_pk" PRIMARY KEY("owner_id","name")
);
--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;