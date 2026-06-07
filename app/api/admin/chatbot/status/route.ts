import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getChatbotStatus, setChatbotStatus } from "@/lib/chatbot-status";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = assertAdminDb(request);
  if (denied) return denied;
  return json({ status: await getChatbotStatus() });
}

export async function POST(request: NextRequest) {
  const denied = assertAdminDb(request);
  if (denied) return denied;

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    /* ignore */
  }
  const status =
    (body as { status?: string } | null)?.status === "maintenance"
      ? "maintenance"
      : "active";

  try {
    await setChatbotStatus(status);
    return json({ ok: true, status });
  } catch (e) {
    console.error("[admin chatbot status] save failed", e instanceof Error ? e.message : e);
    return json(
      { ok: false, error: "저장 실패 — site_settings 테이블 마이그레이션이 필요할 수 있습니다." },
      500,
    );
  }
}
