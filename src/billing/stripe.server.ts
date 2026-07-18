import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "#/db/index";
import { users } from "#/db/schema";
import { setUserIsSubscriberStatus } from "#/auth/users.server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export async function getOrCreateStripeCustomer(user: typeof users.$inferSelect) {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user.id },
  });
  await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, user.id));
  return customer.id;
}

export async function createCheckoutSession(user: typeof users.$inferSelect) {
  const customerId = await getOrCreateStripeCustomer(user);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID ?? "", quantity: 1 }],
    success_url: `${process.env.APP_URL ?? "http://localhost:3000"}/settings?checkout=success`,
    cancel_url: `${process.env.APP_URL ?? "http://localhost:3000"}/settings`,
  });
  return session.url;
}

export async function createBillingPortalSession(user: typeof users.$inferSelect) {
  const customerId = await getOrCreateStripeCustomer(user);
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.APP_URL ?? "http://localhost:3000"}/settings`,
  });
  return session.url;
}

export async function applySubscriptionEvent(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const user = await db.query.users.findFirst({ where: eq(users.stripeCustomerId, customerId) });
  if (!user) return;

  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
  await db
    .update(users)
    .set({
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      stripeCurrentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
    })
    .where(eq(users.id, user.id));
  await setUserIsSubscriberStatus(user.id, ACTIVE_STATUSES.has(subscription.status));
}

export function constructWebhookEvent(rawBody: string, signature: string) {
  return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET ?? "");
}
