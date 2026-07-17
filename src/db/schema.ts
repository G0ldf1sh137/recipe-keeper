import { pgTable, text, integer, boolean, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamps = {
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const visibilityValues = ["private", "public"] as const;
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

export const users = pgTable("users", {
  id: id(),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  username: text("username").unique(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256 hash of the session token held by the client
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const recipes = pgTable("recipes", {
  id: id(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentRecipeId: text("parent_recipe_id").references((): AnyPgColumn => recipes.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  description: text("description"),
  ingredients: jsonb("ingredients").notNull().$type<Ingredient[]>().default([]),
  steps: jsonb("steps").notNull().$type<Step[]>().default([]),
  photoUrls: text("photo_urls").array().notNull().default([]),
  coverPhotoUrl: text("cover_photo_url"),
  sourceUrl: text("source_url"),
  sourcePdfUrl: text("source_pdf_url"),
  tags: text("tags").array().notNull().default([]),
  yield: text("yield"),
  calories: integer("calories"),
  protein: integer("protein"),
  carbs: integer("carbs"),
  fat: integer("fat"),
  visibility: text("visibility", { enum: visibilityValues }).notNull().default("public"),
  ...timestamps,
});

export const collections = pgTable("collections", {
  id: id(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  visibility: text("visibility", { enum: visibilityValues }).notNull().default("private"),
  ...timestamps,
});

export const collectionRecipes = pgTable(
  "collection_recipes",
  {
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.collectionId, table.recipeId] })],
);

export const dayOfWeekValues = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayOfWeek = (typeof dayOfWeekValues)[number];

export const calendars = pgTable("calendars", {
  id: id(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  visibility: text("visibility", { enum: visibilityValues }).notNull().default("private"),
  ...timestamps,
});

export const calendarEntries = pgTable("calendar_entries", {
  id: id(),
  calendarId: text("calendar_id")
    .notNull()
    .references(() => calendars.id, { onDelete: "cascade" }),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  dayOfWeek: text("day_of_week", { enum: dayOfWeekValues }).notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const shares = pgTable("shares", {
  id: id(),
  token: text("token")
    .notNull()
    .unique()
    .$defaultFn(() => crypto.randomUUID()),
  recipeId: text("recipe_id")
    .unique()
    .references(() => recipes.id, {
      onDelete: "cascade",
    }),
  collectionId: text("collection_id")
    .unique()
    .references(() => collections.id, {
      onDelete: "cascade",
    }),
  calendarId: text("calendar_id")
    .unique()
    .references(() => calendars.id, {
      onDelete: "cascade",
    }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: id(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentId: text("parent_id").references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  ...timestamps,
});

export const ratings = pgTable(
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

export const recipeNotes = pgTable(
  "recipe_notes",
  {
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.recipeId, table.userId] })],
);

export const groceryLists = pgTable("grocery_lists", {
  id: id(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ...timestamps,
});

export const groceryListItems = pgTable("grocery_list_items", {
  id: id(),
  listId: text("list_id")
    .notNull()
    .references(() => groceryLists.id, { onDelete: "cascade" }),
  recipeId: text("recipe_id").references(() => recipes.id, { onDelete: "cascade" }),
  qty: text("qty").notNull(),
  unit: text("unit").notNull(),
  name: text("name").notNull(),
  checked: boolean("checked").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const notificationTypeValues = ["comment", "fork", "rating"] as const;
export type NotificationType = (typeof notificationTypeValues)[number];

export const notifications = pgTable("notifications", {
  id: id(),
  recipientId: text("recipient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  actorId: text("actor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  type: text("type", { enum: notificationTypeValues }).notNull(),
  readAt: timestamp("read_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const reportStatusValues = ["open", "resolved"] as const;
export type ReportStatus = (typeof reportStatusValues)[number];

export const reports = pgTable("reports", {
  id: id(),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  recipeId: text("recipe_id").references(() => recipes.id, { onDelete: "cascade" }),
  commentId: text("comment_id").references(() => comments.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: text("status", { enum: reportStatusValues }).notNull().default("open"),
  resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const ingredientNames = pgTable("ingredients", {
  id: id(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const unitNames = pgTable("units", {
  id: id(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const tagNames = pgTable("tags", {
  id: id(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});
