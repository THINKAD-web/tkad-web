"use client";

import { useEffect } from "react";

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
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: "#d6d9e6",
          color: "#1a1a2e",
        }}
      >
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div style={{ maxWidth: "28rem", textAlign: "center" }}>
            <div
              style={{
                margin: "0 auto 1.5rem",
                display: "flex",
                height: "4rem",
                width: "4rem",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "9999px",
                background: "rgba(239,68,68,0.1)",
                fontSize: "2rem",
              }}
            >
              ⚠️
            </div>
            <h1
              style={{
                fontSize: "3.75rem",
                fontWeight: 800,
                color: "#9b3c31",
                lineHeight: 1,
              }}
            >
              500
            </h1>
            <h2
              style={{
                marginTop: "1rem",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "#1a1a2e",
              }}
            >
              일시적 오류가 발생했습니다
            </h2>
            <p
              style={{
                marginTop: "0.5rem",
                fontSize: "0.9rem",
                color: "#475569",
                lineHeight: 1.5,
              }}
            >
              Something went wrong. Please try again shortly.
            </p>
            <p
              style={{
                marginTop: "0.75rem",
                color: "#64748b",
                lineHeight: 1.6,
                fontSize: "0.875rem",
              }}
            >
              서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: "2rem",
                padding: "0.75rem 2rem",
                borderRadius: "9999px",
                background: "#9b3c31",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.875rem",
                border: "none",
                cursor: "pointer",
              }}
            >
              다시 시도 / Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
