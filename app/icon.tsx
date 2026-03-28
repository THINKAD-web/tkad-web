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
          background: "linear-gradient(135deg, #1A2A6C 0%, #121A3A 100%)",
          borderRadius: 6,
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 900,
            color: "#E8D5B5",
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
