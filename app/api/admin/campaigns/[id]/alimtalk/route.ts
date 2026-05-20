import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import {
  ALIMTALK_TEMPLATE_CODES,
  isKnownAlimtalkTemplate,
  normalizeKrPhone,
  sendAlimtalk,
} from "@/lib/kakao-alimtalk";
import { notifyCampaignByTemplate } from "@/lib/kakao-alimtalk-notify";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const CAMPAIGN_TEMPLATES = [
  "TKAD_CAMPAIGN_CONFIRMED",
  "TKAD_CAMPAIGN_TOMORROW",
  "TKAD_REPORT_READY",
] as const;

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  const db = getPrisma();
  const c = await db.campaign.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      clientName: true,
      clientPhone: true,
      clientEmail: true,
    },
  });
  if (!c) return json({ error: "Not found" }, 404);

  return json({
    campaign: {
      id: c.id,
      name: c.name,
      clientName: c.clientName,
      clientPhone: c.clientPhone,
      clientEmail: c.clientEmail,
    },
    templates: ALIMTALK_TEMPLATE_CODES.map((code) => ({
      code,
      campaignScoped: (CAMPAIGN_TEMPLATES as readonly string[]).includes(code),
    })),
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const templateCode =
    typeof body.templateCode === "string" ? body.templateCode.trim() : "";
  if (!isKnownAlimtalkTemplate(templateCode)) {
    return json(
      { error: "Invalid templateCode", allowed: ALIMTALK_TEMPLATE_CODES },
      400,
    );
  }

  const toOverride =
    typeof body.to === "string" && body.to.trim() ? body.to.trim() : null;
  const recvName =
    typeof body.recvName === "string" ? body.recvName.trim() : undefined;
  const variables =
    body.variables && typeof body.variables === "object" && !Array.isArray(body)
      ? (body.variables as Record<string, string>)
      : undefined;

  if (
    (CAMPAIGN_TEMPLATES as readonly string[]).includes(templateCode) &&
    !toOverride &&
    !variables
  ) {
    const result = await notifyCampaignByTemplate(
      id,
      templateCode as (typeof CAMPAIGN_TEMPLATES)[number],
    );
    return json({ ok: result.sent, result });
  }

  const db = getPrisma();
  const c = await db.campaign.findUnique({
    where: { id },
    select: {
      clientName: true,
      clientPhone: true,
    },
  });
  if (!c) return json({ error: "Not found" }, 404);

  const to =
    (toOverride && normalizeKrPhone(toOverride)) ||
    (c.clientPhone && normalizeKrPhone(c.clientPhone)) ||
    null;
  if (!to) {
    return json({ error: "Valid recipient phone required" }, 400);
  }

  const vars: Record<string, string> = {
    name: recvName ?? c.clientName ?? "고객",
    campaignName: typeof body.campaignName === "string" ? body.campaignName : "",
    link: typeof body.link === "string" ? body.link : "",
    quoteNumber: typeof body.quoteNumber === "string" ? body.quoteNumber : "",
    ...variables,
  };

  const result = await sendAlimtalk({
    to,
    templateCode,
    recvName: vars.name,
    variables: vars,
  });

  return json({ ok: result.sent, result });
}
