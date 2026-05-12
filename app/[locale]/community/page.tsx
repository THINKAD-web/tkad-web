import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { pageAlternates } from "@/lib/seo";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_CATEGORY_LABELS,
  type CommunityCategory,
} from "@/lib/community/types";
import { listCommunityPosts } from "@/lib/community/queries";
import {
  ArrowRight,
  Eye,
  Heart,
  MessageSquare,
  PenLine,
  Users,
  Shield,
} from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; sort?: string; page?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "광고 소통 커뮤니티" : "Advertising Community";
  const description = isKo
    ? "OOH 광고주·매체사·마케터의 정보 교류 공간 — Q&A · 매체 후기 · 매체 추천. 익명 / 가입 모두 작성 가능."
    : "Information sharing for OOH advertisers, media operators, marketers — Q&A, reviews, recommendations. Anonymous or signed-in.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/community"),
    openGraph: { title, description, type: "website" },
    robots: { index: true, follow: true },
  };
}

function isCategory(s: unknown): s is CommunityCategory {
  return s === "qa" || s === "review" || s === "recommend";
}

function fmtRelativeKo(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  return date.toLocaleDateString("ko-KR");
}

export default async function CommunityListPage({
  params,
  searchParams,
}: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const sp = await searchParams;

  const activeCategory = isCategory(sp.category) ? sp.category : undefined;
  const activeSort = sp.sort === "popular" ? "popular" : "new";
  const activePage = Math.max(1, Number(sp.page ?? "1") || 1);

  let posts: Awaited<ReturnType<typeof listCommunityPosts>> = {
    items: [],
    total: 0,
    page: activePage,
    pageSize: 20,
  };
  let dbError: string | null = null;
  try {
    posts = await listCommunityPosts({
      category: activeCategory,
      page: activePage,
      sort: activeSort,
    });
  } catch (e) {
    // DB 마이그레이션 미완료 등으로 community_posts 테이블 없을 때 graceful fallback
    dbError = e instanceof Error ? e.message : String(e);
  }

  const breadcrumb = buildBreadcrumbJsonLd(locale, [
    { name: isKo ? "홈" : "Home", path: "" },
    { name: isKo ? "커뮤니티" : "Community", path: "/community" },
  ]);

  const totalPages = Math.max(1, Math.ceil(posts.total / posts.pageSize));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      {/* Hero */}
      <section className="bg-hero-void py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
                [ {isKo ? "커뮤니티" : "COMMUNITY"} ]
              </p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-hero-fg sm:text-4xl">
                <Users
                  className="mr-3 inline-block h-8 w-8 text-accent"
                  aria-hidden
                />
                {isKo ? "광고 소통 커뮤니티" : "Advertising Community"}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-hero-fg/80 sm:text-base">
                {isKo
                  ? "OOH 광고주 · 매체사 · 마케터의 정보 교류 공간. 익명 또는 가입 사용자로 자유롭게 글을 작성할 수 있습니다."
                  : "Info-sharing space for OOH advertisers, media operators, marketers. Post anonymously or as a registered user."}
              </p>
            </div>
            <Link
              href="/community/write"
              className="inline-flex shrink-0 items-center gap-2 border-2 border-accent bg-accent px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent-foreground transition-colors hover:bg-card hover:text-foreground hover:border-hero-fg"
            >
              <PenLine className="h-3.5 w-3.5" />
              {isKo ? "글쓰기" : "New post"}
            </Link>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b-2 border-border bg-muted py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <ul className="flex flex-wrap gap-0">
              <li>
                <Link
                  href="/community"
                  className={`-ml-[2px] inline-flex items-center gap-1.5 border-2 border-border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] transition-colors ${
                    !activeCategory
                      ? "bg-hero-void text-hero-fg"
                      : "bg-card text-foreground hover:bg-foreground hover:text-background"
                  }`}
                >
                  {isKo ? "전체" : "All"}
                </Link>
              </li>
              {COMMUNITY_CATEGORIES.map((cat) => {
                const labels = COMMUNITY_CATEGORY_LABELS[cat];
                const active = activeCategory === cat;
                return (
                  <li key={cat}>
                    <Link
                      href={`/community?category=${cat}${activeSort === "popular" ? "&sort=popular" : ""}`}
                      className={`-ml-[2px] inline-flex items-center gap-1.5 border-2 border-border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] transition-colors ${
                        active
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-card text-foreground hover:bg-foreground hover:text-background"
                      }`}
                    >
                      {isKo ? labels.ko : labels.en}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-0">
              <Link
                href={`/community${activeCategory ? `?category=${activeCategory}` : ""}`}
                className={`inline-flex items-center border-2 border-border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] transition-colors ${
                  activeSort === "new"
                    ? "bg-hero-void text-hero-fg"
                    : "bg-card text-foreground hover:bg-foreground hover:text-background"
                }`}
              >
                {isKo ? "최신" : "Newest"}
              </Link>
              <Link
                href={`/community?${activeCategory ? `category=${activeCategory}&` : ""}sort=popular`}
                className={`-ml-[2px] inline-flex items-center border-2 border-border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] transition-colors ${
                  activeSort === "popular"
                    ? "bg-hero-void text-hero-fg"
                    : "bg-card text-foreground hover:bg-foreground hover:text-background"
                }`}
              >
                {isKo ? "인기" : "Popular"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* List */}
      <section className="bg-card py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {dbError ? (
            <div className="border-2 border-accent bg-card p-8 text-center">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
                [ DB 마이그레이션 필요 ]
              </p>
              <p className="mt-3 font-bold text-foreground">
                {isKo
                  ? "커뮤니티 테이블이 아직 생성되지 않았습니다."
                  : "Community tables are not yet created."}
              </p>
              <p className="mt-2 font-mono text-[11px] tracking-tight text-muted-foreground">
                {`// `}운영자가 Neon SQL Editor 에서{" "}
                <code>prisma/migrations/20260428_add_community/migration.sql</code>{" "}
                실행 필요.
              </p>
            </div>
          ) : posts.items.length === 0 ? (
            <div className="border-2 border-border bg-muted p-12 text-center">
              <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
                {`// `}
                {isKo ? "아직 등록된 글이 없습니다." : "No posts yet."}
              </p>
              <Link
                href="/community/write"
                className="mt-6 inline-flex items-center gap-2 border-2 border-accent bg-accent px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent-foreground transition-colors hover:bg-foreground hover:border-border"
              >
                {isKo ? "첫 글 작성하기" : "Write the first post"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <ul className="space-y-0">
              {posts.items.map((p) => {
                const labels = COMMUNITY_CATEGORY_LABELS[p.category];
                return (
                  <li
                    key={p.id}
                    className="-mt-[2px] border-2 border-border bg-card"
                  >
                    <Link
                      href={`/community/posts/${p.id}`}
                      className="flex flex-col gap-3 p-5 transition-colors hover:bg-muted sm:p-6"
                    >
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="border-2 border-accent bg-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent-foreground">
                          {isKo ? labels.ko : labels.en}
                        </span>
                        <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                          {p.title}
                        </h2>
                      </div>
                      <p className="font-mono text-[12px] leading-relaxed tracking-tight text-muted-foreground line-clamp-2">
                        {p.bodyExcerpt}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        <span>
                          {p.isAnonymous ? "익명" : p.authorName}
                        </span>
                        <span>·</span>
                        <span className="tabular-nums">
                          {fmtRelativeKo(p.createdAt)}
                        </span>
                        <span className="ml-auto flex items-center gap-3 tabular-nums">
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {p.viewCount}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {p.likeCount}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {p.commentCount}
                          </span>
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {/* 페이지네이션 */}
          {posts.items.length > 0 && totalPages > 1 ? (
            <nav
              className="mt-8 flex justify-center gap-0"
              aria-label="pagination"
            >
              {Array.from({ length: totalPages }).map((_, idx) => {
                const n = idx + 1;
                const active = n === posts.page;
                const qs = new URLSearchParams();
                if (activeCategory) qs.set("category", activeCategory);
                if (activeSort === "popular") qs.set("sort", "popular");
                if (n > 1) qs.set("page", String(n));
                const href = `/community${qs.toString() ? "?" + qs.toString() : ""}`;
                return (
                  <Link
                    key={n}
                    href={href}
                    className={`-ml-[2px] inline-flex h-10 w-10 items-center justify-center border-2 border-border font-mono text-[11px] font-bold tabular-nums transition-colors ${
                      active
                        ? "bg-hero-void text-hero-fg"
                        : "bg-card text-foreground hover:bg-foreground hover:text-background"
                    }`}
                  >
                    {n}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>
      </section>

      {/* 정책 안내 */}
      <section className="border-t-2 border-border bg-muted py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            <Shield className="mr-2 inline h-3.5 w-3.5 text-accent" aria-hidden />
            {`// `}
            {isKo
              ? "글 작성 전 운영 정책을 확인해주세요"
              : "Please review the community policy before posting"}
          </p>
          <Link
            href="/community/policy"
            className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent hover:text-foreground"
          >
            {isKo ? "운영 정책 보기" : "View policy"}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>
    </>
  );
}
