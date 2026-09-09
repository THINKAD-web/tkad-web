import { NextRequest } from "next/server";
import {
  assertAdminDb,
  adminDbQueryFailed,
  json,
} from "@/lib/admin-guard";
import {
  campaignBuilderPayloadSchema,
  type CampaignBuilderReportListItem,
} from "@/lib/admin-campaign-builder/schemas";
import { getExpectedAdminUsername } from "@/lib/admin-session";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function toListItem(row: {
  id: string;
  title: string;
  mode: string;
  payload: unknown;
  updatedAt: Date;
  createdByAdmin: string;
}): CampaignBuilderReportListItem {
  const parsed = campaignBuilderPayloadSchema.safeParse(row.payload);
  const documentType = parsed.success ? parsed.data.documentType : "proposal";
  const mode = row.mode === "ooh" ? "ooh" : "digital";
  return {
    id: row.id,
    title: row.title,
    mode,
    documentType,
    updatedAt: row.updatedAt.toISOString(),
    createdByAdmin: row.createdByAdmin,
  };
}

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  try {
    const db = getPrisma();
    const rows = await db.adminCampaignBuilderReport.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        mode: true,
        payload: true,
        updatedAt: true,
        createdByAdmin: true,
      },
    });

    return json({ reports: rows.map(toListItem) });
  } catch (e) {
    return adminDbQueryFailed(e);
  }
}

export async function POST(request: NextRequest) {
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

  const payload = parsed.data;
  const createdByAdmin = getExpectedAdminUsername();

  try {
    const db = getPrisma();
    const report = await db.adminCampaignBuilderReport.create({
      data: {
        title: payload.title,
        mode: payload.mode,
        payload,
        createdByAdmin,
      },
    });

    return json(
      {
        id: report.id,
        title: report.title,
        mode: report.mode,
        payload: report.payload,
        createdByAdmin: report.createdByAdmin,
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString(),
      },
      201,
    );
  } catch (e) {
    return adminDbQueryFailed(e);
  }
}
