import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import enMessages from "../messages/en.json";
import koMessages from "../messages/ko.json";
import jaMessages from "../messages/ja.json";
import zhMessages from "../messages/zh.json";
import { createIntlMessageHandlers } from "@/lib/i18n-message-fallback";

/** Static imports so the full locale JSON is always bundled (avoids Turbopack issues with dynamic JSON imports). */
const messagesByLocale = {
  ko: koMessages,
  en: enMessages,
  ja: jaMessages,
  zh: zhMessages,
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages =
    messagesByLocale[locale as keyof typeof messagesByLocale] ??
    messagesByLocale.en;

  const { onError, getMessageFallback } = createIntlMessageHandlers(
    messages as Record<string, unknown>,
  );

  return {
    locale,
    messages,
    timeZone: "Asia/Seoul",
    onError,
    getMessageFallback,
  };
});
