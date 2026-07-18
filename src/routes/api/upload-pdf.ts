import { createFileRoute } from "@tanstack/react-router";
import { readSessionToken } from "#/auth/cookies.server";
import { validateSessionToken } from "#/auth/session.server";
import { savePdfUpload } from "#/uploads/uploads.server";

export const Route = createFileRoute("/api/upload-pdf")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = readSessionToken();
        const resolved = token ? await validateSessionToken(token) : null;
        const user = resolved?.user ?? null;
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        let formData: FormData;
        try {
          formData = await request.formData();
        } catch {
          return Response.json({ error: "Expected multipart form data." }, { status: 400 });
        }

        const file = formData.get("file");
        if (!(file instanceof File)) {
          return Response.json({ error: "Missing file field." }, { status: 400 });
        }

        const result = await savePdfUpload(file);
        if ("error" in result) return Response.json({ error: result.error }, { status: 400 });
        return Response.json(result);
      },
    },
  },
});
