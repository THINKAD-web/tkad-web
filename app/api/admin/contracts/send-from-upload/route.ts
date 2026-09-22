import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import {
  createUploadContractSend,
  UploadContractSendBody,
} from "@/lib/contract-upload-send";
import { StandaloneContractSendError } from "@/lib/standalone-contract-send";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const parsed = UploadContractSendBody.safeParse(raw);
  if (!parsed.success) {
    return json(
      { error: "validation_failed", details: parsed.error.flatten() },
      400,
    );
  }

  const { force, ...input } = parsed.data;

  try {
    const db = getPrisma();
    const result = await createUploadContractSend(db, input, {
      holdForce: force,
    });
    return json({
      ok: true,
      quoteId: result.quoteId,
      contractId: result.contractId,
      emailed: result.emailed,
      inviteLog: result.inviteLog,
    });
  } catch (e) {
    if (e instanceof StandaloneContractSendError) {
      if (e.code === "BOOKING_CONFLICT") {
        return json(
          { error: e.message, code: e.code, conflicts: e.conflicts },
          409,
        );
      }
      if (e.code === "MEDIA_REQUIRED" || e.code === "DATES_REQUIRED") {
        return json({ error: e.message, code: e.code }, 400);
      }
      return json({ error: e.message, code: e.code }, 400);
    }
    if (e instanceof Error && e.message === "upload_fetch_failed") {
      return json({ error: "upload_pdf_unreachable" }, 400);
    }
    throw e;
  }
}
