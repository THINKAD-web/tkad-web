import { randomBytes } from "node:crypto";

const TOSS_API = "https://api.tosspayments.com/v1";

/** Toss orderId — 영문·숫자·하이픈·언더스코어, 6~64자 */
export function generateOrderId(): string {
  const suffix = randomBytes(4).toString("hex");
  return `ib_${Date.now()}_${suffix}`;
}

function readTossClientKey(): string | null {
  return (
    process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY?.trim() ||
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim() ||
    process.env.TOSS_CLIENT_KEY?.trim() ||
    null
  );
}

function readTossSecretKey(): string | null {
  return (
    process.env.TOSS_PAYMENTS_SECRET_KEY?.trim() ||
    process.env.TOSS_SECRET_KEY?.trim() ||
    null
  );
}

export function isTossPaymentsConfigured(): boolean {
  return Boolean(readTossClientKey() && readTossSecretKey());
}

export function getTossClientKey(): string | null {
  return readTossClientKey();
}

function authHeader(): string {
  const secret = readTossSecretKey();
  if (!secret) {
    throw new Error(
      "Toss secret key not configured (TOSS_PAYMENTS_SECRET_KEY or TOSS_SECRET_KEY)",
    );
  }
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

  const raw = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      typeof raw.message === "string" ? raw.message : `HTTP ${res.status}`;
    throw new Error(message);
  }

  return {
    paymentKey: String(raw.paymentKey ?? opts.paymentKey),
    orderId: String(raw.orderId ?? opts.orderId),
    status: String(raw.status ?? "DONE"),
    totalAmount: Number(raw.totalAmount ?? opts.amount),
    method: typeof raw.method === "string" ? raw.method : undefined,
    approvedAt:
      typeof raw.approvedAt === "string" ? raw.approvedAt : undefined,
    raw,
  };
}
