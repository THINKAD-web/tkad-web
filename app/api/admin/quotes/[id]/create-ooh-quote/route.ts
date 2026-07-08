import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { createOoHQuoteFromAdminQuote } from "@/lib/admin-quote-to-ooh-create";
import { summarizeAdminQuoteBridge } from "@/lib/admin-quote-to-ooh";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await ctx.params;
  const db = getPrisma();
  const quote = await db.quote.findUnique({
    where: { id },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!quote) return json({ error: "Not found" }, 404);

  const existing = await db.ooHQuote.findUnique({
    where: { sourceAdminQuoteId: id },
    select: { id: true },
  });

  return json({
    summary: summarizeAdminQuoteBridge(quote),
    existingOohQuoteId: existing?.id ?? null,
  });
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await ctx.params;
  const db = getPrisma();

  try {
    const result = await createOoHQuoteFromAdminQuote(db, id);
    return json({
      oohQuoteId: result.oohQuoteId,
      created: result.created,
      totalAmountManwon: result.bridge.totalAmountManwon,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === "NOT_FOUND") return json({ error: "Not found" }, 404);
    if (msg === "CLIENT_EMAIL_REQUIRED") {
      return json(
        { error: "고객 이메일이 필요합니다. 견적에 이메일을 입력한 뒤 다시 시도하세요." },
        400,
      );
    }
    if (msg.includes("mismatch") || msg.includes("no line items")) {
      return json({ error: msg }, 409);
    }
    console.error("[create-ooh-quote]", e);
    return json({ error: "Create failed" }, 500);
  }
}
