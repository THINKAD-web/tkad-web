import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { generateNetworkQuickAddDraft } from "@/lib/network-ai-draft";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: { description?: string; locationHints?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const description = String(body.description ?? "").trim();
  if (!description) {
    return json({ error: "description is required" }, 400);
  }

  const locationHints = String(body.locationHints ?? "").trim() || undefined;

  try {
    const result = await generateNetworkQuickAddDraft(description, locationHints);
    return json({
      json: result.json,
      data: result.data,
      model: result.model,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return json({ error: "AI 미설정: ANTHROPIC_API_KEY" }, 503);
    }
    console.error("[admin/networks/ai-draft]", e);
    return json({ error: msg }, 500);
  }
}
