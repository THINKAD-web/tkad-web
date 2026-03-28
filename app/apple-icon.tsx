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
          background: "linear-gradient(135deg, #1A2A6C 0%, #121A3A 100%)",
          borderRadius: 36,
        }}
      >
        <span
          style={{
            fontSize: 100,
            fontWeight: 900,
            color: "#E8D5B5",
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
