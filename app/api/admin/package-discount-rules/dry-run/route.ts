import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { applyPackageDiscount } from "@/lib/pricing/package-discount";
import { listActivePackageDiscountRules } from "@/lib/package-discount-rules-server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: { lineSupplyWons?: unknown; asOf?: unknown; activeOnly?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const lineSupplyWons = Array.isArray(body.lineSupplyWons)
    ? body.lineSupplyWons.map((n) => Math.max(0, Math.round(Number(n) || 0)))
    : [];
  if (lineSupplyWons.length === 0) {
    return json({ error: "lineSupplyWons required" }, 400);
  }

  const asOfRaw = body.asOf != null ? String(body.asOf) : undefined;
  const asOf = asOfRaw
    ? new Date(
        asOfRaw.includes("T")
          ? asOfRaw
          : `${asOfRaw.slice(0, 10)}T12:00:00.000Z`,
      )
    : new Date();

  const db = getPrisma();
  const rules =
    body.activeOnly === false
      ? (await db.packageDiscountRule.findMany({
          orderBy: [{ priority: "asc" }, { id: "asc" }],
        })).map((r) => ({
          id: r.id,
          active: r.active,
          priority: r.priority,
          labelKo: r.labelKo,
          minMediaCount: r.minMediaCount,
          maxMediaCount: r.maxMediaCount,
          minSupplyWon: r.minSupplyWon,
          maxSupplyWon: r.maxSupplyWon,
          discountPercent: r.discountPercent,
          stackable: r.stackable,
          validFrom: r.validFrom,
          validTo: r.validTo,
        }))
      : await listActivePackageDiscountRules(db);

  const result = applyPackageDiscount({ lineSupplyWons, asOf }, rules);
  return json({ result, ruleCount: rules.length });
}
