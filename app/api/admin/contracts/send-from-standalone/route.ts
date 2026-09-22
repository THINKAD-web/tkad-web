import { NextRequest } from "next/server";
import { assertAdminDb, adminDbQueryFailed, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { StandaloneContractSendBody } from "@/lib/standalone-contract";
import {
  createStandaloneContractSend,
  StandaloneContractSendError,
} from "@/lib/standalone-contract-send";

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

  const parsed = StandaloneContractSendBody.safeParse(raw);
  if (!parsed.success) {
    return json(
      { error: "validation_failed", details: parsed.error.flatten() },
      400,
    );
  }

  const { force, mediaIds, draftId, ...preview } = parsed.data;

  try {
    const db = getPrisma();
    const result = await createStandaloneContractSend(
      db,
      {
        ...preview,
        mediaIds,
        draftId,
        clientEmail: preview.clientEmail.trim(),
      },
      { holdForce: force },
    );

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
    console.error("[send-from-standalone]", e);
    return adminDbQueryFailed(e);
  }
}
