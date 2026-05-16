import { randomBytes } from "node:crypto";

const TOSS_API = "https://api.tosspayments.com/v1";

/** Toss orderId — 영문·숫자·하이픈·언더스코어, 6~64자 */
export function generateOrderId(): string {
  const suffix = randomBytes(4).toString("hex");
  return `ib_${Date.now()}_${suffix}`;
}

export function isTossPaymentsConfigured(): boolean {
  return Boolean(
    process.env.TOSS_PAYMENTS_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY?.trim(),
  );
}

export function getTossClientKey(): string | null {
  return process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY?.trim() || null;
}

function authHeader(): string {
  const secret = process.env.TOSS_PAYMENTS_SECRET_KEY?.trim();
  if (!secret) throw new Error("TOSS_PAYMENTS_SECRET_KEY not configured");
  return `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
}

export type TossConfirmResult = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  method?: string;
  approvedAt?: string;
  raw: unknown;
};

export async function confirmTossPayment(opts: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<TossConfirmResult> {
  const res = await fetch(`${TOSS_API}/payments/confirm`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentKey: opts.paymentKey,
      orderId: opts.orderId,
      amount: opts.amount,
    }),
  });
  const raw = await res.json();
  if (!res.ok) {
    const msg =
      typeof raw === "object" &&
      raw &&
      "message" in raw &&
      typeof (raw as { message: string }).message === "string"
        ? (raw as { message: string }).message
        : "Toss confirm failed";
    throw new Error(msg);
  }
  return {
    paymentKey: String((raw as { paymentKey: string }).paymentKey),
    orderId: String((raw as { orderId: string }).orderId),
    status: String((raw as { status: string }).status),
    totalAmount: Number((raw as { totalAmount: number }).totalAmount),
    method:
      typeof (raw as { method?: string }).method === "string"
        ? (raw as { method: string }).method
        : undefined,
    approvedAt:
      typeof (raw as { approvedAt?: string }).approvedAt === "string"
        ? (raw as { approvedAt: string }).approvedAt
        : undefined,
    raw,
  };
}
