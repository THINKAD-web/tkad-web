import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["pending", "processing", "completed"] as const;
type InquiryStatus = (typeof VALID_STATUSES)[number];

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "all";
  const search = searchParams.get("search")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  const db = getPrisma();

  const where: NonNullable<Parameters<typeof db.contactInquiry.findMany>[0]>["where"] = {};
  if (status !== "all" && VALID_STATUSES.includes(status as InquiryStatus)) {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { company: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    db.contactInquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.contactInquiry.count({ where }),
  ]);

  return json({ items, total, page, limit });
}

export async function PATCH(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const id = String(body.id ?? "").trim();
  const status = String(body.status ?? "").trim();

  if (!id) return json({ error: "id required" }, 400);
  if (!VALID_STATUSES.includes(status as InquiryStatus)) {
    return json({ error: "status must be pending | processing | completed" }, 400);
  }

  const db = getPrisma();
  try {
    const updated = await db.contactInquiry.update({
      where: { id },
      data: { status },
    });
    return json({ item: updated });
  } catch {
    return json({ error: "Inquiry not found" }, 404);
  }
}
