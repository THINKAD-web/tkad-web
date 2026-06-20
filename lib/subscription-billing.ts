import { randomBytes } from "node:crypto";
import type { SubscriptionStatus } from "@prisma/client";
import { confirmTossPayment } from "@/lib/toss-payments";
import { discountedProPriceKrw } from "@/lib/entitlements/pricing";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/prisma";
import {
  activateProPlanForUser,
  syncUserPlanAfterSubscriptionEnd,
} from "@/lib/check-plan";

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

export async function createProCheckout(userId: string) {
  const orderId = generateSubscriptionOrderId();
  const endDate = addOneMonth();
  const amountKrw = discountedProPriceKrw();

  const sub = await prisma.subscription.create({
    data: {
      userId,
      plan: "PRO",
      status: "PAST_DUE",
      orderId,
      amountKrw,
      endDate,
    },
  });

  return { subscriptionId: sub.id, orderId, amount: amountKrw };
}

/** 결제 완료 후 Subscription + User.plan 동기화 */
export async function activateProSubscriptionRecord(opts: {
  orderId: string;
  paymentKey?: string | null;
  userId?: string;
}): Promise<{ userId: string } | null> {
  if (!isDatabaseConfigured() || !isSubscriptionOrderId(opts.orderId)) {
    return null;
  }

  const sub = await prisma.subscription.findFirst({
    where: {
      orderId: opts.orderId,
      plan: "PRO",
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

  await activateProPlanForUser(sub.userId);
  return { userId: sub.userId };
}

export async function confirmProSubscription(opts: {
  userId: string;
  paymentKey: string;
  orderId: string;
  amount: number;
}) {
  const sub = await prisma.subscription.findFirst({
    where: { userId: opts.userId, orderId: opts.orderId, plan: "PRO" },
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
      ? { handled: true, action: "activated_pro" }
      : { handled: false };
  }

  const subStatus = subscriptionEndStatus(status);
  if (!subStatus) return { handled: false };

  const sub = await prisma.subscription.findFirst({
    where: { orderId, plan: "PRO" },
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
      plan: { in: ["PRO", "ENTERPRISE"] },
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
