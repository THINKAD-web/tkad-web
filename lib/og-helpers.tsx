export const ogSize = { width: 1200, height: 630 };

export function OgLayout({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px 80px",
        background: "linear-gradient(135deg, #1a2a6c 0%, #1a1a2e 55%, #12121f 100%)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 400,
          height: 400,
          background: "radial-gradient(circle, rgba(232,213,181,0.14) 0%, transparent 70%)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: 300,
          height: 300,
          background: "radial-gradient(circle, rgba(155,60,49,0.08) 0%, transparent 70%)",
          display: "flex",
        }}
      />

      {badge && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <span
            style={{
              fontSize: 18,
              color: "#e8d5b5",
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {badge}
          </span>
        </div>
      )}

      <div
        style={{
          fontSize: 56,
          fontWeight: 900,
          color: "#ffffff",
          lineHeight: 1.2,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {title}
      </div>

      {subtitle && (
        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.7)",
            marginTop: 20,
            lineHeight: 1.5,
            display: "flex",
          }}
        >
          {subtitle}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: "auto",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            background: "linear-gradient(135deg, #e8d5b5, #c4b08f)",
            borderRadius: 12,
          }}
        >
          <span style={{ fontSize: 28, fontWeight: 900, color: "#1a2a6c" }}>
            T
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#ffffff" }}>
            THINKAD
          </span>
          <span style={{ fontSize: 14, color: "rgba(232,213,181,0.85)" }}>
            싱커드 · 대한민국 No.1 OOH 광고
          </span>
        </div>
      </div>
    </div>
  );
}
