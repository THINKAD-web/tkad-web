import { sendSlackInsightAlert } from "@/lib/insights/notifiers/slack";
import { siteUrl } from "@/lib/seo";
import type { MediaImageHealthResult } from "@/lib/media-image-health";

export async function notifyBrokenMediaImagesSlack(
  result: MediaImageHealthResult,
): Promise<{ sent: boolean; skipped?: boolean }> {
  if (result.broken.length === 0) {
    return { sent: false, skipped: true };
  }

  const origin = siteUrl.replace(/\/$/, "");
  const preview = result.broken
    .slice(0, 8)
    .map(
      (b) =>
        `• ${b.name} (\`${b.mediaId}\`) — ${b.status ?? "—"} ${b.error ?? ""}`.trim(),
    )
    .join("\n");

  const res = await sendSlackInsightAlert({
    severity: "warning",
    title: "매체 썸네일 이미지 오류",
    summary: `스캔 ${result.scanned}건 중 *${result.broken.length}건* 썸네일 응답 오류 (404/5xx).\n${preview}${result.broken.length > 8 ? `\n…외 ${result.broken.length - 8}건` : ""}`,
    fields: [
      { label: "검사 시각", value: result.checkedAt },
      { label: "깨진 URL 수", value: String(result.broken.length) },
    ],
    adminUrl: `${origin}/ko/admin`,
  });

  return { sent: !res.skipped, skipped: res.skipped };
}
