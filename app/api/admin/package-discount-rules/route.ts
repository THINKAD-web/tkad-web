import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { packageDiscountRuleToAdminRow } from "@/lib/package-discount-rule-map";
import { listActivePackageDiscountRules } from "@/lib/package-discount-rules-server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseOptionalInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function parseOptionalDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s.includes("T") ? s : `${s.slice(0, 10)}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function validateBounds(body: Record<string, unknown>): string | null {
  const minMc = parseOptionalInt(body.minMediaCount);
  const maxMc = parseOptionalInt(body.maxMediaCount);
  if (minMc != null && maxMc != null && minMc > maxMc) {
    return "minMediaCount cannot exceed maxMediaCount";
  }
  const minSw = parseOptionalInt(body.minSupplyWon);
  const maxSw = parseOptionalInt(body.maxSupplyWon);
  if (minSw != null && maxSw != null && minSw > maxSw) {
    return "minSupplyWon cannot exceed maxSupplyWon";
  }
  const pct = Number(body.discountPercent ?? 0);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    return "discountPercent must be 0–100";
  }
  return null;
}

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const scope = request.nextUrl.searchParams.get("scope")?.trim();
  const db = getPrisma();

  if (scope === "active") {
    const rules = await listActivePackageDiscountRules(db);
    return json({ rules });
  }

  const rows = await db.packageDiscountRule.findMany({
    orderBy: [{ priority: "asc" }, { id: "asc" }],
  });
  return json({ rules: rows.map(packageDiscountRuleToAdminRow) });
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

  const labelKo = String(body.labelKo ?? "").trim();
  if (!labelKo) return json({ error: "labelKo required" }, 400);

  const boundErr = validateBounds(body);
  if (boundErr) return json({ error: boundErr }, 400);

  const db = getPrisma();
  const maxPri = await db.packageDiscountRule.aggregate({
    _max: { priority: true },
  });
  const priority =
    body.priority != null
      ? Math.round(Number(body.priority))
      : (maxPri._max.priority ?? 0) + 10;

  const row = await db.packageDiscountRule.create({
    data: {
      active: body.active !== false,
      priority,
      labelKo,
      labelEn: String(body.labelEn ?? "").trim() || null,
      minMediaCount: parseOptionalInt(body.minMediaCount),
      maxMediaCount: parseOptionalInt(body.maxMediaCount),
      minSupplyWon: parseOptionalInt(body.minSupplyWon),
      maxSupplyWon: parseOptionalInt(body.maxSupplyWon),
      discountPercent: Number(body.discountPercent ?? 0),
      stackable: Boolean(body.stackable),
      validFrom: parseOptionalDate(body.validFrom),
      validTo: parseOptionalDate(body.validTo),
    },
  });

  return json({ rule: packageDiscountRuleToAdminRow(row) }, 201);
}
