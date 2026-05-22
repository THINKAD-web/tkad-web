import { getCurrentUser } from "@/lib/user-session";
import { apiError } from "@/lib/api-response";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { isMediaOwnerPortalRole } from "@/lib/media-owner-role";
import {
  MEDIA_OWNER_FEE_RATE,
  calcNetFromGross,
} from "@/lib/media-owner-constants";

export async function requireMediaOwner() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false as const,
      response: apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      }),
    };
  }
  if (!isMediaOwnerPortalRole(user.role)) {
    return {
      ok: false as const,
      response: apiError("FORBIDDEN", 403, {
        message: "매체사 전용 포털입니다.",
      }),
    };
  }
  if (!isDatabaseConfigured()) {
    return {
      ok: false as const,
      response: apiError("SERVICE_UNAVAILABLE", 503),
    };
  }
  return { ok: true as const, user };
}

export async function getOwnedMediaIds(ownerUserId: string): Promise<string[]> {
  const db = getPrisma();
  const rows = await db.media.findMany({
    where: { ownerUserId },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function assertOwnsMedia(
  ownerUserId: string,
  mediaId: string,
): Promise<boolean> {
  const db = getPrisma();
  const row = await db.media.findFirst({
    where: { id: mediaId, ownerUserId },
    select: { id: true },
  });
  return !!row;
}

/** 익명 업종 라벨 (광고주명 비노출) */
export function anonymizeAdvertiserIndustry(
  clientCompany: string | null | undefined,
): string {
  const labels = [
    "F&B",
    "뷰티·헬스",
    "IT·테크",
    "금융",
    "리테일",
    "자동차",
    "엔터테인먼트",
    "기타",
  ];
  const seed = (clientCompany ?? "anonymous").trim();
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return labels[Math.abs(h) % labels.length]!;
}

export { MEDIA_OWNER_FEE_RATE, calcNetFromGross };
