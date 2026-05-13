import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { pageAlternates } from "@/lib/seo";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import {
  COMMUNITY_CATEGORY_LABELS,
  type CommunityCategory,
} from "@/lib/community/types";
import { getCommunityPostDetail } from "@/lib/community/queries";
import { getCurrentUser } from "@/lib/user-session";
import { ArrowLeft, User } from "lucide-react";
import { CommunityPostInteractions } from "@/components/community/post-interactions";
import { CommunityCommentsSection } from "@/components/community/comments-section";
import { CommunityRoleBadge } from "@/components/community/role-badge";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export const dynamic = "force-dynamic";

function fmtKoDateTime(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleString(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  let post;
  try {
    post = await getCommunityPostDetail(id);
  } catch {
    return { title: locale === "ko" ? "게시글 없음" : "Not found" };
  }
  if (!post) return { title: locale === "ko" ? "게시글 없음" : "Not found" };
  return {
    title: post.title,
    description: post.bodyExcerpt,
    alternates: pageAlternates(locale, `/community/post/${id}`),
    openGraph: {
      title: post.title,
      description: post.bodyExcerpt,
      type: "article",
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
    },
    robots: { index: false, follow: false },
  };
}

export default async function CommunityPostDetailPage({ params }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const me = await getCurrentUser();

  let post;
  try {
    post = await getCommunityPostDetail(id, {
      incrementView: true,
      currentUserId: me?.id ?? null,
    });
  } catch (e) {
    return (
      <HomeLandingDayNight>
        <div className="tkad-landing-neon tkad-planner-neon">
          <NeonSection className="pb-20 pt-16 sm:pt-20 lg:pt-24">
            <div className="mx-auto max-w-3xl rounded-[30px] border border-[#fb7185]/25 bg-[rgba(127,29,29,0.28)] p-8 text-center backdrop-blur">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-rose-200">
                [ DB 마이그레이션 필요 ]
              </p>
              <p className="mt-3 font-bold text-white">
                {isKo
                  ? "커뮤니티 스키마가 아직 최신 상태가 아닙니다."
                  : "The community schema is not up to date yet."}
              </p>
              <p className="mt-2 font-mono text-[11px] tracking-tight text-white/62">
                {e instanceof Error ? e.message : String(e)}
              </p>
            </div>
          </NeonSection>
        </div>
      </HomeLandingDayNight>
    );
  }

  if (!post) notFound();

  const labels = COMMUNITY_CATEGORY_LABELS[post.category as CommunityCategory];
  const breadcrumb = buildBreadcrumbJsonLd(locale, [
    { name: isKo ? "홈" : "Home", path: "" },
    { name: isKo ? "커뮤니티" : "Community", path: "/community" },
    { name: post.title.slice(0, 60), path: `/community/post/${id}` },
  ]);
  const loginHref = `/${locale}/login?next=${encodeURIComponent(`/${locale}/community/post/${id}`)}`;

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

        <NeonSection className="pb-10 pt-16 sm:pt-20 lg:pt-24">
          <Link
            href={post.category ? `/community/${post.category}` : "/community"}
            className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/62 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isKo ? labels.ko : labels.en}
          </Link>
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_320px]">
            <div className="rounded-[30px] border border-white/12 bg-white/6 p-6 shadow-[0_36px_140px_rgba(0,0,0,0.72)] backdrop-blur tkad-neon-border tkad-neon-glow sm:p-8">
              <span className="inline-flex rounded-full border border-white/14 bg-white/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white">
                {isKo ? labels.shortKo : labels.en}
              </span>
              <NeonSectionHead
                number="10"
                kicker="Post"
                title={post.title}
                meta="community thread"
                className="mb-0 mt-5"
              />

              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white/58">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-white/62" />
                  {post.author ? (
                    <Link
                      href={`/community/profile/${post.author.id}`}
                      className="font-bold text-white transition-colors hover:text-white/80"
                    >
                      {post.authorName}
                    </Link>
                  ) : (
                    <span className="font-bold text-white">{post.authorName}</span>
                  )}
                </span>
                <CommunityRoleBadge role={post.author?.role ?? null} locale={locale} />
                {post.author?.company ? <span>{post.author.company}</span> : null}
                <span className="tabular-nums">{fmtKoDateTime(post.createdAt, locale)}</span>
              </div>
            </div>

            <div className="grid gap-4">
              {[
                {
                  label: isKo ? "조회수" : "Views",
                  value: post.viewCount.toLocaleString(),
                },
                {
                  label: isKo ? "좋아요" : "Likes",
                  value: post.likeCount.toLocaleString(),
                },
                {
                  label: isKo ? "댓글" : "Comments",
                  value: post.commentCount.toLocaleString(),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-white/12 bg-white/6 p-5 backdrop-blur tkad-neon-border"
                >
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
                    {item.label}
                  </p>
                  <p className="mt-2 font-display text-2xl font-black tracking-tight text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </NeonSection>

        <NeonSection className="pt-0">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <article className="rounded-[30px] border border-white/12 bg-white/6 p-6 shadow-[0_36px_140px_rgba(0,0,0,0.72)] backdrop-blur tkad-neon-border sm:p-8">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
                {isKo ? "// thread body" : "// thread body"}
              </p>
              <div className="mt-6 whitespace-pre-wrap break-words text-[15px] leading-8 text-white/84 sm:text-base">
                {post.body}
              </div>

              <div className="mt-8 border-t border-white/10 pt-8">
                <CommunityPostInteractions
                  postId={post.id}
                  locale={locale}
                  loginHref={loginHref}
                  canInteract={!!me}
                  initialLikeCount={post.likeCount}
                  initialLiked={post.likedByMe}
                  initialBookmarked={post.bookmarkedByMe}
                />
              </div>
            </article>

            <aside className="grid gap-4 self-start">
              <div className="rounded-[28px] border border-white/12 bg-white/6 p-5 backdrop-blur tkad-neon-border">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
                  {isKo ? "// author" : "// author"}
                </p>
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold tracking-tight text-white">
                      {post.authorName}
                    </span>
                    <CommunityRoleBadge role={post.author?.role ?? null} locale={locale} />
                  </div>
                  {post.author?.company ? (
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/58">
                      {post.author.company}
                    </p>
                  ) : null}
                  <p className="text-sm leading-relaxed text-white/72">
                    {post.author?.bio ??
                      (isKo
                        ? "작성자 소개가 아직 등록되지 않았습니다."
                        : "The author has not added a bio yet.")}
                  </p>
                  {post.author ? (
                    <Link
                      href={`/community/profile/${post.author.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/6 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-white/10"
                    >
                      {isKo ? "프로필 보기" : "View profile"}
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/12 bg-[linear-gradient(135deg,rgba(168,85,247,0.12),rgba(34,211,238,0.08),rgba(255,255,255,0.04))] p-5 backdrop-blur tkad-neon-border">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
                  {isKo ? "// policy note" : "// policy note"}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/72">
                  {isKo
                    ? "본 게시물의 내용은 작성자 개인의 의견입니다. 운영 정책 위반 시 자동 숨김 또는 관리자 검토가 진행될 수 있습니다."
                    : "Posts reflect the author’s own perspective. Content may be auto-hidden or reviewed if it violates community policy."}
                </p>
                <Link
                  href="/community/policy"
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/14 bg-black/20 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/78 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {isKo ? "운영 정책 보기" : "Read policy"}
                </Link>
              </div>
            </aside>
          </div>
        </NeonSection>

        <NeonSection className="pt-0 pb-20 sm:pb-24">
          <CommunityCommentsSection
            postId={post.id}
            locale={locale}
            initialComments={post.comments}
            currentUser={
              me
                ? {
                    id: me.id,
                    name: me.name,
                    company: me.company,
                    role: me.role,
                    communityRole: me.communityRole,
                  }
                : null
            }
          />
        </NeonSection>
      </div>
    </HomeLandingDayNight>
  );
}
