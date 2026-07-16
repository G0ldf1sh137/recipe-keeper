import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resolveShareToken } from "./sharing.server";

export const resolveSharedToken = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }) => resolveShareToken(data.token));
