import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { packageDiscountRuleToAdminRow } from "@/lib/package-discount-rule-map";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function parseOptionalInt(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function parseOptionalDate(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s.includes("T") ? s : `${s.slice(0, 10)}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const data: Record<string, unknown> = {};
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.priority !== undefined) {
    data.priority = Math.round(Number(body.priority));
  }
  if (body.labelKo != null) {
    const labelKo = String(body.labelKo).trim();
    if (!labelKo) return json({ error: "labelKo required" }, 400);
    data.labelKo = labelKo;
  }
  if (body.labelEn !== undefined) {
    data.labelEn = String(body.labelEn ?? "").trim() || null;
  }
  if (body.minMediaCount !== undefined) {
    data.minMediaCount = parseOptionalInt(body.minMediaCount);
  }
  if (body.maxMediaCount !== undefined) {
    data.maxMediaCount = parseOptionalInt(body.maxMediaCount);
  }
  if (body.minSupplyWon !== undefined) {
    data.minSupplyWon = parseOptionalInt(body.minSupplyWon);
  }
  if (body.maxSupplyWon !== undefined) {
    data.maxSupplyWon = parseOptionalInt(body.maxSupplyWon);
  }
  if (body.discountPercent !== undefined) {
    const pct = Number(body.discountPercent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return json({ error: "discountPercent must be 0–100" }, 400);
    }
    data.discountPercent = pct;
  }
  if (body.stackable !== undefined) data.stackable = Boolean(body.stackable);
  if (body.validFrom !== undefined) data.validFrom = parseOptionalDate(body.validFrom);
  if (body.validTo !== undefined) data.validTo = parseOptionalDate(body.validTo);

  const db = getPrisma();
  try {
    const row = await db.packageDiscountRule.update({ where: { id }, data });
    return json({ rule: packageDiscountRuleToAdminRow(row) });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}
