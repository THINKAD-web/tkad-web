import { NextRequest } from "next/server";
import { assertAdmin, json } from "@/lib/admin-guard";
import {
  isBunnyStorageConfigured,
  uploadToBunnyStorage,
} from "@/lib/bunny-storage";

export const dynamic = "force-dynamic";

function extFromType(t: string): string {
  const type = (t || "").toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("avif")) return "avif";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("svg")) return "svg";
  return "bin";
}

export async function POST(request: NextRequest) {
  const deny = assertAdmin(request);
  if (deny) return deny;

  if (!isBunnyStorageConfigured()) {
    return json({ error: "Bunny not configured" }, 503);
  }

  try {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return json({ error: "Missing file" }, 400);
    }

    const bytes = await file.arrayBuffer();
    const ext = extFromType(file.type);
    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const rand = crypto.randomUUID();
    const path = `tkad/admin/${yyyy}/${mm}/${rand}.${ext}`;

    const out = await uploadToBunnyStorage({
      path,
      bytes,
      contentType: file.type || "application/octet-stream",
    });

    return json({ url: out.publicUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    console.error("[admin upload bunny]", msg, e);
    return json({ error: msg }, 502);
  }
}

