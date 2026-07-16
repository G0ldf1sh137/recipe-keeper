import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { notFound } from "@tanstack/react-router";
import { getPublicProfile } from "./profile.server";

export const getProfile = createServerFn({ method: "GET" })
  .validator(z.object({ username: z.string().min(1) }))
  .handler(async ({ data }) => {
    const profile = await getPublicProfile(data.username);
    if (!profile) throw notFound();
    return profile;
  });
