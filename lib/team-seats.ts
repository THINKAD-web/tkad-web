import { prisma } from "@/lib/prisma";
import { teamSeatLimitForPlan } from "@/lib/plan-check-shared";

/** 팀 사용 좌석 = 멤버 수 + 미수락·미만료 초대 */
export async function countTeamOccupiedSeats(teamId: string): Promise<number> {
  const now = new Date();
  const [members, pendingInvites] = await Promise.all([
    prisma.teamMember.count({ where: { teamId } }),
    prisma.teamInvite.count({
      where: {
        teamId,
        acceptedAt: null,
        expiresAt: { gt: now },
      },
    }),
  ]);
  return members + pendingInvites;
}

export async function getTeamSeatQuota(opts: {
  teamId: string;
  ownerUserId: string;
}): Promise<{
  occupied: number;
  limit: number;
  plan: string;
  canInvite: boolean;
}> {
  const owner = await prisma.user.findUnique({
    where: { id: opts.ownerUserId },
    select: { plan: true },
  });
  const plan = owner?.plan ?? "FREE";
  const limit = teamSeatLimitForPlan(plan);
  const occupied = await countTeamOccupiedSeats(opts.teamId);
  return {
    occupied,
    limit,
    plan,
    canInvite: occupied < limit,
  };
}

/** 초대 전 좌석 검증 — 여유 없으면 메시지와 함께 throw하지 않고 결과 반환 */
export async function assertTeamHasInviteSeat(opts: {
  teamId: string;
  ownerUserId: string;
}): Promise<
  | { ok: true; occupied: number; limit: number }
  | { ok: false; occupied: number; limit: number; plan: string }
> {
  const quota = await getTeamSeatQuota(opts);
  if (!quota.canInvite) {
    return {
      ok: false,
      occupied: quota.occupied,
      limit: quota.limit,
      plan: quota.plan,
    };
  }
  return { ok: true, occupied: quota.occupied, limit: quota.limit };
}
