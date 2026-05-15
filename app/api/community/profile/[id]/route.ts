import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateCommunityMemberProfile } from "@/lib/community/queries";
import { COMMUNITY_LIMITS } from "@/lib/community/types";
import { readJson } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/user-session";

export const dynamic = "force-dynamic";

const PatchBody = z.object({
  name: z.string().min(1).max(40),
  company: z.string().max(80).optional(),
  bio: z.string().max(COMMUNITY_LIMITS.PROFILE_BIO_MAX).optional(),
  region: z.string().max(COMMUNITY_LIMITS.PROFILE_REGION_MAX).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: targetUserId } = await params;
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json(
      { ok: false, error: "로그인 후 프로필을 수정할 수 있습니다." },
      { status: 401 },
    );
  }
  if (me.id !== targetUserId) {
    return NextResponse.json(
      { ok: false, error: "다른 멤버의 프로필은 수정할 수 없습니다.", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const body = await readJson(req);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "입력값을 확인해주세요.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const name = parsed.data.name.trim();
  const company = (parsed.data.company ?? "").trim() || null;
  const bio = (parsed.data.bio ?? "").trim() || null;
  const region = (parsed.data.region ?? "").trim() || null;

  const result = await updateCommunityMemberProfile({
    actorUserId: me.id,
    targetUserId,
    name,
    company,
    bio,
    region,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "수정 권한이 없습니다.", code: result.code },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true });
}
