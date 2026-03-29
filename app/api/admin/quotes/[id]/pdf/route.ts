import { NextRequest } from "next/server";
import { assertAdminDb } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { adminFormalQuotePdfBuffer } from "@/lib/build-admin-formal-quote-pdf";
import { quoteToPdfParams } from "@/lib/admin-sales-quote";
import { loadThinkadLogoDataUrl } from "@/lib/quote-pdf-assets";

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

  const logo = loadThinkadLogoDataUrl();
  const params = quoteToPdfParams(q, { logoDataUrl: logo });
  try {
    const buf = await adminFormalQuotePdfBuffer(params);
    const filename = `thinkad-quote-${q.quoteNumber.replace(/[^\w.-]+/g, "_")}.pdf`;
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
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
