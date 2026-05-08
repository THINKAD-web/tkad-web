import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import enMessages from "../messages/en.json";
import koMessages from "../messages/ko.json";

/** Static imports so the full locale JSON is always bundled (avoids Turbopack issues with dynamic JSON imports). */
const messagesByLocale = {
  ko: koMessages,
  en: enMessages,
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: messagesByLocale[locale],
    timeZone: "Asia/Seoul",
  };
});
