import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  readJson,
} from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      });
    }
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        company: true,
        locale: true,
        role: true,
        communityRole: true,
        communityBio: true,
        region: true,
        emailVerifiedAt: true,
        createdAt: true,
        oauthAccounts: {
          select: { provider: true, providerEmail: true, providerName: true, createdAt: true },
        },
      },
    });
    if (!row) return apiError("USER_NOT_FOUND", 404);
    return apiOk(row);
  } catch (e) {
    return apiServerError(e, "auth/profile/get");
  }
}

const PatchBody = z.object({
  name: z.string().min(1).max(40).optional(),
  phone: z.string().max(20).nullable().optional(),
  company: z.string().max(80).nullable().optional(),
  locale: z.enum(["ko", "en", "zh", "ja"]).optional(),
  communityBio: z.string().max(500).nullable().optional(),
  region: z.string().max(40).nullable().optional(),
  email: z.string().email().max(254).optional(),
});

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      });
    }
    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);

    const parsed = PatchBody.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const { name, phone, company, locale, communityBio, region, email } =
      parsed.data;

    // 이메일 변경 시 중복 체크
    if (email && email !== user.email) {
      const exists = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (exists && exists.id !== user.id) {
        return apiError("EMAIL_IN_USE", 409, {
          message: "이미 사용 중인 이메일입니다.",
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(company !== undefined && { company: company || null }),
        ...(locale !== undefined && { locale }),
        ...(communityBio !== undefined && { communityBio: communityBio || null }),
        ...(region !== undefined && { region: region || null }),
        ...(email !== undefined && { email }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        company: true,
        locale: true,
        role: true,
        communityRole: true,
        communityBio: true,
        region: true,
        emailVerifiedAt: true,
      },
    });
    return apiOk(updated);
  } catch (e) {
    return apiServerError(e, "auth/profile/patch");
  }
}
