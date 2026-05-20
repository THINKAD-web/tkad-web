import { getCurrentUser } from "@/lib/user-session";
import { getPrisma } from "@/lib/prisma";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";
import { isWebPushConfigured } from "@/lib/web-push";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!isWebPushConfigured()) {
      return apiError("PUSH_DISABLED", 503, {
        message: "Web Push is not configured",
      });
    }
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    const body = (await req.json()) as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    const endpoint = String(body.endpoint ?? "").trim();
    const p256dh = String(body.keys?.p256dh ?? "").trim();
    const auth = String(body.keys?.auth ?? "").trim();
    if (!endpoint || !p256dh || !auth) {
      return apiError("INVALID_BODY", 400);
    }

    const db = getPrisma();
    const ua = req.headers.get("user-agent")?.slice(0, 300) ?? null;
    await db.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: user.id, endpoint, p256dh, auth, userAgent: ua },
      update: { userId: user.id, p256dh, auth, userAgent: ua },
    });

    return apiOk({ subscribed: true });
  } catch (e) {
    return apiServerError(e, "push/subscribe");
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401);
    }
    let endpoint: string | undefined;
    try {
      const body = await req.json();
      endpoint = String(body?.endpoint ?? "").trim() || undefined;
    } catch {
      /* no body */
    }
    const db = getPrisma();
    if (endpoint) {
      await db.pushSubscription.deleteMany({
        where: { userId: user.id, endpoint },
      });
    } else {
      await db.pushSubscription.deleteMany({ where: { userId: user.id } });
    }
    return apiOk({ unsubscribed: true });
  } catch (e) {
    return apiServerError(e, "push/unsubscribe");
  }
}
