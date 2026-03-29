import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const admin = verifyAdminSessionToken(token);
  return NextResponse.json(
    { admin },
    {
      headers: { "Cache-Control": "no-store, private" },
    },
  );
}
