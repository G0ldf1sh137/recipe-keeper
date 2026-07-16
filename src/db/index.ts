import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const queryClient = postgres(
  process.env.DATABASE_URL ?? "postgres://recipe_keeper:recipe_keeper@localhost:5432/recipe_keeper",
);

export const db = drizzle(queryClient, { schema });
