import { NextRequest } from "next/server";
import { requireMediaOwner } from "@/lib/media-owner-guard";
import { getPrisma } from "@/lib/prisma";
import { apiOk, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;

  const db = getPrisma();
  const branding = await db.mediaOwnerBranding.findUnique({
    where: { ownerUserId: auth.user.id },
  });
  return apiOk({ branding });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", 400);
  }

  const data: Record<string, unknown> = {};
  if (typeof body.logoUrl === "string" || body.logoUrl === null) {
    data.logoUrl = body.logoUrl;
  }
  if (typeof body.companyName === "string") data.companyName = body.companyName.trim();
  if (typeof body.businessNumber === "string") {
    data.businessNumber = body.businessNumber.trim();
  }
  if (typeof body.contactPhone === "string") data.contactPhone = body.contactPhone.trim();
  if (typeof body.contactEmail === "string") data.contactEmail = body.contactEmail.trim();
  if (body.theme === "ORANGE" || body.theme === "BLUE" || body.theme === "VIOLET") {
    data.theme = body.theme;
  }
  if (typeof body.autoMonthlyReport === "boolean") {
    data.autoMonthlyReport = body.autoMonthlyReport;
  }
  if (typeof body.autoReportEmail === "string" || body.autoReportEmail === null) {
    data.autoReportEmail = body.autoReportEmail;
  }

  const db = getPrisma();
  const branding = await db.mediaOwnerBranding.upsert({
    where: { ownerUserId: auth.user.id },
    create: { ownerUserId: auth.user.id, ...data },
    update: data,
  });

  return apiOk({ branding });
}
