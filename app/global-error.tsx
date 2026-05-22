"use client";

import { useEffect } from "react";
import { NeonErrorPage } from "@/components/public-chrome/neon-error-page";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  return (
    <html lang="ko">
      <body className="m-0 bg-gray-50 dark:bg-[#05050a] antialiased">
        <NeonErrorPage
          standalone
          code="500"
          eyebrow="[ SYSTEM ERROR ]"
          title="일시적 오류가 발생했습니다"
          description="서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요. · We're having a temporary problem. Please try again in a moment."
          retryLabel="다시 시도"
          homeLabel="홈으로"
          homeHref="/ko"
          onReset={reset}
          className="min-h-screen"
          footerNote={
            process.env.NODE_ENV === "development" && error.digest
              ? `ref: ${error.digest}`
              : undefined
          }
        />
      </body>
    </html>
  );
}
