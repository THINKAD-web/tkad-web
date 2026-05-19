import type { Team, TeamMember, TeamMemberRole, User } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export type TeamContext = {
  team: Team;
  membership: TeamMember;
  role: TeamMemberRole;
};

export async function getTeamMembershipForUser(
  userId: string,
): Promise<TeamContext | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getPrisma();
  const membership = await db.teamMember.findUnique({
    where: { userId },
    include: { team: true },
  });
  if (!membership) return null;
  return {
    team: membership.team,
    membership,
    role: membership.role,
  };
}

/** 팀이 없으면 기본 팀 생성 (단일 팀·OWNER) */
export async function getOrCreateTeamForUser(
  user: Pick<User, "id" | "name" | "email">,
): Promise<TeamContext> {
  const existing = await getTeamMembershipForUser(user.id);
  if (existing) return existing;

  const db = getPrisma();
  const team = await db.team.create({
    data: {
      name: `${user.name}의 팀`,
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
          joinedAt: new Date(),
        },
      },
    },
    include: {
      members: { where: { userId: user.id } },
    },
  });

  const membership = team.members[0];
  return { team, membership, role: membership.role };
}

export async function getTeamMemberUserIds(teamId: string): Promise<string[]> {
  const db = getPrisma();
  const rows = await db.teamMember.findMany({
    where: { teamId },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}
