import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CUID_RE = /^c[a-z0-9]{24,}$/i;

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!isDatabaseConfigured() || !CUID_RE.test(id)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const db = getPrisma();
  const row = await db.successCase.findFirst({
    where: { id, status: "published" },
    select: { id: true, titleKo: true, titleEn: true, clientName: true },
  });
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(row);
}
