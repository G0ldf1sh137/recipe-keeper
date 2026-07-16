import { createFileRoute } from "@tanstack/react-router";
import { getGoogleClient, fetchGoogleUserInfo } from "#/auth/google.server";
import { readOAuthCookie, buildClearedOAuthCookie, buildSessionCookie } from "#/auth/cookies.server";
import { upsertGoogleUser } from "#/auth/users.server";
import { createSession, invalidateAllSessionsForUser } from "#/auth/session.server";

const FAILED_LOGIN_REDIRECT = new Headers({ Location: "/login?error=oauth" });

export const Route = createFileRoute("/auth/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const attempt = readOAuthCookie();

        if (!code || !state || !attempt || attempt.state !== state) {
          console.error("Google OAuth callback: missing or mismatched state/verifier cookie", {
            hasCode: !!code,
            hasState: !!state,
            hasAttempt: !!attempt,
            stateMatches: attempt ? attempt.state === state : null,
          });
          const headers = new Headers(FAILED_LOGIN_REDIRECT);
          headers.append("Set-Cookie", buildClearedOAuthCookie());
          return new Response(null, { status: 302, headers });
        }

        try {
          const google = getGoogleClient();
          const tokens = await google.validateAuthorizationCode(code, attempt.verifier);
          const profile = await fetchGoogleUserInfo(tokens.accessToken());
          const user = await upsertGoogleUser(profile);

          // Rotate: destroy any pre-existing sessions for this user, then issue a fresh one.
          await invalidateAllSessionsForUser(user.id);
          const { token, expiresAt } = await createSession(user.id);

          const headers = new Headers({ Location: "/" });
          headers.append("Set-Cookie", buildSessionCookie(token, expiresAt));
          headers.append("Set-Cookie", buildClearedOAuthCookie());
          return new Response(null, { status: 302, headers });
        } catch (error) {
          console.error("Google OAuth callback failed:", error);
          const headers = new Headers(FAILED_LOGIN_REDIRECT);
          headers.append("Set-Cookie", buildClearedOAuthCookie());
          return new Response(null, { status: 302, headers });
        }
      },
    },
  },
});
