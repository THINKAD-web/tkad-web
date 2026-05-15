import type { ReportCategory } from "@prisma/client";
import { listFeaturedCommunityPosts } from "@/lib/community/queries";
import type { CommunityPostListItem } from "@/lib/community/types";
import { communityCategoryForReport } from "@/lib/report-category";

/**
 * 리포트 상세 하단 — 동일 성격 커뮤니티 인기글 2개.
 * `listFeaturedCommunityPosts` + 카테고리 필터를 쓰고, 부족하면 전체 인기로 보강.
 */
export async function listRelatedCommunityPostsForReport(
  reportCategory: ReportCategory,
): Promise<CommunityPostListItem[]> {
  const comm = communityCategoryForReport(reportCategory);
  const scoped = await listFeaturedCommunityPosts({
    limit: 2,
    sortBy: "popular",
    category: comm,
  });
  const posts = [...scoped.posts];
  if (posts.length >= 2) return posts.slice(0, 2);

  const broad = await listFeaturedCommunityPosts({
    limit: 8,
    sortBy: "popular",
  });
  const seen = new Set(posts.map((p) => p.id));
  for (const p of broad.posts) {
    if (posts.length >= 2) break;
    if (!seen.has(p.id)) {
      posts.push(p);
      seen.add(p.id);
    }
  }
  return posts.slice(0, 2);
}
