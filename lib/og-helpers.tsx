export const ogSize = { width: 1200, height: 630 };

export function OgLayout({
  title,
  subtitle,
  badge,
  imageUrl,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  /** 매체 썸네일 등 — OG 카드 우측 미리보기 */
  imageUrl?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        justifyContent: "space-between",
        padding: "60px 80px",
        background: "linear-gradient(135deg, #0D1B2E 0%, #0A1420 52%, #0E1228 100%)",
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

      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
          minWidth: 0,
          paddingRight: imageUrl ? 48 : 0,
        }}
      >
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
              color: "#c8913c",
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
            background: "linear-gradient(135deg, #C8913C, #C9B896)",
            borderRadius: 12,
          }}
        >
          <span style={{ fontSize: 28, fontWeight: 900, color: "#0D1B2E" }}>
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

      {imageUrl ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            width={360}
            height={360}
            style={{
              objectFit: "cover",
              borderRadius: 24,
              border: "3px solid rgba(255,255,255,0.12)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
