import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { isEmailConfigured, sendEmailWithPdfAttachment } from "@/lib/email/client";
import { dispatchInquiryAutoProposalSend } from "@/lib/inquiry-auto-proposal/send-proposal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: { text?: unknown; optionId?: unknown; to?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const text = typeof body.text === "string" ? body.text : "";
  const optionId = typeof body.optionId === "string" ? body.optionId : "";
  const to = typeof body.to === "string" ? body.to : "";

  try {
    const result = await dispatchInquiryAutoProposalSend(
      { text, optionId, to },
      { isEmailConfigured, sendEmailWithPdfAttachment },
    );
    if (!result.ok) {
      return json({ error: result.error }, result.httpStatus);
    }
    return json({
      ok: true,
      to: result.to,
      optionId: result.optionId,
      names: result.names,
    });
  } catch (e) {
    console.error("[inquiry-auto-proposal/send]", e);
    return json({ error: "send_failed" }, 500);
  }
}
