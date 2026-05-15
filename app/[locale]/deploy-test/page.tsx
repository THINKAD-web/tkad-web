import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default function DeployTestPage() {
  const now = new Date().toISOString();
  const dbOk = isDatabaseConfigured();
  const nodeVer = process.version;

  const checks = [
    { label: "Server Time (UTC)", value: now, ok: true },
    { label: "Node.js", value: nodeVer, ok: true },
    { label: "DATABASE_URL", value: dbOk ? "configured" : "not set", ok: dbOk },
    {
      label: "CRON_SECRET",
      value: process.env.CRON_SECRET ? "set" : "not set",
      ok: !!process.env.CRON_SECRET,
    },
    {
      label: "RESEND_API_KEY",
      value: process.env.RESEND_API_KEY ? "set" : "not set",
      ok: !!process.env.RESEND_API_KEY,
    },
    {
      label: "CLOUDINARY",
      value:
        process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME
          ? "set"
          : "not set",
      ok: !!(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME),
    },
    {
      label: "ANTHROPIC_API_KEY",
      value: process.env.ANTHROPIC_API_KEY ? "set" : "not set",
      ok: !!process.env.ANTHROPIC_API_KEY,
    },
    {
      label: "SITE_URL",
      value: process.env.SITE_URL || "(default: tkad.co.kr)",
      ok: true,
    },
  ];

  const allOk = checks.every((c) => c.ok);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 font-[family-name:var(--font-geist-sans)]">
      <h1 className="mb-2 text-3xl font-bold">
        THINKAD Deploy Test
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        branch: <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">claude/xthex-deployment-setup-oB3pJ</code>
        {" | "}commit: <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">cf9d583</code>
      </p>

      <div
        className={`mb-8 rounded-lg border-2 p-4 text-center text-lg font-semibold ${
          allOk
            ? "border-green-400 bg-green-50 text-green-800"
            : "border-yellow-400 bg-yellow-50 text-yellow-800"
        }`}
      >
        {allOk ? "All checks passed" : "Some optional env vars missing"}
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="pb-2">Check</th>
            <th className="pb-2">Value</th>
            <th className="pb-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((c) => (
            <tr key={c.label} className="border-b border-gray-100">
              <td className="py-2.5 font-medium">{c.label}</td>
              <td className="py-2.5 font-mono text-xs text-gray-600">
                {c.value}
              </td>
              <td className="py-2.5 text-center">
                {c.ok ? (
                  <span className="inline-block h-5 w-5 rounded-full bg-green-500 text-center text-xs leading-5 text-white">
                    OK
                  </span>
                ) : (
                  <span className="inline-block h-5 w-5 rounded-full bg-yellow-400 text-center text-xs leading-5 text-white">
                    --
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 rounded border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
        <p className="font-semibold">Endpoints</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li><code>/api/health</code> &mdash; health check</li>
          <li><code>/api/public/media-catalog</code> &mdash; public media API</li>
          <li><code>/api/cron/admin-digest</code> &mdash; daily digest (requires CRON_SECRET)</li>
          <li><code>/api/cron/followup-reminders</code> &mdash; follow-up emails (requires CRON_SECRET)</li>
        </ul>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        This page is for deployment verification only. Remove after confirming.
      </p>
    </div>
  );
}
