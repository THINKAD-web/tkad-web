/**
 * Sentry — SENTRY_DSN 설정 시에만 활성화.
 * @sentry/nextjs 미설치·미구성 시에도 앱 빌드·실행에 영향 없음.
 */

type SentryLike = {
  captureException: (error: unknown, ctx?: { extra?: Record<string, unknown> }) => void;
};

let sentryPromise: Promise<SentryLike | null> | null = null;

async function loadSentry(): Promise<SentryLike | null> {
  const dsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return null;
  try {
    const Sentry = await import("@sentry/nextjs");
    if (!Sentry.getClient()) {
      Sentry.init({
        dsn,
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0,
        enabled: process.env.NODE_ENV === "production" || Boolean(process.env.SENTRY_DEBUG),
      });
    }
    return Sentry;
  } catch {
    return null;
  }
}

export async function captureSentryException(
  error: unknown,
  extra?: Record<string, unknown>,
): Promise<void> {
  sentryPromise ??= loadSentry();
  const sentry = await sentryPromise;
  if (!sentry) return;
  sentry.captureException(error, extra ? { extra } : undefined);
}

export function isSentryConfigured(): boolean {
  return Boolean(
    process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim(),
  );
}
