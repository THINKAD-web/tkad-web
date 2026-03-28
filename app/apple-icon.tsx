import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a2a6c 0%, #1a1a2e 100%)",
          borderRadius: 36,
        }}
      >
        <span
          style={{
            fontSize: 100,
            fontWeight: 900,
            color: "#e8d5b5",
            letterSpacing: -4,
          }}
        >
          TK
        </span>
      </div>
    ),
    { ...size }
  );
}
