import { z } from "zod";
import type { TeamMemberRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/user-session";
import { getOrCreateTeamForUser } from "@/lib/team-context";
import { canInviteMembers, isInviteRoleAllowed } from "@/lib/team-permissions";
import {
  createTeamInviteToken,
  TEAM_INVITE_TTL_DAYS,
} from "@/lib/team-invite-token";
import { prisma } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import { siteUrl } from "@/lib/seo";
import { apiError, apiOk, apiServerError, apiZodError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string().email().max(254),
  role: z.enum(["ADMIN", "PLANNER", "VIEWER"]),
  locale: z.enum(["ko", "en"]).optional().default("ko"),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    const body: unknown = await req.json().catch(() => null);
    const parsed = Body.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const ctx = await getOrCreateTeamForUser(user);
    if (!canInviteMembers(ctx.role)) {
      return apiError("FORBIDDEN", 403, {
        message: "팀원 초대 권한이 없습니다.",
      });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const role = parsed.data.role as TeamMemberRole;
    if (!isInviteRoleAllowed(role)) {
      return apiError("INVALID_ROLE", 400, {
        message: "초대할 수 없는 역할입니다.",
      });
    }

    if (email === user.email.toLowerCase()) {
      return apiError("INVALID_EMAIL", 400, {
        message: "본인 이메일은 초대할 수 없습니다.",
      });
    }

    const existingMember = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingMember) {
      const inTeam = await prisma.teamMember.findUnique({
        where: { userId: existingMember.id },
      });
      if (inTeam) {
        return apiError("ALREADY_IN_TEAM", 409, {
          message: "이미 다른 팀에 소속된 사용자입니다.",
        });
      }
    }

    const token = createTeamInviteToken();
    const expiresAt = new Date(
      Date.now() + TEAM_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await prisma.teamInvite.create({
      data: {
        teamId: ctx.team.id,
        email,
        role,
        token,
        expiresAt,
        invitedBy: user.id,
      },
    });

    const isKo = parsed.data.locale !== "en";
    const joinUrl = `${siteUrl}/${parsed.data.locale}/join?token=${encodeURIComponent(token)}`;

    let emailSent = false;
    if (isEmailConfigured()) {
      const subject = isKo
        ? `[THINKAD] ${ctx.team.name} 팀 초대`
        : `[THINKAD] Invitation to join ${ctx.team.name}`;
      const text = isKo
        ? `${user.name}님이 ${ctx.team.name} 팀에 초대했습니다.\n\n역할: ${role}\n아래 링크에서 수락해 주세요 (7일간 유효):\n${joinUrl}`
        : `${user.name} invited you to team "${ctx.team.name}" as ${role}.\n\nAccept within 7 days:\n${joinUrl}`;
      const html = `<p>${text.replace(/\n/g, "<br/>")}</p><p><a href="${joinUrl}">${joinUrl}</a></p>`;
      await sendEmail({ to: email, subject, text, html });
      emailSent = true;
    }

    return apiOk({
      email,
      role,
      joinUrl,
      emailSent,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    return apiServerError(e, "my/team/invite");
  }
}
