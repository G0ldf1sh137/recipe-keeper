import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
};

export const visibilityValues = ["private", "unlisted", "public"] as const;
export type Visibility = (typeof visibilityValues)[number];

export type Ingredient = {
  qty: string;
  unit: string;
  name: string;
};

export type Step = {
  text: string;
  imageUrls: string[];
};

export const users = sqliteTable("users", {
  id: id(),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // sha256 hash of the session token held by the client
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const recipes = sqliteTable("recipes", {
  id: id(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  ingredients: text("ingredients", { mode: "json" })
    .notNull()
    .$type<Ingredient[]>()
    .default(sql`'[]'`),
  steps: text("steps", { mode: "json" })
    .notNull()
    .$type<Step[]>()
    .default(sql`'[]'`),
  photoUrls: text("photo_urls", { mode: "json" })
    .notNull()
    .$type<string[]>()
    .default(sql`'[]'`),
  tags: text("tags", { mode: "json" })
    .notNull()
    .$type<string[]>()
    .default(sql`'[]'`),
  visibility: text("visibility", { enum: visibilityValues })
    .notNull()
    .default("private"),
  ...timestamps,
});

export const collections = sqliteTable("collections", {
  id: id(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  visibility: text("visibility", { enum: visibilityValues })
    .notNull()
    .default("private"),
  ...timestamps,
});

export const collectionRecipes = sqliteTable(
  "collection_recipes",
  {
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    addedAt: integer("added_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [primaryKey({ columns: [table.collectionId, table.recipeId] })],
);

export const shares = sqliteTable("shares", {
  id: id(),
  token: text("token")
    .notNull()
    .unique()
    .$defaultFn(() => crypto.randomUUID()),
  recipeId: text("recipe_id").references(() => recipes.id, {
    onDelete: "cascade",
  }),
  collectionId: text("collection_id").references(() => collections.id, {
    onDelete: "cascade",
  }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const savedRecipes = sqliteTable(
  "saved_recipes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    savedAt: integer("saved_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [primaryKey({ columns: [table.userId, table.recipeId] })],
);

export const comments = sqliteTable("comments", {
  id: id(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentId: text("parent_id").references((): AnySQLiteColumn => comments.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  ...timestamps,
});

export const ratings = sqliteTable(
  "ratings",
  {
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    value: integer("value").notNull(),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.recipeId, table.userId] })],
);
