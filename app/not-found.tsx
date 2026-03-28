export default function RootNotFound() {
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
            <h1
              style={{
                fontSize: "3.75rem",
                fontWeight: 800,
                color: "#9b3c31",
                lineHeight: 1,
              }}
            >
              404
            </h1>
            <h2
              style={{
                marginTop: "1rem",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "#1a1a2e",
              }}
            >
              페이지를 찾을 수 없습니다
            </h2>
            <p
              style={{
                marginTop: "0.75rem",
                color: "#64748b",
                lineHeight: 1.6,
              }}
            >
              요청하신 페이지가 존재하지 않거나, 이동되었을 수 있습니다.
            </p>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/ko"
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
                textDecoration: "none",
              }}
            >
              홈으로 돌아가기
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
