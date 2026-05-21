import { NextRequest } from "next/server";
import { academyWebinars } from "@/lib/academy-content";
import { json } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { isMissingContentTableError } from "@/lib/prisma-content-guards";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return json({ error: "Database not configured" }, 503);
  }

  let body: {
    webinarId?: string;
    email?: string;
    name?: string;
    company?: string;
    locale?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const webinarId = body.webinarId?.trim();
  const email = body.email?.trim().toLowerCase();
  if (!webinarId || !email || !email.includes("@")) {
    return json({ error: "webinarId and valid email required" }, 400);
  }

  const webinar = academyWebinars.find((w) => w.id === webinarId);
  if (!webinar) {
    return json({ error: "Unknown webinar" }, 404);
  }

  try {
    const db = getPrisma();
    await db.academyWebinarRegistration.create({
      data: {
        webinarId,
        email,
        name: body.name?.trim() || null,
        company: body.company?.trim() || null,
        locale: body.locale?.trim()?.slice(0, 8) || null,
      },
    });
    return json({ ok: true, webinarId }, 201);
  } catch (e) {
    if (isMissingContentTableError(e)) {
      return json({ error: "Registration storage not ready" }, 503);
    }
    console.error("[academy/webinar-register]", e);
    return json({ error: "Registration failed" }, 500);
  }
}
