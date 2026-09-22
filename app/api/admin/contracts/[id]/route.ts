import { NextRequest } from "next/server";
import { assertAdminDb, adminDbQueryFailed, json } from "@/lib/admin-guard";
import {
  AdminContractDeleteError,
  deleteAdminOohContractByContractId,
} from "@/lib/admin-ooh-contract-delete";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id: contractId } = await params;
  let acknowledgeSigned = false;
  try {
    const raw = await request.json();
    if (
      raw &&
      typeof raw === "object" &&
      (raw as { acknowledgeSigned?: unknown }).acknowledgeSigned === true
    ) {
      acknowledgeSigned = true;
    }
  } catch {
    /* empty body */
  }

  try {
    const db = getPrisma();
    const result = await deleteAdminOohContractByContractId(db, contractId, {
      acknowledgeSigned,
    });
    return json({ ok: true, quoteId: result.quoteId });
  } catch (e) {
    if (e instanceof AdminContractDeleteError) {
      if (e.code === "not_found") {
        return json({ error: e.code }, 404);
      }
      return json({ error: e.code, code: e.code }, 409);
    }
    console.error("[admin/contracts DELETE]", e);
    return adminDbQueryFailed(e);
  }
}
