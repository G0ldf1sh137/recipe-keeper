import { createFileRoute } from "@tanstack/react-router";
import { readSessionToken } from "#/auth/cookies.server";
import { validateSessionToken } from "#/auth/session.server";
import { rotateImageUpload } from "#/uploads/uploads.server";

export const Route = createFileRoute("/api/rotate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = readSessionToken();
        const user = token ? await validateSessionToken(token) : null;
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const body: unknown = await request.json().catch(() => null);
        const url = body && typeof body === "object" && "url" in body ? body.url : undefined;
        if (typeof url !== "string") {
          return Response.json({ error: "Missing url." }, { status: 400 });
        }

        const result = await rotateImageUpload(url);
        if ("error" in result) return Response.json({ error: result.error }, { status: 400 });
        return Response.json(result);
      },
    },
  },
});
