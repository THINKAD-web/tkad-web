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
          background: "#020202",
          borderRadius: s * 0.2,
          border: `${Math.max(2, s * 0.012)}px solid rgba(34, 211, 238, 0.35)`,
        }}
      >
        <span
          style={{
            fontSize: s * 0.45,
            fontWeight: 900,
            color: "#22d3ee",
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
