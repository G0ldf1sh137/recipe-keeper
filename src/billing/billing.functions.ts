import { createServerFn } from "@tanstack/react-start";
import { requireAuthMiddleware } from "#/auth/auth-middleware";
import { createBillingPortalSession, createCheckoutSession } from "./stripe.server";

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    const url = await createCheckoutSession(context.user);
    if (!url) return { error: "Could not start checkout. Please try again." } as const;
    return { url } as const;
  });

export const startBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    const url = await createBillingPortalSession(context.user);
    return { url } as const;
  });
