/**
 * 토스페이먼츠 웹훅 — PRO 구독 결제 상태 동기화.
 *
 * 토스 개발자센터 → 웹훅 URL: https://your-domain/api/webhooks/toss
 * 이벤트: PAYMENT_STATUS_CHANGED (필수), DEPOSIT_CALLBACK (가상계좌 시)
 */

import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { handleTossSubscriptionWebhook } from "@/lib/subscription-billing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type TossWebhookBody = {
  eventType?: string;
  createdAt?: string;
  data?: {
    orderId?: string;
    status?: string;
    paymentKey?: string;
  };
  orderId?: string;
  status?: string;
  paymentKey?: string;
};

function extractPayload(body: TossWebhookBody): {
  orderId?: string;
  status?: string;
  paymentKey?: string;
} {
  if (body.eventType === "PAYMENT_STATUS_CHANGED" && body.data) {
    return {
      orderId: body.data.orderId,
      status: body.data.status,
      paymentKey: body.data.paymentKey,
    };
  }
  return {
    orderId: body.orderId,
    status: body.status,
    paymentKey: body.paymentKey,
  };
}

export async function POST(request: NextRequest) {
  let body: TossWebhookBody;
  try {
    body = (await request.json()) as TossWebhookBody;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const payload = extractPayload(body);
  const result = await handleTossSubscriptionWebhook(payload);

  return json({ ok: true, ...result });
}
