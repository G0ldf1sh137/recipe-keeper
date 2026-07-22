import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSessionUser } from "#/auth/auth.functions";
import { startCheckout } from "#/billing/billing.functions";

const featureLabels = {
  grocery: "Grocery lists",
  pantry: "Pantry",
  calendars: "Meal Weeks",
  polls: "Dinner Polls",
} as const;

const subscribersOnlySearchSchema = z.object({
  feature: z.enum(["grocery", "pantry", "calendars", "polls"]).optional(),
});

export const Route = createFileRoute("/subscribers-only")({
  validateSearch: subscribersOnlySearchSchema,
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
  },
  component: SubscribersOnlyPage,
});

function SubscribersOnlyPage() {
  const { feature } = Route.useSearch();
  const label = feature ? featureLabels[feature] : "this feature";
  const startCheckoutFn = useServerFn(startCheckout);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    setPending(true);
    setError(null);
    try {
      const result = await startCheckoutFn();
      if (result.error) {
        setError(result.error);
        setPending(false);
        return;
      }
      window.location.href = result.url;
    } catch {
      setError("Could not start checkout. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Subscribers only</h1>
      <p className="mt-4 text-ink/70">Access to {label} requires a subscription, just $5/month.</p>
      {error && <p className="mt-3 text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => void handleSubscribe()}
          disabled={pending}
          className="rounded-lg bg-accent-600 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
        >
          {pending ? "Redirecting..." : "Subscribe for $5/month"}
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
