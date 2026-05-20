import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import {
  getMediaApplicationAdminEmail,
  getMediaApplicationConfirmationEmail,
} from "@/lib/email/media-application-notify";
import { parseMediaApplicationSubmit } from "@/lib/media-application";
import { geocodeAddressWithKakao } from "@/lib/kakao-address-geocode";
import { getCurrentUser } from "@/lib/user-session";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 5, windowMs: 60_000 });

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

  if (!limiter.check(ip)) {
    return json({ error: "Too many requests" }, { status: 429 });
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

  return json({ success: true, id: app.id }, { status: 201 });
}
