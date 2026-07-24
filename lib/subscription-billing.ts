import { randomBytes } from "node:crypto";
import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { confirmTossPayment } from "@/lib/toss-payments";
import {
  amountKrwForCheckoutPlan,
  orderNameForCheckoutPlan,
  type CheckoutablePlan,
} from "@/lib/subscription-billing-client";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/prisma";
import {
  activateAgencyPlanForUser,
  activateLitePlanForUser,
  activateProPlanForUser,
  syncUserPlanAfterSubscriptionEnd,
} from "@/lib/check-plan";

export type { CheckoutablePlan };
export { amountKrwForCheckoutPlan, orderNameForCheckoutPlan };

export function generateSubscriptionOrderId(): string {
  return `sub_${Date.now()}_${randomBytes(4).toString("hex")}`;
}

export function isSubscriptionOrderId(orderId: string): boolean {
  return orderId.startsWith("sub_");
}

const PAYMENT_DONE = new Set(["DONE"]);
const PAYMENT_ENDED = new Set([
  "CANCELED",
  "PARTIAL_CANCELED",
  "EXPIRED",
  "ABORTED",
]);

function subscriptionEndStatus(
  paymentStatus: string,
): SubscriptionStatus | null {
  if (PAYMENT_ENDED.has(paymentStatus)) {
    return paymentStatus === "EXPIRED" ? "EXPIRED" : "CANCELLED";
  }
  return null;
}

function addOneMonth(from = new Date()): Date {
  const endDate = new Date(from);
  endDate.setMonth(endDate.getMonth() + 1);
  return endDate;
}

async function activateUserPlanForSubscription(
  userId: string,
  plan: SubscriptionPlan,
): Promise<void> {
  if (plan === "LITE") {
    await activateLitePlanForUser(userId);
    return;
  }
  if (plan === "AGENCY") {
    await activateAgencyPlanForUser(userId);
    return;
  }
  if (plan === "ENTERPRISE") {
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: "ENTERPRISE",
        trialStartedAt: null,
        trialEndsAt: null,
        proTrialEndsAt: null,
      },
    });
    return;
  }
  await activateProPlanForUser(userId);
}

/** @deprecated use createPaidCheckout(userId, "PRO") */
export async function createProCheckout(userId: string) {
  return createPaidCheckout(userId, "PRO");
}

export async function createPaidCheckout(
  userId: string,
  plan: CheckoutablePlan,
) {
  if (plan !== "LITE" && plan !== "PRO" && plan !== "AGENCY") {
    throw new Error("invalid_checkout_plan");
  }

  const orderId = generateSubscriptionOrderId();
  const endDate = addOneMonth();
  const amountKrw = amountKrwForCheckoutPlan(plan);

  const sub = await prisma.subscription.create({
    data: {
      userId,
      plan,
      status: "PAST_DUE",
      orderId,
      amountKrw,
      endDate,
    },
  });

  return { subscriptionId: sub.id, orderId, amount: amountKrw, plan };
}

/** 결제 완료 후 Subscription + User.plan 동기화 */
export async function activateProSubscriptionRecord(opts: {
  orderId: string;
  paymentKey?: string | null;
  userId?: string;
}): Promise<{ userId: string; plan: SubscriptionPlan } | null> {
  if (!isDatabaseConfigured() || !isSubscriptionOrderId(opts.orderId)) {
    return null;
  }

  const sub = await prisma.subscription.findFirst({
    where: {
      orderId: opts.orderId,
      plan: { in: ["LITE", "PRO", "AGENCY", "ENTERPRISE"] },
      ...(opts.userId ? { userId: opts.userId } : {}),
    },
  });
  if (!sub) return null;

  const endDate = addOneMonth();

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: "ACTIVE",
      paymentId: opts.paymentKey ?? sub.paymentId,
      startDate: new Date(),
      endDate,
    },
  });

  await activateUserPlanForSubscription(sub.userId, sub.plan);
  return { userId: sub.userId, plan: sub.plan };
}

export async function confirmProSubscription(opts: {
  userId: string;
  paymentKey: string;
  orderId: string;
  amount: number;
}) {
  const sub = await prisma.subscription.findFirst({
    where: {
      userId: opts.userId,
      orderId: opts.orderId,
      plan: { in: ["LITE", "PRO", "AGENCY"] },
    },
  });
  if (!sub) throw new Error("subscription_not_found");
  if (sub.amountKrw != null && sub.amountKrw !== opts.amount) {
    throw new Error("amount_mismatch");
  }

  const result = await confirmTossPayment({
    paymentKey: opts.paymentKey,
    orderId: opts.orderId,
    amount: opts.amount,
  });

  await activateProSubscriptionRecord({
    orderId: opts.orderId,
    paymentKey: result.paymentKey,
    userId: opts.userId,
  });

  return result;
}

/** 토스 웹훅 — 구독 결제 상태 변경 */
export async function handleTossSubscriptionWebhook(payload: {
  orderId?: string;
  status?: string;
  paymentKey?: string;
}): Promise<{ handled: boolean; action?: string }> {
  const orderId = payload.orderId?.trim();
  const status = payload.status?.trim();
  if (!orderId || !status || !isSubscriptionOrderId(orderId)) {
    return { handled: false };
  }

  if (PAYMENT_DONE.has(status)) {
    const activated = await activateProSubscriptionRecord({
      orderId,
      paymentKey: payload.paymentKey,
    });
    return activated
      ? { handled: true, action: `activated_${activated.plan.toLowerCase()}` }
      : { handled: false };
  }

  const subStatus = subscriptionEndStatus(status);
  if (!subStatus) return { handled: false };

  const sub = await prisma.subscription.findFirst({
    where: {
      orderId,
      plan: { in: ["LITE", "PRO", "AGENCY", "ENTERPRISE"] },
    },
    select: { id: true, userId: true },
  });
  if (!sub) return { handled: false };

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: subStatus },
  });
  await syncUserPlanAfterSubscriptionEnd(sub.userId);

  return { handled: true, action: "downgraded_free" };
}

/** endDate 경과 ACTIVE 구독 만료 처리 */
export async function expireEndedSubscriptions(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  const now = new Date();
  const ended = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      plan: { in: ["LITE", "PRO", "AGENCY", "ENTERPRISE"] },
      endDate: { lt: now },
    },
    select: { id: true, userId: true },
    take: 200,
  });

  for (const sub of ended) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "EXPIRED" },
    });
    await syncUserPlanAfterSubscriptionEnd(sub.userId);
  }

  return ended.length;
}
