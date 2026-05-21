import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { runOpsEnvCheck } from "@/lib/ops-env-check";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const result = runOpsEnvCheck();
  return json({
    success: result.missingRequired.length === 0,
    ...result,
    checkedAt: new Date().toISOString(),
  });
}
