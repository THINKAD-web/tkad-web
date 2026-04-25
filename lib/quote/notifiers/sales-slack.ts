/**
 * 영업팀 Slack 알림 — 견적 요청 발생 시 #sales-leads 채널로 발송.
 *
 * 환경변수:
 *   SLACK_WEBHOOK_URL_SALES — 영업팀 전용 webhook (#sales-leads).
 *   SLACK_WEBHOOK_URL       — 미설정 시 fallback (인사이트와 같은 채널).
 *
 * 미설정 시 silent skip ({ skipped: true }) — fire-and-forget 호출자가 결과 무시 가능.
 *
 * lib/insights/notifiers/slack.ts 와 동일 블록 포맷으로 구성.
 */

export type QuoteSlackPayload = {
  /** OoHQuote.id */
  quoteId: string;
  /** 표기용 견적 번호(있으면) — PR-9 에서 채워짐. 없으면 quoteId 일부 사용. */
  quoteNumber?: string;
  clientName: string;
  clientCompany: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  /** 매체 수 */
  mediaCount: number;
  /** 표시용 한국어 기간 라벨 (예: "1개월", "30일~"). */
  periodLabel: string;
  /** 만원 단위 표기용 — DB OoHQuote.totalAmount 그대로. */
  totalAmountMan: number;
  /** 어드민에서 보기 URL. */
  adminUrl: string;
  /** 사용자 추가 메시지 (있을 때만 노출). */
  message?: string | null;
};

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  fields?: { type: string; text: string }[];
  elements?: Array<{
    type: string;
    text?: { type: string; text: string };
    url?: string;
    style?: string;
  }>;
}

function pickWebhookUrl(): string | null {
  const sales = process.env.SLACK_WEBHOOK_URL_SALES?.trim();
  const main = process.env.SLACK_WEBHOOK_URL?.trim();
  return sales || main || null;
}

function trimText(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function buildBlocks(p: QuoteSlackPayload): SlackBlock[] {
  const headerText = `💼 새 견적 요청 ${p.quoteNumber ? `(${p.quoteNumber})` : ""}`;
  const summaryLines = [
    `*${p.clientName}*${p.clientCompany ? ` · ${p.clientCompany}` : ""}`,
    `매체 ${p.mediaCount}건 · ${p.periodLabel}`,
    `총액: ₩${p.totalAmountMan.toLocaleString("ko-KR")} (만원 표시)`,
  ];
  const blocks: SlackBlock[] = [
    { type: "header", text: { type: "plain_text", text: headerText } },
    {
      type: "section",
      text: { type: "mrkdwn", text: summaryLines.join("\n") },
    },
  ];

  const fields: { label: string; value: string }[] = [
    { label: "이메일", value: p.clientEmail ?? "—" },
    { label: "연락처", value: p.clientPhone ?? "—" },
  ];
  blocks.push({
    type: "section",
    fields: fields.map((f) => ({
      type: "mrkdwn",
      text: `*${f.label}*\n${f.value}`,
    })),
  });

  if (p.message?.trim()) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*추가 요청사항*\n>${trimText(p.message.trim(), 600)}`,
      },
    });
  }

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "어드민에서 보기" },
        url: p.adminUrl,
        style: "primary",
      },
    ],
  });

  return blocks;
}

export async function sendQuoteSalesSlack(
  payload: QuoteSlackPayload,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const webhookUrl = pickWebhookUrl();
  if (!webhookUrl) return { ok: false, skipped: true };

  try {
    const text = `💼 새 견적 ${payload.quoteNumber ? `(${payload.quoteNumber}) ` : ""}— ${payload.clientName}${payload.clientCompany ? `, ${payload.clientCompany}` : ""} (₩${payload.totalAmountMan.toLocaleString("ko-KR")}만)`;
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, blocks: buildBlocks(payload) }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[quote-slack] webhook ${res.status}: ${body.slice(0, 200)}`);
      return { ok: false, error: `${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[quote-slack] fetch failed:", msg);
    return { ok: false, error: msg };
  }
}
