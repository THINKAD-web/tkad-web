import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export async function recordOutreachRegistration(
  outreachToken: string,
): Promise<void> {
  if (!isDatabaseConfigured() || !outreachToken.trim()) return;
  const db = getPrisma();
  await db.potentialMedia.updateMany({
    where: { outreachToken: outreachToken.trim() },
    data: {
      outreachStatus: "REGISTERED",
      registeredAt: new Date(),
    },
  });
}
