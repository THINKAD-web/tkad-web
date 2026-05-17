import { NextRequest } from "next/server";
import { assertAdminDb, adminDbQueryFailed, json } from "@/lib/admin-guard";
import { approveMediaApplication } from "@/lib/media-application-approve";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  try {
    const result = await approveMediaApplication(id);
    return json({ ok: true, ...result });
  } catch (e) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code?: string }).code)
        : "";
    if (code.startsWith("P")) {
      return adminDbQueryFailed(e);
    }
    const message = e instanceof Error ? e.message : "Approve failed";
    return json({ error: message }, 400);
  }
}
