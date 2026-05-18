"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { NeonErrorPage } from "@/components/public-chrome/neon-error-page";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  return (
    <NeonErrorPage
      code="500"
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      retryLabel={t("retry")}
      homeLabel={t("home")}
      onReset={reset}
      footerNote={
        process.env.NODE_ENV === "development" && error.digest
          ? `ref: ${error.digest}`
          : undefined
      }
    />
  );
}
