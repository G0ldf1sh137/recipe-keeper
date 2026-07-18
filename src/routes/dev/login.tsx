import { useState } from "react";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { devLogin } from "#/auth/auth.functions";

const QUICK_LOGIN_USERNAMES = ["test-free", "test-sub", "test-admin"];

export const Route = createFileRoute("/dev/login")({
  beforeLoad: () => {
    if (process.env.NODE_ENV !== "development") throw notFound();
  },
  component: DevLoginPage,
});

function DevLoginPage() {
  const navigate = useNavigate();
  const devLoginFn = useServerFn(devLogin);
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loginAs(name: string) {
    setSubmitting(true);
    setError(null);
    try {
      await devLoginFn({ data: { username: name } });
      await navigate({ to: "/" });
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in as that user.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-4 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Dev login</h1>
      <p className="mt-2 text-ink/60">
        Local-only shortcut to sign in as any user without Google OAuth. Never available outside{" "}
        <code>NODE_ENV=development</code>.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        {QUICK_LOGIN_USERNAMES.map((name) => (
          <button
            key={name}
            type="button"
            disabled={submitting}
            onClick={() => loginAs(name)}
            className="rounded-lg border-2 border-accent-300 px-4 py-2 text-left font-medium text-ink transition-colors hover:bg-accent-50 disabled:opacity-50"
          >
            Sign in as {name}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (username.trim()) loginAs(username.trim());
        }}
        className="mt-6 flex gap-2"
      >
        <input
          className="flex-1 rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="any username"
        />
        <button
          type="submit"
          disabled={submitting || !username.trim()}
          className="rounded-lg bg-accent-600 px-4 py-2 font-medium text-white hover:bg-accent-700 disabled:opacity-50"
        >
          Sign in
        </button>
      </form>

      {error && <p className="mt-4 text-red-600">{error}</p>}
    </div>
  );
}
