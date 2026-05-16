import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  isCloudinaryConfigured,
  signUploadParams,
} from "@/lib/cloudinary-sign";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 30, windowMs: 60_000 });

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (!limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Image upload is not configured" },
      { status: 503 },
    );
  }

  const params = signUploadParams("tkad/media-applications");
  if (!params) {
    return NextResponse.json({ error: "Sign failed" }, { status: 503 });
  }
  return NextResponse.json(params);
}
