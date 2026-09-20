import { getRequestConfig } from "next-intl/server";
import { hasLocale, IntlErrorCode } from "next-intl";
import { routing } from "./routing";
import enMessages from "../messages/en.json";
import koMessages from "../messages/ko.json";
import jaMessages from "../messages/ja.json";
import zhMessages from "../messages/zh.json";

/** Static imports so the full locale JSON is always bundled (avoids Turbopack issues with dynamic JSON imports). */
const messagesByLocale = {
  ko: koMessages,
  en: enMessages,
  ja: jaMessages,
  zh: zhMessages,
} as const;

function getNestedString(obj: unknown, dottedKey: string): string | undefined {
  const parts = dottedKey.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages =
    messagesByLocale[locale as keyof typeof messagesByLocale] ??
    messagesByLocale.en;

  return {
    locale,
    messages,
    timeZone: "Asia/Seoul",
    onError(error) {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        return;
      }
      console.error(error);
    },
    getMessageFallback({ namespace, key, error }) {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        const fullKey = namespace ? `${namespace}.${key}` : key;
        return (
          getNestedString(enMessages, fullKey) ??
          getNestedString(messages, fullKey) ??
          fullKey
        );
      }
      return key;
    },
  };
});
