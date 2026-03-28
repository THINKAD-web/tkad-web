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
          background: "linear-gradient(135deg, #1e3a5f 0%, #2a4f7f 100%)",
          borderRadius: s * 0.2,
        }}
      >
        <span
          style={{
            fontSize: s * 0.45,
            fontWeight: 900,
            color: "#c9a84c",
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
