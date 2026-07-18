import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { getSessionUser } from "#/auth/auth.functions";

const featureLabels = {
  grocery: "Grocery lists",
  pantry: "Pantry",
  calendars: "Meal Weeks",
} as const;

const subscribersOnlySearchSchema = z.object({
  feature: z.enum(["grocery", "pantry", "calendars"]).optional(),
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

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Subscribers only</h1>
      <p className="mt-4 text-ink/70">
        Access to {label} requires a subscription. Contact an admin to enable it for your account.
      </p>
      <button
        type="button"
        onClick={() => window.history.back()}
        className="mt-6 inline-block font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
      >
        ← Back
      </button>
    </div>
  );
}
