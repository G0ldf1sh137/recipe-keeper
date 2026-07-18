import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { notFound } from "@tanstack/react-router";
import { getPublicProfile } from "./profile.server";
import { sessionMiddleware } from "#/auth/auth-middleware";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .validator(z.object({ username: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const profile = await getPublicProfile(data.username, context.user?.id);
    if (!profile) throw notFound();
    return profile;
  });
