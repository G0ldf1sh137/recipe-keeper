import { createFileRoute } from "@tanstack/react-router";
import { generateCodeVerifier, generateState } from "arctic";
import { getGoogleClient } from "#/auth/google.server";
import { buildOAuthCookie } from "#/auth/cookies.server";

export const Route = createFileRoute("/auth/google/")({
  server: {
    handlers: {
      GET: async () => {
        const google = getGoogleClient();
        const state = generateState();
        const verifier = generateCodeVerifier();
        const url = google.createAuthorizationURL(state, verifier, ["openid", "email", "profile"]);

        return new Response(null, {
          status: 302,
          headers: {
            Location: url.toString(),
            "Set-Cookie": buildOAuthCookie({ state, verifier }),
          },
        });
      },
    },
  },
});
