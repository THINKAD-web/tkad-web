import type { PrismaClient } from "@prisma/client";

/**
 * 오늘(UTC YYYYMMDD) 기준 `Q-YYYYMMDD-NNNN` (4자리 일련) 다음 번호.
 * 동시에 두 건이 같은 "다음"을 쓰면 `quote` unique(@quoteNumber) 충돌 → 호출 측에서 한 번 재시도.
 */
export async function generateNextAdminQuoteNumber(
  db: PrismaClient,
): Promise<string> {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `Q-${ymd}-`;

  const last = await db.quote.findFirst({
    where: { quoteNumber: { startsWith: prefix } },
    orderBy: { quoteNumber: "desc" },
    select: { quoteNumber: true },
  });

  let n = 1;
  if (last?.quoteNumber) {
    const m = /^Q-\d{8}-(\d{1,4})$/.exec(last.quoteNumber);
    if (m) n = parseInt(m[1]!, 10) + 1;
  }
  if (n > 9999) {
    throw new Error("quote number daily sequence overflow");
  }
  return `${prefix}${String(n).padStart(4, "0")}`;
}
