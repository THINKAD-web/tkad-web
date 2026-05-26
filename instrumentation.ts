export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const dsn =
      process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
    if (!dsn) return;
    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.init({
        dsn,
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
        tracesSampleRate: 0.05,
      });
    } catch {
      /* @sentry/nextjs optional until installed */
    }
  }
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
) {
  const message = err instanceof Error ? err.message : String(err);
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logOpsError } = await import("@/lib/tracking/log-ops-error");
  await logOpsError({
    tag: "request_error",
    path: request.path,
    status: 500,
    message,
  });
}
