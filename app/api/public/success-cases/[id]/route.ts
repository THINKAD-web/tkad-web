import { getPublishedSuccessCaseById } from "@/lib/public-content-queries";

export const dynamic = "force-dynamic";

const CUID_RE = /^c[a-z0-9]{24,}$/i;

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!CUID_RE.test(id)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const detail = await getPublishedSuccessCaseById(id);
  if (!detail) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({
    id: detail.id,
    titleKo: detail.titleKo,
    titleEn: detail.titleEn,
    clientName: detail.clientName,
  });
}
