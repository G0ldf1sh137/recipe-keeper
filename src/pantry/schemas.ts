import { z } from "zod";

export const pantryItemSchema = z.object({
  name: z.string().trim().min(1),
});
