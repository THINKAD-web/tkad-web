import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0D1B2E 0%, #0A1420 100%)",
          borderRadius: 6,
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 900,
            color: "#C8913C",
            letterSpacing: -1,
          }}
        >
          T
        </span>
      </div>
    ),
    { ...size }
  );
}
