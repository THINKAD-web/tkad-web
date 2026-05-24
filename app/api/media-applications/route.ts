import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verifyTurnstileForRequest } from "@/lib/turnstile-verify";
import { postInternalAlert } from "@/lib/internal-webhook";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import {
  getMediaApplicationAdminEmail,
  getMediaApplicationConfirmationEmail,
} from "@/lib/email/media-application-notify";
import { parseMediaApplicationSubmit } from "@/lib/media-application";
import { geocodeAddressWithKakao } from "@/lib/kakao-address-geocode";
import { getCurrentUser } from "@/lib/user-session";
import { notifySlackMediaApplication } from "@/lib/media-application-slack";
import { recordOutreachRegistration } from "@/lib/media-owner-outreach-register";

export const dynamic = "force-dynamic";

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store, private", ...init?.headers },
  });
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const rl = await enforceRateLimit("mediaRegister", ip);
  if (!rl.ok) {
    return json({ error: rl.message }, { status: rl.status });
  }

  if (!isDatabaseConfigured()) {
    return json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    raw &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    (raw as { website?: string }).website
  ) {
    return json({ success: true, id: "ok" }, { status: 201 });
  }

  const turnstileToken =
    typeof raw === "object" && raw && !Array.isArray(raw)
      ? ((raw as Record<string, unknown>).turnstileToken as string | undefined) ??
        ((raw as Record<string, unknown>).captchaToken as string | undefined)
      : undefined;

  const turnstile = await verifyTurnstileForRequest({
    token: turnstileToken,
    remoteip: ip,
    host: request.headers.get("host"),
  });
  if (!turnstile.ok) {
    console.warn("[media-applications] turnstile_failed", turnstile.reason, { ip });
    void postInternalAlert({
      type: "security_turnstile",
      title: "Media register Turnstile 실패",
      body: `reason=${turnstile.reason} ip=${ip}`,
    }).catch(() => {});
    return json({ error: "보안 확인이 필요합니다." }, { status: 401 });
  }

  const parsed = parseMediaApplicationSubmit(raw);
  if (!parsed.ok) {
    return json(
      { error: parsed.error, fields: parsed.fields },
      { status: 400 },
    );
  }

  const d = parsed.data;
  let latitude = d.latitude ?? null;
  let longitude = d.longitude ?? null;
  let city = d.city ?? null;
  let district = d.district ?? null;

  const fullQuery = [d.address, d.addressDetail].filter(Boolean).join(" ");
  if ((!latitude || !longitude) && fullQuery) {
    const geo = await geocodeAddressWithKakao(fullQuery);
    if (geo) {
      latitude = geo.latitude;
      longitude = geo.longitude;
      city = city || geo.city;
      district = district || geo.district;
    }
  }

  const me = await getCurrentUser();
  const submitUserId =
    me && (me.role === "owner" || me.role === "admin") ? me.id : null;

  let app;
  try {
    const db = getPrisma();
    app = await db.mediaApplication.create({
      data: {
        userId: submitUserId,
        companyName: d.companyName,
        contactName: d.contactName,
        contactPhone: d.contactPhone,
        contactEmail: d.contactEmail,
        mediaName: d.mediaName,
        mediaType: d.mediaType,
        address: d.address,
        addressDetail: d.addressDetail ?? null,
        zonecode: d.zonecode ?? null,
        latitude,
        longitude,
        city,
        district,
        widthCm: d.widthCm != null ? Math.round(d.widthCm) : null,
        heightCm: d.heightCm != null ? Math.round(d.heightCm) : null,
        isDigital: d.isDigital,
        operatingHours: d.operatingHours ?? null,
        hasLighting: d.hasLighting,
        dailyFootfall:
          d.dailyFootfall != null ? Math.round(d.dailyFootfall) : null,
        monthlyPrice: Math.round(d.monthlyPrice),
        minFlightDays:
          d.minFlightDays != null ? Math.round(d.minFlightDays) : null,
        photoFrontUrl: d.photoFrontUrl,
        photoSideUrl: d.photoSideUrl,
        photoNightUrl: d.photoNightUrl,
        notes: d.notes ?? null,
        submitterIp: ip,
      },
    });
  } catch (e) {
    console.error("[media-applications] create failed", e);
    return json({ error: "database_error" }, { status: 503 });
  }

  const locale =
    typeof raw === "object" &&
    raw &&
    (raw as { locale?: string }).locale === "en"
      ? "en"
      : "ko";

  if (isEmailConfigured()) {
    const alertTo =
      process.env.CONTACT_ALERT_EMAIL?.trim() || "sales@tkad.co.kr";
    const adminMail = getMediaApplicationAdminEmail(app);
    try {
      await sendEmail({
        to: alertTo,
        subject: adminMail.subject,
        text: adminMail.text,
        html: adminMail.html,
      });
    } catch (e) {
      console.error("[media-applications] admin email", e);
    }
    const confirm = getMediaApplicationConfirmationEmail(app, locale === "ko");
    try {
      await sendEmail({
        to: d.contactEmail,
        subject: confirm.subject,
        text: confirm.text,
        html: confirm.html,
      });
    } catch (e) {
      console.error("[media-applications] confirm email", e);
    }
  }

  void notifySlackMediaApplication(app).catch((e) =>
    console.error("[media-applications] slack", e),
  );

  const outreachToken =
    typeof raw === "object" &&
    raw &&
    typeof (raw as { outreachToken?: string }).outreachToken === "string"
      ? (raw as { outreachToken: string }).outreachToken.trim()
      : "";
  if (outreachToken) {
    void recordOutreachRegistration(outreachToken).catch((e) =>
      console.error("[media-applications] outreach", e),
    );
  }

  return json({ success: true, id: app.id }, { status: 201 });
}
