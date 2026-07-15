import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const loginSearchSchema = z.object({ error: z.string().optional() });

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  component: LoginPage,
});

function LoginPage() {
  const { error } = Route.useSearch();

  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Sign in</h1>
      <p className="mt-2 text-ink/60">Sign in with your Google account to create and manage recipes.</p>
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-red-700 dark:bg-red-950 dark:text-red-300">
          Something went wrong signing you in. Please try again.
        </p>
      )}
      <a
        href="/auth/google"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg border border-accent-200 px-4 py-2 font-medium text-ink transition-colors hover:bg-accent-50"
      >
        Sign in with Google
      </a>
    </div>
  );
}
