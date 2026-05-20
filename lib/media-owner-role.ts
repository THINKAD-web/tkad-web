/**
 * 매체사 포털 접근 역할.
 * 가입 시 `MEDIA_OWNER` 선택 → Prisma `User.role` = `owner` (AppUserRole).
 */
export function isMediaOwnerPortalRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}
