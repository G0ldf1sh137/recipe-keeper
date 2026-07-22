import { pgTable, text, integer, boolean, timestamp, jsonb, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";
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

export const weekStartDayValues = ["sun", "mon"] as const;
export type WeekStartDay = (typeof weekStartDayValues)[number];

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
  avatarOverrideUrl: text("avatar_override_url"),
  username: text("username").unique(),
  isAdmin: boolean("is_admin").notNull().default(false),
  isModerator: boolean("is_moderator").notNull().default(false),
  bannedUntil: timestamp("banned_until", { mode: "date" }),
  isSubscriber: boolean("is_subscriber").notNull().default(false),
  notifyOnComment: boolean("notify_on_comment").notNull().default(true),
  notifyOnRating: boolean("notify_on_rating").notNull().default(true),
  notifyOnFork: boolean("notify_on_fork").notNull().default(true),
  notifyOnFollow: boolean("notify_on_follow").notNull().default(true),
  restrictMessagesToFollowing: boolean("restrict_messages_to_following").notNull().default(false),
  defaultRecipeVisibility: text("default_recipe_visibility", { enum: visibilityValues })
    .notNull()
    .default("public"),
  defaultCollectionVisibility: text("default_collection_visibility", { enum: visibilityValues })
    .notNull()
    .default("private"),
  weekStartDay: text("week_start_day", { enum: weekStartDayValues }).notNull().default("sun"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeSubscriptionStatus: text("stripe_subscription_status"),
  stripeCurrentPeriodEnd: timestamp("stripe_current_period_end", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256 hash of the session token held by the client
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  impersonatingUserId: text("impersonating_user_id").references(() => users.id, { onDelete: "set null" }),
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
    position: integer("position").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.collectionId, table.recipeId] })],
);

export const collectionBookmarks = pgTable(
  "collection_bookmarks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.collectionId] })],
);

export const follows = pgTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.followerId, table.followingId] })],
);

// A mutual wall between two users — only the blocker can remove their own
// row, but enforcement checks both directions (see hasWallBetween).
export const blocks = pgTable(
  "blocks",
  {
    blockerId: text("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.blockerId, table.blockedId] })],
);

// A silent, one-directional filter — only affects the muter's own view.
export const mutes = pgTable(
  "mutes",
  {
    muterId: text("muter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mutedId: text("muted_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.muterId, table.mutedId] })],
);

export const conversations = pgTable(
  "conversations",
  {
    id: id(),
    user1Id: text("user1_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    user2Id: text("user2_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("conversations_pair_idx").on(table.user1Id, table.user2Id)],
);

export const messages = pgTable("messages", {
  id: id(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  senderId: text("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

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

export const recipeMakes = pgTable("recipe_makes", {
  id: id(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

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

export const hiddenRecipes = pgTable(
  "hidden_recipes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.recipeId] })],
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

export const notificationTypeValues = [
  "comment",
  "fork",
  "rating",
  "householdInvite",
  "follow",
  "pollCreated",
  "pollClosed",
] as const;
export type NotificationType = (typeof notificationTypeValues)[number];

export const notifications = pgTable("notifications", {
  id: id(),
  recipientId: text("recipient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  actorId: text("actor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Nullable — recipe-based notifications (comment/fork/rating) always set
  // this, but household invites aren't about a recipe at all.
  recipeId: text("recipe_id").references(() => recipes.id, { onDelete: "cascade" }),
  // Nullable — only pollCreated/pollClosed set this; forward ref to `polls`,
  // declared further down in this file, same AnyPgColumn pattern used elsewhere.
  pollId: text("poll_id").references((): AnyPgColumn => polls.id, { onDelete: "cascade" }),
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
  messageId: text("message_id").references(() => messages.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: text("status", { enum: reportStatusValues }).notNull().default("open"),
  resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const pantryItems = pgTable(
  "pantry_items",
  {
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.ownerId, table.name] })],
);

export const households = pgTable("households", {
  id: id(),
  name: text("name").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const householdMembers = pgTable(
  "household_members",
  {
    householdId: text("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.householdId, table.userId] })],
);

export const householdInvites = pgTable(
  "household_invites",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    invitedUserId: text("invited_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("household_invites_household_invited_idx").on(table.householdId, table.invitedUserId)],
);

export const pollStatusValues = ["open", "closed"] as const;
export type PollStatus = (typeof pollStatusValues)[number];

export const polls = pgTable("polls", {
  id: id(),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  targetDate: timestamp("target_date", { mode: "date" }).notNull(),
  // Nullable — creator can skip linking a Meal Week; closing then never auto-schedules anything.
  targetCalendarId: text("target_calendar_id").references(() => calendars.id, { onDelete: "set null" }),
  status: text("status", { enum: pollStatusValues }).notNull().default("open"),
  // References poll_options, declared below — forward ref via AnyPgColumn, same pattern as
  // recipes.parentRecipeId/comments.parentId's self-references elsewhere in this file.
  winningOptionId: text("winning_option_id").references((): AnyPgColumn => pollOptions.id, { onDelete: "set null" }),
  closedAt: timestamp("closed_at", { mode: "date" }),
  ...timestamps,
});

export const pollOptions = pgTable(
  "poll_options",
  {
    id: id(),
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    addedBy: text("added_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("poll_options_poll_recipe_idx").on(table.pollId, table.recipeId)],
);

export const pollVotes = pgTable(
  "poll_votes",
  {
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    optionId: text("option_id")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.pollId, table.userId] })],
);

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
