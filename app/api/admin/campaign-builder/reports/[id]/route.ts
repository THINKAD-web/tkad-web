import { NextRequest } from "next/server";
import {
  assertAdminDb,
  adminDbQueryFailed,
  json,
} from "@/lib/admin-guard";
import { campaignBuilderPayloadSchema } from "@/lib/admin-campaign-builder/schemas";
import { getExpectedAdminUsername } from "@/lib/admin-session";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function serializeReport(report: {
  id: string;
  title: string;
  mode: string;
  payload: unknown;
  createdByAdmin: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: report.id,
    title: report.title,
    mode: report.mode,
    payload: report.payload,
    createdByAdmin: report.createdByAdmin,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  try {
    const { id } = await context.params;
    const db = getPrisma();
    const report = await db.adminCampaignBuilderReport.findUnique({
      where: { id },
    });
    if (!report) {
      return json({ error: "Not found" }, 404);
    }
    return json(serializeReport(report));
  } catch (e) {
    return adminDbQueryFailed(e);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const parsed = campaignBuilderPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      { error: "Validation failed", details: parsed.error.flatten() },
      400,
    );
  }

  try {
    const { id } = await context.params;
    const db = getPrisma();
    const existing = await db.adminCampaignBuilderReport.findUnique({
      where: { id },
    });
    if (!existing) {
      return json({ error: "Not found" }, 404);
    }

    const currentAdmin = getExpectedAdminUsername();
    if (existing.createdByAdmin !== currentAdmin) {
      return json({ error: "Forbidden" }, 403);
    }

    const payload = parsed.data;
    const report = await db.adminCampaignBuilderReport.update({
      where: { id },
      data: {
        title: payload.title,
        mode: payload.mode,
        payload,
      },
    });

    return json(serializeReport(report));
  } catch (e) {
    return adminDbQueryFailed(e);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  try {
    const { id } = await context.params;
    const db = getPrisma();
    const existing = await db.adminCampaignBuilderReport.findUnique({
      where: { id },
    });
    if (!existing) {
      return json({ error: "Not found" }, 404);
    }

    const currentAdmin = getExpectedAdminUsername();
    if (existing.createdByAdmin !== currentAdmin) {
      return json({ error: "Forbidden" }, 403);
    }

    await db.adminCampaignBuilderReport.delete({ where: { id } });
    return json({ ok: true });
  } catch (e) {
    return adminDbQueryFailed(e);
  }
}
