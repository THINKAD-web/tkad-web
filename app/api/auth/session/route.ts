import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ ok: true, data: user });
}
