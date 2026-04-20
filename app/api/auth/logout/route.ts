import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE,
  revokeSessionByToken,
} from "@/lib/user-session";

export const runtime = "nodejs";

export async function POST() {
  const c = await cookies();
  const token = c.get(USER_SESSION_COOKIE)?.value;
  if (token) {
    await revokeSessionByToken(token);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(USER_SESSION_COOKIE);
  return res;
}
