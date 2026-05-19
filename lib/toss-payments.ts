import { randomBytes } from "node:crypto";

export {
  getTossClientKey,
  isTossPaymentsConfigured,
} from "@/lib/toss-payments-client";

const TOSS_API = "https://api.tosspayments.com/v1";

function readTossSecretKey(): string | null {
  return process.env.TOSS_PAYMENTS_SECRET_KEY?.trim() || null;
}

/** Toss orderId — 영문·숫자·하이픈·언더스코어, 6~64자 */
export function generateOrderId(): string {
  const suffix = randomBytes(4).toString("hex");
  return `ib_${Date.now()}_${suffix}`;
}

function authHeader(): string {
  const secret = readTossSecretKey();
  if (!secret) {
    throw new Error(
      "Toss secret key not configured (TOSS_PAYMENTS_SECRET_KEY)",
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
