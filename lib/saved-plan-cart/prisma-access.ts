import type { PrismaClient } from "@prisma/client";
import { getPrisma, refreshPrismaClient } from "@/lib/prisma";

export class SavedPlanCartUnavailableError extends Error {
  constructor() {
    super("SAVED_PLAN_CART_UNAVAILABLE");
    this.name = "SavedPlanCartUnavailableError";
  }
}

/** SavedPlanCart delegate 가 없으면 dev 에서 한 번 캐시 갱신 후 재시도 */
export function getPrismaForSavedPlanCart(): PrismaClient {
  let db = getPrisma();
  if (db.savedPlanCart) return db;

  db = refreshPrismaClient();
  if (db.savedPlanCart) return db;

  throw new SavedPlanCartUnavailableError();
}

export function savedPlanCartUnavailableMessage(isKo: boolean): string {
  if (process.env.NODE_ENV === "production") {
    return isKo
      ? "저장 기능이 아직 배포되지 않았습니다. 잠시 후 다시 시도해주세요."
      : "Save is not available on this deployment yet. Please try again later.";
  }
  return isKo
    ? "저장 기능을 적용 중입니다. 터미널에서 npm run dev 를 재시작한 뒤 다시 시도해주세요."
    : "Applying save feature. Restart `npm run dev` and try again.";
}
