import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/admin-session";
import {
  parseInquiryAdminStatusCode,
  setStoredInquiryAdminMeta,
} from "@/lib/contact-inquiry-labels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  status: z.string().min(1).optional(),
  assignee: z.string().max(120).optional(),
  note: z.string().max(4000).optional(),
  trashed: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSessionToken(token)) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED" } },
      { status: 401 },
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: { code: "DB_UNAVAILABLE" } },
      { status: 503 },
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_JSON" } },
      { status: 400 },
    );
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_INPUT" } },
      { status: 400 },
    );
  }

  const status =
    parsed.data.status == null
      ? undefined
      : parseInquiryAdminStatusCode(parsed.data.status);
  if (parsed.data.status != null && !status) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_STATUS" } },
      { status: 400 },
    );
  }
  if (
    parsed.data.status == null &&
    parsed.data.assignee === undefined &&
    parsed.data.note === undefined &&
    parsed.data.trashed === undefined
  ) {
    return NextResponse.json(
      { ok: false, error: { code: "EMPTY_PATCH" } },
      { status: 400 },
    );
  }

  const db = getPrisma();

  try {
    const current = await db.contactInquiry.findUnique({
      where: { id },
      select: { id: true, message: true },
    });

    if (!current) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND" } },
        { status: 404 },
      );
    }

    const updated = await db.contactInquiry.update({
      where: { id },
      data: {
        message: setStoredInquiryAdminMeta(current.message, {
          status,
          assignee: parsed.data.assignee,
          note: parsed.data.note,
          trashed: parsed.data.trashed,
        }),
      },
      select: { id: true, message: true },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("[admin/inquiries PATCH]", error);
    return NextResponse.json(
      { ok: false, error: { code: "UPDATE_FAILED" } },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSessionToken(token)) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED" } },
      { status: 401 },
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: { code: "DB_UNAVAILABLE" } },
      { status: 503 },
    );
  }

  const { id } = await params;
  const db = getPrisma();

  try {
    const current = await db.contactInquiry.findUnique({
      where: { id },
      select: { id: true, message: true },
    });

    if (!current) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND" } },
        { status: 404 },
      );
    }

    await db.contactInquiry.update({
      where: { id },
      data: {
        message: setStoredInquiryAdminMeta(current.message, {
          trashed: true,
        }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/inquiries DELETE]", error);
    return NextResponse.json(
      { ok: false, error: { code: "DELETE_FAILED" } },
      { status: 500 },
    );
  }
}
