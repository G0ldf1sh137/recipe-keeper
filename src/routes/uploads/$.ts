import { createFileRoute } from "@tanstack/react-router";
import { readUpload } from "#/uploads/uploads.server";

export const Route = createFileRoute("/uploads/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const upload = await readUpload(params._splat ?? "");
        if (!upload) return new Response("Not found", { status: 404 });
        return new Response(new Uint8Array(upload.bytes), {
          headers: {
            "Content-Type": upload.mime,
            // Filenames are content-unique (random per upload), safe to cache hard.
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
