import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { generateMediaTranslations } from "@/lib/media-ai-translate";
import { normalizeMediaCountry } from "@/lib/media-country";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: {
    name?: string;
    description?: string;
    location?: string;
    country?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const name = String(body.name ?? "").trim();
  const location = String(body.location ?? "").trim();
  if (!name || !location) {
    return json({ error: "name and location are required" }, 400);
  }

  try {
    const result = await generateMediaTranslations({
      name,
      location,
      description: body.description?.trim() || null,
      country: normalizeMediaCountry(body.country),
    });
    // Flat nameEn/descriptionEn/locationEn kept for the existing (en-only) admin form —
    // ja/zh are additionally exposed for the future language-tab UI (PR6), which the
    // current form simply ignores.
    return json({
      nameEn: result.en.name,
      descriptionEn: result.en.description,
      locationEn: result.en.location,
      ja: result.ja,
      zh: result.zh,
      model: result.model,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return json({ error: "AI 미설정: ANTHROPIC_API_KEY" }, 503);
    }
    console.error("[admin/medias/ai-translate]", e);
    return json({ error: msg }, 500);
  }
}
