import { IntlErrorCode, type IntlError } from "next-intl";
import enMessages from "@/messages/en.json";

export function getNestedMessageString(
  obj: unknown,
  dottedKey: string,
): string | undefined {
  const parts = dottedKey.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Shared by `i18n/request.ts` (server) and `IntlClientProvider` (client). */
export function createIntlMessageHandlers(messages: Record<string, unknown>) {
  return {
    onError(error: IntlError) {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        return;
      }
      console.error(error);
    },
    getMessageFallback({
      namespace,
      key,
      error,
    }: {
      namespace?: string;
      key: string;
      error: IntlError;
    }) {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        const fullKey = namespace ? `${namespace}.${key}` : key;
        return (
          getNestedMessageString(enMessages, fullKey) ??
          getNestedMessageString(messages, fullKey) ??
          fullKey
        );
      }
      return key;
    },
  };
}
