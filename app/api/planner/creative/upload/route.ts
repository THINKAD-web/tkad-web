import { NextRequest, NextResponse } from "next/server";
import {
  isBunnyStorageConfigured,
  uploadToBunnyStorage,
} from "@/lib/bunny-storage";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
]);

function extFromType(t: string): string {
  const type = (t || "").toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("svg")) return "svg";
  return "bin";
}

export async function POST(request: NextRequest) {
  if (!isBunnyStorageConfigured()) {
    return NextResponse.json({ error: "Bunny not configured" }, { status: 503 });
  }

  try {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }
    if (!ACCEPTED.has(file.type)) {
      return NextResponse.json({ error: "Unsupported type" }, { status: 415 });
    }

    const bytes = await file.arrayBuffer();
    const ext = extFromType(file.type);
    const path = `tkad/planner/creative/${crypto.randomUUID()}.${ext}`;

    const out = await uploadToBunnyStorage({
      path,
      bytes,
      contentType: file.type,
    });

    return NextResponse.json({ secureUrl: out.publicUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    console.error("[planner creative upload bunny]", msg, e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

