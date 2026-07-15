import { createServerFn } from "@tanstack/react-start";
import { getOrCreateDemoUser } from "./users.server";

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => getOrCreateDemoUser());
