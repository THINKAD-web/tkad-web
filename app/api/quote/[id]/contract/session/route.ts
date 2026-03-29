import { NextRequest, NextResponse } from "next/server";
import { OoHQuoteStatus, OohContractStatus } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { ensureOohContractExists } from "@/lib/ooh-contract-ensure";
import { loadOoHQuoteForContract } from "@/lib/ooh-contract-context";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 40, windowMs: 60_000 });
const CUID_RE = /^c[a-z0-9]{24,}$/i;

const VIEW_STATUSES: OoHQuoteStatus[] = [
  OoHQuoteStatus.booking_confirmed,
  OoHQuoteStatus.invoice_sent,
  OoHQuoteStatus.payment_pending,
  OoHQuoteStatus.payment_confirmed,
  OoHQuoteStatus.contract_confirmed,
  OoHQuoteStatus.in_progress,
  OoHQuoteStatus.completed,
];

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, private");
  return NextResponse.json(body, { ...init, headers });
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (!limiter.check(ip))
    return json({ error: "Too many requests" }, { status: 429 });

  const { id } = await ctx.params;
  if (!id || !CUID_RE.test(id))
    return json({ error: "Not found" }, { status: 404 });
  if (!isDatabaseConfigured())
    return json({ error: "Unavailable" }, { status: 503 });

  const db = getPrisma();
  const row = await loadOoHQuoteForContract(db, id);
  if (!row) return json({ error: "Not found" }, { status: 404 });

  if (!VIEW_STATUSES.includes(row.status)) {
    return json(
      { error: "Contract not available at this stage" },
      { status: 403 },
    );
  }

  await ensureOohContractExists(db, id, row.status);
  const fresh = await loadOoHQuoteForContract(db, id);
  if (!fresh) return json({ error: "Not found" }, { status: 404 });

  const c = fresh.oohContract;
  const canSign =
    fresh.status === OoHQuoteStatus.booking_confirmed &&
    c?.status === OohContractStatus.pending;
  const signed =
    c?.status === OohContractStatus.signed ||
    c?.status === OohContractStatus.confirmed;

  return json({
    quoteId: fresh.id,
    clientName: fresh.clientName,
    clientEmail: fresh.clientEmail,
    clientCompany: fresh.clientCompany,
    locale: fresh.locale,
    contractStatus: c?.status ?? null,
    canSign,
    signed,
  });
}
