import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export type ChatbotStatus = "active" | "maintenance";
const KEY = "chatbot_status";

/** 환경변수 강제 점검 스위치 — 마이그레이션/DB 없이도 즉시 중단 가능 */
function envForcedMaintenance(): boolean {
  const v = process.env.CHATBOT_MAINTENANCE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "maintenance" || v === "on";
}

/** 현재 챗봇 상태. env 강제 > DB 설정 > 기본 active. 테이블 없음 등은 active 폴백. */
export async function getChatbotStatus(): Promise<ChatbotStatus> {
  if (envForcedMaintenance()) return "maintenance";
  if (!isDatabaseConfigured()) return "active";
  try {
    const row = await getPrisma().siteSetting.findUnique({ where: { key: KEY } });
    return row?.value === "maintenance" ? "maintenance" : "active";
  } catch {
    return "active";
  }
}

export async function setChatbotStatus(status: ChatbotStatus): Promise<void> {
  const db = getPrisma();
  await db.siteSetting.upsert({
    where: { key: KEY },
    update: { value: status },
    create: { key: KEY, value: status },
  });
}
