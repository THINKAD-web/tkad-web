import { NextRequest } from "next/server";
import { CrmTier } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const db = getPrisma();
  const accounts = await db.crmAccount.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { contactLogs: true, notes: true, followUps: true },
      },
      campaigns: {
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
          budgetMin: true,
          budgetMax: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  return json({ accounts });
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

  const email = String(body.email ?? "").trim().toLowerCase();
  const company = String(body.company ?? "").trim();
  const name = String(body.name ?? "").trim();
  if (!email || !EMAIL_RE.test(email) || !company || !name) {
    return json({ error: "email, company, name required" }, 400);
  }

  let tier: CrmTier = CrmTier.standard;
  if (body.tier != null) {
    const t = String(body.tier);
    if (!Object.values(CrmTier).includes(t as CrmTier)) {
      return json({ error: "Invalid tier" }, 400);
    }
    tier = t as CrmTier;
  }

  const db = getPrisma();
  try {
    const account = await db.crmAccount.create({
      data: {
        email,
        company,
        name,
        phone: String(body.phone ?? "").trim() || null,
        tier,
      },
    });
    return json({ account }, 201);
  } catch {
    return json({ error: "Duplicate email or invalid data" }, 409);
  }
}
