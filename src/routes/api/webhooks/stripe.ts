import { createFileRoute } from "@tanstack/react-router";
import { applySubscriptionEvent, constructWebhookEvent } from "#/billing/stripe.server";

export const Route = createFileRoute("/api/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("stripe-signature");
        if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });

        let event;
        try {
          event = constructWebhookEvent(rawBody, signature);
        } catch {
          return Response.json({ error: "Invalid signature" }, { status: 400 });
        }

        switch (event.type) {
          case "customer.subscription.created":
          case "customer.subscription.updated":
          case "customer.subscription.deleted":
          case "customer.subscription.paused":
          case "customer.subscription.resumed":
            await applySubscriptionEvent(event.data.object);
            break;
        }

        return Response.json({ received: true });
      },
    },
  },
});
