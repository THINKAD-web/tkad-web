import { z } from "zod";
import { getCurrentUser } from "@/lib/user-session";
import { prisma } from "@/lib/prisma";
import { apiError, apiOk, apiServerError, apiZodError } from "@/lib/api-response";
import { TEAM_ROLE_LABEL } from "@/lib/team-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostBody = z.object({
  token: z.string().min(16).max(64),
});

export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("token")?.trim();
    if (!token) {
      return apiError("MISSING_TOKEN", 400, { message: "초대 토큰이 필요합니다." });
    }

    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: { team: { select: { id: true, name: true } } },
    });

    if (!invite || invite.acceptedAt) {
      return apiError("INVALID_TOKEN", 404, {
        message: "유효하지 않거나 이미 사용된 초대입니다.",
      });
    }
    if (invite.expiresAt < new Date()) {
      return apiError("EXPIRED", 410, { message: "만료된 초대 링크입니다." });
    }

    return apiOk({
      teamName: invite.team.name,
      email: invite.email,
      role: invite.role,
      roleLabel: TEAM_ROLE_LABEL[invite.role],
      expiresAt: invite.expiresAt.toISOString(),
    });
  } catch (e) {
    return apiServerError(e, "team/join GET");
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인 후 초대를 수락할 수 있습니다.",
      });
    }

    const body: unknown = await req.json().catch(() => null);
    const parsed = PostBody.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const invite = await prisma.teamInvite.findUnique({
      where: { token: parsed.data.token },
      include: { team: true },
    });

    if (!invite || invite.acceptedAt) {
      return apiError("INVALID_TOKEN", 404, {
        message: "유효하지 않거나 이미 사용된 초대입니다.",
      });
    }
    if (invite.expiresAt < new Date()) {
      return apiError("EXPIRED", 410, { message: "만료된 초대 링크입니다." });
    }

    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return apiError("EMAIL_MISMATCH", 403, {
        message: "초대된 이메일 계정으로 로그인해 주세요.",
      });
    }

    const existing = await prisma.teamMember.findUnique({
      where: { userId: user.id },
    });
    if (existing) {
      return apiError("ALREADY_IN_TEAM", 409, {
        message: "이미 팀에 소속되어 있습니다.",
      });
    }

    await prisma.$transaction([
      prisma.teamMember.create({
        data: {
          teamId: invite.teamId,
          userId: user.id,
          role: invite.role,
          invitedAt: invite.createdAt,
          joinedAt: new Date(),
        },
      }),
      prisma.teamInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    return apiOk({
      teamId: invite.teamId,
      teamName: invite.team.name,
      role: invite.role,
    });
  } catch (e) {
    return apiServerError(e, "team/join POST");
  }
}
