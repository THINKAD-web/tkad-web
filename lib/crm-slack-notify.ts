import { sendSlackInsightAlert } from "@/lib/insights/notifiers/slack";
import { siteUrl } from "@/lib/seo";

export async function sendCrmSlackAlert(opts: {
  title: string;
  summary: string;
  lines: string[];
  assignedTo?: string | null;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const pipelineUrl = `${siteUrl.replace(/\/$/, "")}/ko/admin/pipeline`;
  const fields = [
    ...(opts.assignedTo
      ? [{ label: "담당", value: opts.assignedTo }]
      : []),
    { label: "건수", value: String(opts.lines.length) },
  ];
  const body =
    opts.lines.length > 0
      ? opts.lines.slice(0, 15).join("\n")
      : opts.summary;

  return sendSlackInsightAlert({
    severity: "warning",
    title: opts.title,
    summary: `${opts.summary}\n\n${body}`,
    fields,
    adminUrl: pipelineUrl,
  });
}
