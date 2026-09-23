"use client";

import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { createIntlMessageHandlers } from "@/lib/i18n-message-fallback";

type Props = {
  locale: string;
  messages: Record<string, unknown>;
  children: ReactNode;
};

export function IntlClientProvider({ locale, messages, children }: Props) {
  const { onError, getMessageFallback } = createIntlMessageHandlers(messages);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="Asia/Seoul"
      onError={onError}
      getMessageFallback={getMessageFallback}
    >
      {children}
    </NextIntlClientProvider>
  );
}
