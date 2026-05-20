import { z } from "zod";
import { getCurrentUser } from "@/lib/user-session";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  readJson,
} from "@/lib/api-response";
import { consumeFreePlannerPdf } from "@/lib/report-access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().max(254),
});

/** 플래너 PDF 1회 무료 — 이메일 리드 수집 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);
    const parsed = Body.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const ok = await consumeFreePlannerPdf(user.id);
    if (!ok) {
      return apiError("LIMIT_REACHED", 403, {
        message: "무료 다운로드 한도를 초과했습니다.",
      });
    }

    await prisma.newsletterSubscriber.upsert({
      where: { email: parsed.data.email },
      create: { email: parsed.data.email, userId: user.id, source: "planner_pdf_lead" },
      update: { userId: user.id },
    });

    return apiOk({ ok: true, freeDownloadGranted: true });
  } catch (e) {
    return apiServerError(e, "subscriptions/planner-lead");
  }
}
