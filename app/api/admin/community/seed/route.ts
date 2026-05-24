import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { seedCommunityPosts } from "@/lib/community/seed-posts";

export const dynamic = "force-dynamic";

/** POST /api/admin/community/seed — 운영팀 시딩 콘텐츠 10건 (멱등) */
export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  try {
    const result = await seedCommunityPosts();
    return json(result);
  } catch (e) {
    console.error("[admin.community.seed]", e);
    return json({ error: "Seed failed" }, 500);
  }
}
