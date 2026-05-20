import { cookies } from "next/headers";
import {
  AB_COOKIE_NAME,
  isAbVariant,
  type AbVariant,
} from "@/lib/ab-testing";
import { getForcedAbVariant } from "@/lib/ab-test-db";

/** 서버 컴포넌트 — DB 승자 고정 우선, 없으면 쿠키 */
export async function getServerAbVariant(): Promise<AbVariant> {
  const forced = await getForcedAbVariant();
  if (forced) return forced;

  const jar = await cookies();
  const cookie = jar.get(AB_COOKIE_NAME)?.value;
  if (isAbVariant(cookie)) return cookie;
  return "a";
}
