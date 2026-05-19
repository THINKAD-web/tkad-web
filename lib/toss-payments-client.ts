/** Toss Payments 클라이언트 키 (Payment Widget) */
export function getTossClientKey(): string | null {
  return process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY?.trim() || null;
}

export function isTossPaymentsConfigured(): boolean {
  return Boolean(getTossClientKey());
}
