import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "오프라인 | THINKAD",
  description: "네트워크 연결을 확인해주세요.",
  robots: { index: false, follow: false },
};

/**
 * Service Worker 가 navigation 실패 시 폴백으로 보여주는 정적 페이지.
 * SW 가 install 시 캐시 → 오프라인 상태에서도 즉시 응답.
 *
 * 외부 의존 없음 (CSS-in-JS / Tailwind / 폰트 모두 내부에 인라인) — 캐시
 * 한 파일로 충분하도록.
 */
export default function OfflinePage() {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Pretendard, sans-serif",
          background: "#000000",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "32rem", textAlign: "center" }}>
          <p
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#FF6600",
              margin: 0,
            }}
          >
            [ OFFLINE ]
          </p>
          <h1
            style={{
              fontSize: "2.25rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              margin: "1rem 0 0.5rem",
              lineHeight: 1.1,
            }}
          >
            네트워크 연결을 확인해주세요
          </h1>
          <p
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "13px",
              color: "rgba(255, 255, 255, 0.65)",
              lineHeight: 1.7,
              margin: "0 0 2rem",
            }}
          >
            인터넷 연결이 끊겼습니다. 연결 후 다시 시도해주세요.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                border: "2px solid #FF6600",
                background: "#FF6600",
                color: "#ffffff",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "0.875rem 1.5rem",
                textDecoration: "none",
              }}
            >
              다시 시도 →
            </Link>
          </div>

          <p
            style={{
              marginTop: "3rem",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "10px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(255, 255, 255, 0.35)",
            }}
          >
            THINKAD · OOH MEDIA AGENCY
          </p>
        </div>
      </body>
    </html>
  );
}
