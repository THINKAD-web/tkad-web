import {
  ArrowRight,
  Compass,
  PenLine,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_CATEGORY_LABELS,
  type CommunityCategory,
} from "@/lib/community/types";
import { listCommunityPosts } from "@/lib/community/queries";
import { CommunityPostCard } from "@/components/community/post-card";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";

type Props = {
  locale: string;
  activeCategory?: CommunityCategory;
  activeSort?: "mixed" | "new" | "popular";
  activePage?: number;
};

function buildFeedHref({
  category,
  sort,
  page,
}: {
  category?: CommunityCategory;
  sort?: "mixed" | "new" | "popular";
  page?: number;
}) {
  const base = category ? `/community/${category}` : "/community";
  const qs = new URLSearchParams();
  if (sort && sort !== "mixed") qs.set("sort", sort);
  if (page && page > 1) qs.set("page", String(page));
  return qs.toString() ? `${base}?${qs.toString()}` : base;
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`;
  if (n >= 10_000) return `${Math.round(n / 1000) / 10}K`;
  return n.toLocaleString();
}

export async function CommunityFeedPage({
  locale,
  activeCategory,
  activeSort = "mixed",
  activePage = 1,
}: Props) {
  const isKo = locale === "ko";

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
    dbError = e instanceof Error ? e.message : String(e);
  }

  const totalPages = Math.max(1, Math.ceil(posts.total / posts.pageSize));
  const currentCategoryLabels = activeCategory
    ? COMMUNITY_CATEGORY_LABELS[activeCategory]
    : null;
  const sortLabel =
    activeSort === "popular"
      ? isKo
        ? "인기순"
        : "Popular"
      : activeSort === "new"
        ? isKo
          ? "최신순"
          : "Newest"
        : isKo
          ? "큐레이션"
          : "Curated";

  return (
    <>
      <NeonSection className="pb-14 pt-16 sm:pb-18 sm:pt-20 lg:pb-24 lg:pt-28">
        <div className="flex flex-wrap items-center gap-3">
          {[
            {
              label: isKo ? "전체 글" : "Posts",
              value: formatCompact(posts.total),
            },
            { label: isKo ? "정렬" : "Sort", value: sortLabel },
            {
              label: isKo ? "운영 방식" : "Model",
              value: isKo ? "멤버 기반" : "Members-first",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 shadow-[0_24px_90px_rgba(0,0,0,0.7)] backdrop-blur"
            >
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/62">
                {item.label}
              </span>
              <span className="font-display text-sm font-black tracking-tight text-white">
                {item.value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="rounded-[30px] border border-white/12 bg-white/6 p-6 shadow-[0_36px_140px_rgba(0,0,0,0.72)] backdrop-blur tkad-neon-border tkad-neon-glow sm:p-8">
            <NeonSectionHead
              number="06"
              kicker="Community"
              title={
                activeCategory ? (
                  <>{isKo ? currentCategoryLabels?.ko : currentCategoryLabels?.en}</>
                ) : isKo ? (
                  <>
                    OOH 업계의 <span className="tkad-home-accent-text">질문</span>,
                    후기, 연결
                  </>
                ) : (
                  <>
                    A home for OOH <span className="tkad-home-accent-text">insights</span>,
                    reviews, and industry connections
                  </>
                )
              }
              meta="members-first industry feed"
              className="mb-0"
            />

            <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-white/78 sm:text-lg">
              {activeCategory
                ? isKo
                  ? currentCategoryLabels?.description.ko
                  : currentCategoryLabels?.description.en
                : isKo
                  ? "광고주, 매체사, 대행사, 프리랜서가 캠페인 경험과 시장 감각을 교환하는 최신 커뮤니티 허브입니다."
                  : "A modern community hub where advertisers, media operators, agencies, and freelancers exchange campaign learnings and market signals."}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/community/write"
                className="tkad-neon-cta-clean group inline-flex h-14 items-center justify-center gap-2 rounded-[20px] px-7 text-sm font-black text-white transition-transform hover:-translate-y-1"
              >
                <PenLine className="h-4 w-4" />
                {isKo ? "글쓰기 시작" : "Start posting"}
              </Link>
              <Link
                href="/community/members"
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-[20px] border border-white/14 bg-white/6 px-7 text-sm font-black text-white shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur transition-all hover:-translate-y-1 hover:border-white/22 hover:bg-white/10"
              >
                <Users className="h-4 w-4" />
                {isKo ? "활동 멤버 보기" : "Browse members"}
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-white/12 bg-white/6 p-5 backdrop-blur tkad-neon-border">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
                {isKo ? "// 빠른 이동" : "// quick paths"}
              </p>
              <div className="mt-4 grid gap-2">
                {COMMUNITY_CATEGORIES.map((cat) => {
                  const labels = COMMUNITY_CATEGORY_LABELS[cat];
                  const active = activeCategory === cat;
                  return (
                    <Link
                      key={cat}
                      href={buildFeedHref({ category: cat, sort: activeSort })}
                      className={`rounded-2xl border px-4 py-3 transition-colors ${
                        active
                          ? "border-white/22 bg-white/12"
                          : "border-white/10 bg-black/20 hover:bg-white/8"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white">
                            {isKo ? labels.shortKo : labels.en}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-white/62">
                            {isKo ? labels.description.ko : labels.description.en}
                          </p>
                        </div>
                        <Compass className="h-4 w-4 shrink-0 text-white/45" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/12 bg-[linear-gradient(135deg,rgba(168,85,247,0.12),rgba(34,211,238,0.08),rgba(255,255,255,0.04))] p-5 backdrop-blur tkad-neon-border">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 text-white/72" />
                <div>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
                    {isKo ? "// 커뮤니티 기준" : "// feed logic"}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white/72">
                    {isKo
                      ? "최신성과 반응을 함께 반영한 큐레이션 피드입니다. 카테고리와 정렬 기준을 바꿔 원하는 관점으로 바로 탐색할 수 있습니다."
                      : "The feed blends recency with engagement. Switch category and sort to explore the community from different angles."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[28px] border border-white/12 bg-white/6 p-5 backdrop-blur tkad-neon-border sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <ul className="flex flex-wrap gap-2">
              <li>
                <Link
                  href={buildFeedHref({ sort: activeSort })}
                  className={`inline-flex rounded-full border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] transition-colors ${
                    !activeCategory
                      ? "border-white/22 bg-white/12 text-white"
                      : "border-white/10 bg-black/20 text-white/68 hover:bg-white/8 hover:text-white"
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
                      href={buildFeedHref({ category: cat, sort: activeSort })}
                      className={`inline-flex rounded-full border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] transition-colors ${
                        active
                          ? "border-white/22 bg-white/12 text-white"
                          : "border-white/10 bg-black/20 text-white/68 hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      {isKo ? labels.shortKo : labels.en}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap gap-2">
              {[
                { key: "mixed", label: isKo ? "큐레이션" : "Curated" },
                { key: "new", label: isKo ? "최신" : "Newest" },
                { key: "popular", label: isKo ? "인기" : "Popular" },
              ].map((option) => (
                <Link
                  key={option.key}
                  href={buildFeedHref({
                    category: activeCategory,
                    sort: option.key as "mixed" | "new" | "popular",
                  })}
                  className={`inline-flex rounded-full border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] transition-colors ${
                    activeSort === option.key
                      ? "border-[#8b5cf6]/60 bg-[linear-gradient(135deg,rgba(168,85,247,0.28),rgba(34,211,238,0.16))] text-white"
                      : "border-white/10 bg-black/20 text-white/68 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </NeonSection>

      <NeonSection className="pt-0">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
                  {isKo ? "// curated feed" : "// curated feed"}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl">
                  {activeCategory
                    ? isKo
                      ? `${currentCategoryLabels?.ko} 글`
                      : `${currentCategoryLabels?.en} Posts`
                    : isKo
                      ? "최신 커뮤니티 피드"
                      : "Latest community feed"}
                </h2>
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/58">
                {isKo
                  ? `총 ${posts.total.toLocaleString()}개 글`
                  : `${posts.total.toLocaleString()} posts`}
              </p>
            </div>

            <div className="mt-6">
          {dbError ? (
              <div className="rounded-[28px] border border-[#fb7185]/25 bg-[rgba(127,29,29,0.28)] p-8 text-center backdrop-blur">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-rose-200">
                [ DB 마이그레이션 필요 ]
              </p>
                <p className="mt-3 font-bold text-white">
                {isKo
                  ? "커뮤니티 스키마가 아직 최신 상태가 아닙니다."
                  : "The community schema is not up to date yet."}
              </p>
                <p className="mt-2 font-mono text-[11px] tracking-tight text-white/62">
                {dbError}
              </p>
              </div>
          ) : posts.items.length === 0 ? (
              <div className="rounded-[28px] border border-white/12 bg-white/6 p-12 text-center backdrop-blur tkad-neon-border">
                <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-white/58">
                {isKo
                  ? "// 아직 등록된 글이 없습니다."
                  : "// there are no community posts yet"}
              </p>
              <Link
                href="/community/write"
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#8b5cf6]/55 bg-[linear-gradient(135deg,rgba(168,85,247,0.26),rgba(34,211,238,0.16))] px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-white/10"
              >
                {isKo ? "첫 글 작성하기" : "Write the first post"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              </div>
          ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {posts.items.map((post, idx) => (
                    <CommunityPostCard
                      key={post.id}
                      post={post}
                      locale={locale}
                      variant="community"
                      className={idx === 0 && posts.items.length > 2 ? "xl:col-span-2" : ""}
                    />
              ))}
            </div>
          )}
            </div>

          {posts.items.length > 0 && totalPages > 1 ? (
              <nav className="mt-8 flex flex-wrap justify-center gap-2" aria-label="pagination">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const n = idx + 1;
                const active = n === posts.page;
                return (
                  <Link
                    key={n}
                    href={buildFeedHref({
                      category: activeCategory,
                      sort: activeSort,
                      page: n,
                    })}
                      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-3 font-mono text-[11px] font-bold tabular-nums transition-colors ${
                      active
                          ? "border-white/22 bg-white/12 text-white"
                          : "border-white/10 bg-black/20 text-white/62 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    {n}
                  </Link>
                );
              })}
            </nav>
          ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[28px] border border-white/12 bg-white/6 p-5 backdrop-blur tkad-neon-border">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
                {isKo ? "// members" : "// members"}
              </p>
              <h3 className="mt-3 text-xl font-black tracking-[-0.04em] text-white">
                {isKo ? "활동 멤버를 만나보세요" : "Meet active members"}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/68">
                {isKo
                  ? "광고주, 매체사, 대행사, 프리랜서 프로필을 보고 누구와 연결될지 빠르게 판단할 수 있습니다."
                  : "Explore advertiser, media, agency, and freelancer profiles to find the right connection."}
              </p>
              <Link
                href="/community/members"
                className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white hover:text-white/75"
              >
                {isKo ? "멤버 디렉터리 열기" : "Open directory"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-[28px] border border-white/12 bg-white/6 p-5 backdrop-blur tkad-neon-border">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
                <Shield className="mr-2 inline h-3.5 w-3.5 text-white/72" aria-hidden />
                {isKo
                  ? "// 회원 기반 커뮤니티 운영"
                  : "// members-first community"}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/68">
                {isKo
                  ? "글, 댓글, 좋아요, 북마크는 로그인 멤버 기준으로 운영됩니다. 정책과 모더레이션 원칙도 함께 확인해 주세요."
                  : "Posts, comments, likes, and bookmarks are tied to signed-in members. Review the policy and moderation rules as well."}
              </p>
              <Link
                href="/community/policy"
                className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white hover:text-white/75"
              >
                {isKo ? "운영 정책 보기" : "View policy"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </aside>
        </div>
      </NeonSection>
    </>
  );
}
