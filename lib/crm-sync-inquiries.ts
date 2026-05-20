import { getPrisma } from "@/lib/prisma";

/** 최근 문의를 CRM 계정으로 동기화 (이메일 기준) */
export async function syncRecentInquiriesToCrm(limit = 80) {
  const db = getPrisma();
  const inquiries = await db.contactInquiry.findMany({
    where: { email: { not: null } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  let upserted = 0;
  for (const inq of inquiries) {
    const email = inq.email?.trim().toLowerCase();
    if (!email) continue;
    await db.crmAccount.upsert({
      where: { email },
      create: {
        email,
        company: inq.company,
        name: inq.name,
        phone: inq.phone,
        firstInquiryAt: inq.createdAt,
        lastContactAt: inq.createdAt,
        pipelineStage: "new_inquiry",
      },
      update: {},
    });
    upserted += 1;
  }
  return upserted;
}
