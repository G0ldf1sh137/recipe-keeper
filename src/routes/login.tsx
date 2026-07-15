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
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p className="mt-2 text-gray-600">Sign in with your Google account to create and manage recipes.</p>
      {error && (
        <p className="mt-4 rounded bg-red-50 px-4 py-2 text-red-700">
          Something went wrong signing you in. Please try again.
        </p>
      )}
      <a
        href="/auth/google"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded border px-4 py-2 font-medium hover:bg-gray-50"
      >
        Sign in with Google
      </a>
    </div>
  );
}
