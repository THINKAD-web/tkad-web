import { randomBytes } from "node:crypto";
import { confirmTossPayment } from "@/lib/toss-payments";
import { PRO_MONTHLY_KRW } from "@/lib/report-access";
import { prisma } from "@/lib/prisma";

export function generateSubscriptionOrderId(): string {
  return `sub_${Date.now()}_${randomBytes(4).toString("hex")}`;
}

export async function createProCheckout(userId: string) {
  const orderId = generateSubscriptionOrderId();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  const sub = await prisma.subscription.create({
    data: {
      userId,
      plan: "PRO",
      status: "PAST_DUE",
      orderId,
      amountKrw: PRO_MONTHLY_KRW,
      endDate,
    },
  });

  return { subscriptionId: sub.id, orderId, amount: PRO_MONTHLY_KRW };
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

  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: "ACTIVE",
      paymentId: result.paymentKey,
      startDate: new Date(),
      endDate,
    },
  });

  return result;
}
