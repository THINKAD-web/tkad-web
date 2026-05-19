import { z } from "zod";
import { getCurrentUser } from "@/lib/user-session";
import { getOrCreateTeamForUser } from "@/lib/team-context";
import {
  canChangeMemberRoles,
  canManageTeam,
  TEAM_ROLE_LABEL,
} from "@/lib/team-permissions";
import { prisma } from "@/lib/prisma";
import { apiError, apiOk, apiServerError, apiZodError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchBody = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    const ctx = await getOrCreateTeamForUser(user);
    const members = await prisma.teamMember.findMany({
      where: { teamId: ctx.team.id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });

    return apiOk({
      team: {
        id: ctx.team.id,
        name: ctx.team.name,
        ownerId: ctx.team.ownerId,
        createdAt: ctx.team.createdAt.toISOString(),
      },
      myRole: ctx.role,
      permissions: {
        canManageTeam: canManageTeam(ctx.role),
        canChangeRoles: canChangeMemberRoles(ctx.role),
        canInvite: canManageTeam(ctx.role),
        canUsePlanner: ctx.role !== "VIEWER",
        canContactOrPay: ctx.role !== "VIEWER",
      },
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        roleLabel: TEAM_ROLE_LABEL[m.role],
        invitedAt: m.invitedAt?.toISOString() ?? null,
        joinedAt: m.joinedAt.toISOString(),
        isOwner: m.userId === ctx.team.ownerId,
      })),
    });
  } catch (e) {
    return apiServerError(e, "my/team GET");
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    const body: unknown = await req.json().catch(() => null);
    const parsed = PatchBody.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const ctx = await getOrCreateTeamForUser(user);
    if (!canManageTeam(ctx.role)) {
      return apiError("FORBIDDEN", 403, {
        message: "팀 이름 변경 권한이 없습니다.",
      });
    }

    const team = await prisma.team.update({
      where: { id: ctx.team.id },
      data: { name: parsed.data.name },
    });

    return apiOk({
      team: {
        id: team.id,
        name: team.name,
      },
    });
  } catch (e) {
    return apiServerError(e, "my/team PATCH");
  }
}
