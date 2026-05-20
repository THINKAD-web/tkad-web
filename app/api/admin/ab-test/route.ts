import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { isAbVariant, type AbVariant } from "@/lib/ab-testing";
import { invalidateAbPolicyCache } from "@/lib/ab-middleware";
import {
  getAbEventStats,
  setAbTestWinner,
  startNextAbTest,
} from "@/lib/ab-test-db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const stats = await getAbEventStats();
  if (!stats) {
    return json({ error: "Database not configured" }, 503);
  }
  return json({ stats });
}

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = typeof body.action === "string" ? body.action : "";

  if (action === "declare_winner") {
    const variantRaw =
      typeof body.variant === "string" ? body.variant.trim().toLowerCase() : "";
    if (!isAbVariant(variantRaw)) {
      return json({ error: "variant must be a or b" }, 400);
    }
    const row = await setAbTestWinner(variantRaw);
    invalidateAbPolicyCache();
    return json({
      ok: true,
      forcedVariant: row.forcedVariant,
      generation: row.generation,
    });
  }

  if (action === "start_next_test") {
    const row = await startNextAbTest();
    invalidateAbPolicyCache();
    return json({
      ok: true,
      forcedVariant: row.forcedVariant,
      generation: row.generation,
    });
  }

  return json({ error: "Unknown action" }, 400);
}
