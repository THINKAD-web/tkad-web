/**
 * Optional Telegram Bot API for admin alerts (OOH 견적·부킹 파이프라인).
 * TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_CHAT_ID
 */

function getBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

function getAdminChatId(): string | null {
  return process.env.TELEGRAM_ADMIN_CHAT_ID?.trim() || null;
}

export function isTelegramConfigured(): boolean {
  return !!(getBotToken() && getAdminChatId());
}

type InlineButton = { text: string; url: string };

export async function sendTelegramMessage(
  text: string,
  options?: { buttons?: InlineButton[] },
): Promise<{ ok: boolean; skipped?: boolean }> {
  const token = getBotToken();
  const chatId = getAdminChatId();
  if (!token || !chatId) {
    return { ok: false, skipped: true };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (options?.buttons?.length) {
    body.reply_markup = {
      inline_keyboard: [
        options.buttons.map((b) => ({ text: b.text, url: b.url })),
      ],
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[telegram] sendMessage failed:", res.status, errText);
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("[telegram]", e);
    return { ok: false };
  }
}

export function adminOohQuoteUrl(quoteId: string): string {
  const base =
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  const path = `/ko/admin/quotes?tab=booking&highlight=${encodeURIComponent(quoteId)}`;
  return `${base.replace(/\/$/, "")}${path}`;
}
