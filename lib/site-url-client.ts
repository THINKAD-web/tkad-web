/** 클라이언트 전용 사이트 URL (서버/Prisma 의존 없음) */
export function getClientSiteUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/$/, "") ||
    "https://app.tkad.co.kr"
  );
}
