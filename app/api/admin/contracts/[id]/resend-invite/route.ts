import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
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
    const result = await resendContractInvite(db, contractId);
    return json({
      ok: true,
      quoteId: result.quoteId,
      emailed: result.emailed,
      inviteLog: result.inviteLog,
    });
  } catch (e) {
    if (e instanceof StandaloneContractSendError) {
      if (e.message === "not_found") {
        return json({ error: "not_found" }, 404);
      }
      if (e.message === "contract_not_pending") {
        return json({ error: "contract_not_pending", code: "INVALID_STATUS" }, 409);
      }
      if (e.message === "missing_client_email") {
        return json({ error: "missing_client_email", code: "VALIDATION" }, 400);
      }
      return json({ error: e.message, code: e.code }, 400);
    }
    throw e;
  }
}
