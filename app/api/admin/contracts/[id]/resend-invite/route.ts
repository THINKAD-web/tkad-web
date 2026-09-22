import { NextRequest } from "next/server";
import { assertAdminDb, adminDbQueryFailed, json } from "@/lib/admin-guard";
import { mapUploadPdfFetchErrorToHttpStatus } from "@/lib/contract-send-mode";
import { OohContractSendMode } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { resendUploadContractDelivery } from "@/lib/contract-upload-send";
import {
  resendContractInvite,
  StandaloneContractSendError,
} from "@/lib/standalone-contract-send";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id: contractId } = await params;
  const db = getPrisma();

  try {
    const row = await db.oohContract.findUnique({
      where: { id: contractId },
      select: { sendMode: true },
    });
    if (!row) {
      return json({ error: "not_found" }, 404);
    }
    const result =
      row.sendMode === OohContractSendMode.auto_generated
        ? await resendContractInvite(db, contractId)
        : await resendUploadContractDelivery(db, contractId);
    return json({
      ok: true,
      quoteId: result.quoteId,
      emailed: result.emailed,
      inviteLog: result.inviteLog,
      emailSkipReason: result.emailSkipReason,
      emailDetail: result.emailDetail,
    });
  } catch (e) {
    if (e instanceof StandaloneContractSendError) {
      if (e.message === "not_found") {
        return json({ error: "not_found" }, 404);
      }
      if (
        e.message === "contract_not_pending" ||
        e.message === "contract_not_attachment_sent"
      ) {
        return json({ error: e.message, code: "INVALID_STATUS" }, 409);
      }
      if (e.message === "missing_client_email") {
        return json({ error: "missing_client_email", code: "VALIDATION" }, 400);
      }
      return json({ error: e.message, code: e.code }, 400);
    }
    if (e instanceof Error) {
      return json(
        { error: e.message },
        mapUploadPdfFetchErrorToHttpStatus(e.message),
      );
    }
    console.error("[resend-invite]", e);
    return adminDbQueryFailed(e);
  }
}
