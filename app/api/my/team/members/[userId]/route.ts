import { z } from "zod";
import type { TeamMemberRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/user-session";
import { getTeamMembershipForUser } from "@/lib/team-context";
import {
  canChangeMemberRoles,
  canManageTeam,
  isInviteRoleAllowed,
} from "@/lib/team-permissions";
import { prisma } from "@/lib/prisma";
import { apiError, apiOk, apiServerError, apiZodError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ userId: string }> };

const PatchBody = z.object({
  role: z.enum(["ADMIN", "PLANNER", "VIEWER"]),
});

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    const { userId } = await params;
    const ctx = await getTeamMembershipForUser(user.id);
    if (!ctx) {
      return apiError("NO_TEAM", 404, { message: "팀이 없습니다." });
    }
    if (!canChangeMemberRoles(ctx.role)) {
      return apiError("FORBIDDEN", 403, {
        message: "역할 변경은 팀 소유자만 가능합니다.",
      });
    }

    const body: unknown = await req.json().catch(() => null);
    const parsed = PatchBody.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const role = parsed.data.role as TeamMemberRole;
    if (!isInviteRoleAllowed(role)) {
      return apiError("INVALID_ROLE", 400, { message: "유효하지 않은 역할입니다." });
    }

    if (userId === ctx.team.ownerId) {
      return apiError("FORBIDDEN", 403, {
        message: "팀 소유자의 역할은 변경할 수 없습니다.",
      });
    }

    const target = await prisma.teamMember.findFirst({
      where: { teamId: ctx.team.id, userId },
    });
    if (!target) {
      return apiError("NOT_FOUND", 404, { message: "팀원을 찾을 수 없습니다." });
    }

    const updated = await prisma.teamMember.update({
      where: { id: target.id },
      data: { role },
    });

    return apiOk({ userId: updated.userId, role: updated.role });
  } catch (e) {
    return apiServerError(e, "my/team/members PATCH");
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    const { userId } = await params;
    const ctx = await getTeamMembershipForUser(user.id);
    if (!ctx) {
      return apiError("NO_TEAM", 404, { message: "팀이 없습니다." });
    }
    if (!canManageTeam(ctx.role)) {
      return apiError("FORBIDDEN", 403, {
        message: "팀원 제거 권한이 없습니다.",
      });
    }

    if (userId === ctx.team.ownerId) {
      return apiError("FORBIDDEN", 403, {
        message: "팀 소유자는 제거할 수 없습니다.",
      });
    }

    if (userId === user.id && ctx.role !== "OWNER") {
      return apiError("FORBIDDEN", 403, {
        message: "본인을 제거하려면 팀 나가기를 이용해 주세요.",
      });
    }

    const target = await prisma.teamMember.findFirst({
      where: { teamId: ctx.team.id, userId },
    });
    if (!target) {
      return apiError("NOT_FOUND", 404, { message: "팀원을 찾을 수 없습니다." });
    }

    await prisma.teamMember.delete({ where: { id: target.id } });

    return apiOk({ removed: userId });
  } catch (e) {
    return apiServerError(e, "my/team/members DELETE");
  }
}
