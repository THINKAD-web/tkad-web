import type { TeamMemberRole } from "@prisma/client";

export type { TeamMemberRole };

export const TEAM_ROLE_LABEL: Record<
  TeamMemberRole,
  { ko: string; en: string }
> = {
  OWNER: { ko: "소유자", en: "Owner" },
  ADMIN: { ko: "관리자", en: "Admin" },
  PLANNER: { ko: "플래너", en: "Planner" },
  VIEWER: { ko: "뷰어", en: "Viewer" },
};

/** 팀 설정·초대·멤버 제거 */
export function canManageTeam(role: TeamMemberRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** 역할 변경 — OWNER 전용 */
export function canChangeMemberRoles(role: TeamMemberRole): boolean {
  return role === "OWNER";
}

export function canInviteMembers(role: TeamMemberRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** 플래너·크리에이티브·견적 요청 */
export function canUsePlannerFeatures(role: TeamMemberRole): boolean {
  return role !== "VIEWER";
}

/** 팀 공유 플랜 편집 */
export function canEditTeamPlanner(role: TeamMemberRole): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "PLANNER";
}

/** 조회 전용 — 문의·결제 불가 */
export function canContactOrPay(role: TeamMemberRole): boolean {
  return role !== "VIEWER";
}

export function isInviteRoleAllowed(role: TeamMemberRole): boolean {
  return role === "ADMIN" || role === "PLANNER" || role === "VIEWER";
}
