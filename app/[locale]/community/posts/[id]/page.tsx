import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { pageAlternates, siteUrl } from "@/lib/seo";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import {
  COMMUNITY_CATEGORY_LABELS,
  type CommunityCategory,
} from "@/lib/community/types";
import { getCommunityPostDetail } from "@/lib/community/queries";
import { ArrowLeft, Eye, Heart, MessageSquare, User } from "lucide-react";
import { CommunityPostInteractions } from "@/components/community/post-interactions";
import { CommunityCommentForm } from "@/components/community/comment-form";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export const dynamic = "force-dynamic";

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
    alternates: pageAlternates(locale, `/community/posts/${id}`),
    openGraph: {
      title: post.title,
      description: post.bodyExcerpt,
      type: "article",
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
    },
    // 커뮤니티 글은 noindex — 사용자 생성 콘텐츠라 검색 노출 신중
    robots: { index: false, follow: false },
  };
}

function fmtKoDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtRelativeKo(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return date.toLocaleDateString("ko-KR");
}

export default async function CommunityPostDetailPage({ params }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);
  const isKo = locale === "ko";

  let post;
  try {
    post = await getCommunityPostDetail(id, { incrementView: true });
  } catch (e) {
    // DB 미마이그레이션 등 — 안내 페이지로
    return (
      <section className="bg-card py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="border-2 border-accent bg-card p-8 text-center">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
              [ DB 마이그레이션 필요 ]
            </p>
            <p className="mt-3 font-bold text-foreground">
              커뮤니티 테이블이 아직 생성되지 않았습니다.
            </p>
            <p className="mt-2 font-mono text-[11px] tracking-tight text-muted-foreground">
              {`// `}
              {e instanceof Error ? e.message : String(e)}
            </p>
            <Link
              href="/community"
              className="mt-6 inline-flex items-center gap-2 border-2 border-border bg-hero-void px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-hero-fg transition-colors hover:bg-accent hover:border-accent"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              커뮤니티로
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!post) notFound();

  const labels = COMMUNITY_CATEGORY_LABELS[post.category as CommunityCategory];
  const breadcrumb = buildBreadcrumbJsonLd(locale, [
    { name: isKo ? "홈" : "Home", path: "" },
    { name: isKo ? "커뮤니티" : "Community", path: "/community" },
    { name: post.title.slice(0, 60), path: `/community/posts/${id}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      {/* 상단 — 카테고리 / 뒤로 */}
      <section className="border-b-2 border-border bg-muted py-4">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link
            href={`/community?category=${post.category}`}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            {isKo ? labels.ko : labels.en}
          </Link>
        </div>
      </section>

      <article className="bg-card">
        {/* Hero */}
        <header className="border-b-2 border-border px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border-2 border-accent bg-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent-foreground">
                {isKo ? labels.ko : labels.en}
              </span>
            </div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              {post.title}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3 w-3 text-accent" />
                {post.isAnonymous ? "익명" : post.authorName}
              </span>
              <span>·</span>
              <span className="tabular-nums">
                {fmtKoDateTime(post.createdAt)}
              </span>
              <span className="ml-auto flex items-center gap-3 tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {post.viewCount}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {post.likeCount}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {post.commentCount}
                </span>
              </span>
            </div>
          </div>
        </header>

        {/* 본문 */}
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="whitespace-pre-wrap break-words text-base leading-relaxed text-foreground">
            {post.body}
          </div>
        </div>

        {/* Like / Report (client) */}
        <div className="border-t-2 border-border bg-muted">
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
            <CommunityPostInteractions
              postId={post.id}
              initialLikeCount={post.likeCount}
            />
          </div>
        </div>

        {/* 댓글 — 표시 (서버) */}
        <section className="border-t-2 border-border bg-card py-10">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              [ {isKo ? "댓글" : "COMMENTS"} ]
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {isKo ? "댓글" : "Comments"}{" "}
              <span className="font-mono tabular-nums text-muted-foreground">
                ({post.comments.length})
              </span>
            </h2>

            {post.comments.length === 0 ? (
              <p className="mt-6 border-2 border-border bg-muted p-6 font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground text-center">
                {`// `}
                {isKo
                  ? "첫 댓글을 작성해주세요."
                  : "Be the first to comment."}
              </p>
            ) : (
              <ul className="mt-6 space-y-0">
                {post.comments.map((c) => (
                  <li
                    key={c.id}
                    className="-mt-[2px] border-2 border-border bg-card p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        <User className="h-3 w-3 text-accent" />
                        <span className="font-bold text-foreground">
                          {c.isAnonymous ? "익명" : c.authorName}
                        </span>
                        <span>·</span>
                        <span className="tabular-nums">
                          {fmtRelativeKo(c.createdAt)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                      {c.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {/* 댓글 작성 폼 (client) */}
            <div className="mt-8 border-t-2 border-border pt-8">
              <CommunityCommentForm postId={post.id} />
            </div>
          </div>
        </section>

        {/* 정책 안내 */}
        <section className="border-t-2 border-border bg-muted py-6">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              {`// `}본 게시물의 내용은 작성자 개인의 의견이며 THINKAD 의 공식
              입장이 아닙니다.{" "}
              <Link
                href="/community/policy"
                className="font-bold text-accent hover:text-foreground"
              >
                {isKo ? "운영 정책" : "Policy"} →
              </Link>
            </p>
          </div>
        </section>
      </article>
    </>
  );
}
