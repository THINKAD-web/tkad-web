import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

/**
 * TEMPORARY diagnostic route — confirms whether Preview and Production point at the
 * same Neon database, and whether the `media_translations` migration landed.
 * Delete this file once that's confirmed (tracked in PR discussion, not meant to ship).
 *
 * Never returns the connection string or any raw host/db name — only a one-way hash,
 * so two calls can be compared for equality without leaking which DB it actually is.
 */
export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.DB_CHECK_SECRET?.trim();
  if (!secret) return false;
  const h = request.headers.get("authorization");
  return h === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    // 404, not 401 — don't confirm this route exists to unauthenticated callers.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  try {
    const prisma = getPrisma();
    const rows = await prisma.$queryRaw<{ table_exists: boolean; db_name: string }[]>`
      SELECT to_regclass('media_translations') IS NOT NULL AS table_exists,
             current_database() AS db_name
    `;
    const row = rows[0];
    const rawFingerprint = `${row?.db_name ?? ""}::${process.env.DATABASE_URL ?? ""}`;
    const dbFingerprint = createHash("sha256")
      .update(rawFingerprint)
      .digest("hex")
      .slice(0, 12);

    return NextResponse.json({
      tableExists: Boolean(row?.table_exists),
      dbFingerprint,
    });
  } catch {
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
