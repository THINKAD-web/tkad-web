/**
 * 가벼운 Slack Incoming Webhook 알림.
 *
 * 환경변수 `SLACK_WEBHOOK_URL` 이 비어 있으면 no-op 으로 동작 → 다른 알림 채널과 안전하게 공존.
 * 실패해도 호출 측 흐름을 막지 않도록 모든 에러를 흡수합니다.
 */

const ENV_KEY = "SLACK_WEBHOOK_URL";

function isHttpsUrl(v: string): boolean {
  return /^https:\/\//i.test(v);
}

export function isSlackConfigured(): boolean {
  const v = process.env[ENV_KEY]?.trim();
  return !!(v && isHttpsUrl(v));
}

export type SlackBlocks = Array<Record<string, unknown>>;

export type SlackMessage = {
  text: string;
  blocks?: SlackBlocks;
  /** 다른 채널로 보내고 싶을 때만. 기본은 webhook 의 default channel. */
  channel?: string;
  /** Slack UI 상 발신자 표시 이름 */
  username?: string;
  iconEmoji?: string;
};

/**
 * 메시지를 보낸다. 환경변수 미설정 시 false 반환.
 * 6초 timeout — Slack 응답 지연이 견적 응답 시간을 끌어내지 않도록.
 */
export async function sendSlackMessage(msg: SlackMessage): Promise<boolean> {
  const url = process.env[ENV_KEY]?.trim();
  if (!url || !isHttpsUrl(url)) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: msg.text,
        ...(msg.blocks ? { blocks: msg.blocks } : {}),
        ...(msg.channel ? { channel: msg.channel } : {}),
        ...(msg.username ? { username: msg.username } : { username: "THINKAD" }),
        ...(msg.iconEmoji ? { icon_emoji: msg.iconEmoji } : { icon_emoji: ":bell:" }),
      }),
      signal: controller.signal,
    });
    return res.ok;
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[slack-notify]", (e as Error)?.message);
    }
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 표준 OOH 견적 알림 — 어드민 URL 버튼 포함.
 */
export async function notifyOohQuoteEvent(args: {
  title: string;
  bodyMd: string;
  adminUrl?: string;
}): Promise<boolean> {
  return sendSlackMessage({
    text: `${args.title}\n${args.bodyMd}`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*${args.title}*\n${args.bodyMd}` },
      },
      ...(args.adminUrl
        ? [
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: { type: "plain_text", text: "어드민에서 열기" },
                  url: args.adminUrl,
                },
              ],
            },
          ]
        : []),
    ],
  });
}
