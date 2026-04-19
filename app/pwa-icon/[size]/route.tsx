import { ImageResponse } from "next/og";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params;
  const s = Math.min(Math.max(parseInt(size, 10) || 192, 16), 1024);

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
          borderRadius: s * 0.2,
        }}
      >
        <span
          style={{
            fontSize: s * 0.45,
            fontWeight: 900,
            color: "#C8913C",
            letterSpacing: s * -0.02,
          }}
        >
          TK
        </span>
      </div>
    ),
    { width: s, height: s }
  );
}
