import { createFileRoute } from "@tanstack/react-router";
import { deleteExpiredPolls } from "#/polls/polls.server";

// Vercel Cron target (see vercel.json) — Vercel automatically attaches
// `Authorization: Bearer $CRON_SECRET` to requests it triggers when that env
// var is set, so this doubles as both the schedule trigger and the auth check.
export const Route = createFileRoute("/api/cron/delete-expired-polls")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const deletedCount = await deleteExpiredPolls();
        return Response.json({ deletedCount });
      },
    },
  },
});
