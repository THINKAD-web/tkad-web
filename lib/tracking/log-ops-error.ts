/**
 * Ops error logging — Edge-safe entry (no top-level `@/lib/prisma` import).
 * Used from `instrumentation.ts` `onRequestError` on Node runtime only.
 */

export async function logOpsError(opts: {
  tag?: string;
  path?: string;
  status?: number;
  message?: string;
}): Promise<void> {
  const status = opts.status ?? 500;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { isDatabaseConfigured, getPrisma } = await import("@/lib/prisma");
      if (isDatabaseConfigured()) {
        const db = getPrisma();
        await db.opsErrorLog.create({
          data: {
            tag: opts.tag?.slice(0, 120),
            path: opts.path?.slice(0, 500),
            status,
            message: opts.message?.slice(0, 4000),
          },
        });
      }
    } catch {
      /* ignore logging failures */
    }
  }

  if (status >= 500) {
    void import("@/lib/sentry").then(({ captureSentryException }) =>
      captureSentryException(new Error(opts.message ?? "ops_error"), {
        tag: opts.tag,
        path: opts.path,
        status,
      }),
    );
    if (
      process.env.NEXT_RUNTIME === "nodejs" &&
      process.env.SLACK_OPS_ERROR_ALERTS === "true" &&
      process.env.SLACK_WEBHOOK_URL?.trim()
    ) {
      void import("@/lib/insights/notifiers/slack").then(({ sendSlackInsightAlert }) =>
        sendSlackInsightAlert({
          severity: "error",
          title: "THINKAD 운영 에러",
          summary: (opts.message ?? opts.tag ?? "unknown").slice(0, 400),
          fields: [
            { label: "경로", value: opts.path ?? "—" },
            { label: "상태", value: String(status) },
            { label: "태그", value: opts.tag ?? "—" },
          ],
          adminUrl: process.env.NEXT_PUBLIC_SITE_URL
            ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/ko/admin/launch-monitor`
            : undefined,
        }),
      );
    }
  }
}
