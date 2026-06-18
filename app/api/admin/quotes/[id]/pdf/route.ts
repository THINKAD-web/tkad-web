import { NextRequest } from "next/server";
import { assertAdminDb } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { buildQuoteExportPayloadFromAdminQuote } from "@/lib/quote-export/build-payload";
import { buildQuotePdf } from "@/lib/quote-export/build-pdf";
import { attachmentContentDisposition } from "@/lib/content-disposition";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await ctx.params;
  const db = getPrisma();
  const q = await db.quote.findUnique({
    where: { id },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!q) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await buildQuoteExportPayloadFromAdminQuote(db, q, "basic");
    const buf = await buildQuotePdf(payload);
    const filename = `thinkad-quote-${q.quoteNumber.replace(/[^\w.-]+/g, "_")}.pdf`;
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": attachmentContentDisposition(filename),
        "Cache-Control": "no-store, private",
      },
    });
  } catch (e) {
    console.error("[admin-quotes pdf GET]", e);
    return new Response(JSON.stringify({ error: "PDF build failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
