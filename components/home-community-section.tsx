"use client";

import { Heart, MessageSquare } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  COMMUNITY_CATEGORY_LABELS,
  type CommunityPostListItem,
} from "@/lib/community/types";
import { cn } from "@/lib/utils";
import { RoleBadge } from "@/components/community/role-badge";
import { HomeCommunityNewsletter } from "@/components/home-community-newsletter";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { useTranslations } from "next-intl";
import { accentTag } from "@/lib/render-accent-title";

function fmtRelative(iso: string, locale: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (locale === "ko") {
    if (min < 1) return "방금 전";
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}일 전`;
    return date.toLocaleDateString("ko-KR");
  }
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return date.toLocaleDateString("en-US");
}

type Props = {
  posts: CommunityPostListItem[];
  locale: string;
};

function CommunityEmptyState({ isKo }: { isKo: boolean }) {
  const t = useTranslations("homePage");
  const bullets = isKo
    ? [
        "매체·캠페인 실무 Q&A와 현장 인사이트",
        "광고주·매체사·대행사 네트워킹",
        "회원 전용 글·댓글·북마크",
      ]
    : [
        "Practical Q&A on media and campaigns",
        "Networking across advertisers, media, and agencies",
        "Member posts, comments, and bookmarks",
      ];

  return (
    <div className="mt-6 grid grid-cols-1 gap-5 sm:mt-8 lg:mt-10 lg:grid-cols-2 lg:gap-6">
      <div className="tkad-neon-border relative flex flex-col gap-4 overflow-hidden rounded-[28px] border border-gray-200 bg-white p-6 text-gray-900 shadow-sm dark:border-white/12 dark:bg-white/5 dark:text-white dark:shadow-none sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-20 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_55%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.18),transparent_55%)]"
        />
        <div className="relative flex flex-col gap-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] dark:text-white text-gray-600">
            {isKo ? "// 멤버 커뮤니티" : "// members community"}
          </p>
          <p className="text-base leading-relaxed dark:text-white text-gray-800 sm:text-lg">
            {isKo
              ? "질문을 남기고, 집행 사례를 공유하고, 업계 동료와 바로 연결하세요. 가입 후 첫 글을 작성할 수 있습니다."
              : "Ask questions, share execution stories, and connect with peers. Sign up to publish your first post."}
          </p>
          <ul className="space-y-2 text-sm dark:text-white">
            {bullets.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="tkad-home-accent-text font-mono font-bold" aria-hidden>
                  →
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="group mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-white/22 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95),rgba(236,72,153,0.95))] px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] dark:text-white text-gray-900 shadow-[0_18px_60px_rgba(0,0,0,0.55)] transition-transform hover:-translate-y-0.5"
          >
            {t("communityJoin")}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>

      <HomeCommunityNewsletter isKo={isKo} />
    </div>
  );
}

export function HomeCommunitySection({ posts, locale }: Props) {
  const t = useTranslations("homePage");
  const isKo = locale === "ko";
  return (
    <NeonSection>
      <div className="flex flex-col gap-4">
        <NeonSectionHead
          number="06"
          kicker={t("communityKicker")}
          title={t.rich("communityTitle", { accent: accentTag })}
          meta={t("communityMeta")}
          className="mb-0"
        />
        <p className="max-w-2xl text-[15px] leading-relaxed dark:text-white text-gray-700 sm:text-base">
          {t("communityLead")}
        </p>
      </div>

      {posts.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 md:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-5">
          {posts.map((post) => {
            const labels = COMMUNITY_CATEGORY_LABELS[post.category];
            return (
              <Link
                key={post.id}
                href={`/community/post/${post.id}`}
                className={cn(
                  "tkad-neon-border group relative block overflow-hidden rounded-[22px] border border-gray-200 bg-white text-gray-900 shadow-sm transition-all duration-200 hover:shadow-md dark:border-white/12 dark:bg-white/5 dark:text-white dark:shadow-none",
                  "hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md dark:hover:border-white/22 dark:hover:bg-white/[0.07] dark:hover:shadow-[0_24px_72px_rgba(0,0,0,0.55)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-[#a855f7] dark:focus-visible:ring-offset-[#05050a]",
                )}
              >
                <article className="relative flex h-full flex-col gap-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span
                      className="inline-flex max-w-full items-center rounded-full border dark:border-white/18 border-gray-300 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95),rgba(236,72,153,0.9))] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] dark:text-white text-gray-900 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
                      style={{ wordBreak: "break-word" }}
                    >
                      {isKo ? labels.shortKo : labels.en}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] dark:text-white text-gray-500">
                      {fmtRelative(post.createdAt, locale)}
                    </span>
                  </div>

                  <h3 className="line-clamp-2 font-sans text-lg font-bold leading-snug tracking-tight dark:text-white text-gray-900 sm:text-xl">
                    {post.title}
                  </h3>

                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t dark:border-white/10 border-gray-200 pt-3 font-mono text-[11px] uppercase tracking-[0.14em] dark:text-white text-gray-500">
                    <span className="font-bold dark:text-white text-gray-800">{post.authorName}</span>
                    {!post.isAnonymous && post.author ? (
                      <RoleBadge role={post.author.role} locale={locale} />
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] dark:text-white text-gray-500">
                    <span className="inline-flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 dark:text-white text-gray-700">
                        <Heart
                          className="h-3.5 w-3.5 text-[#ec4899]"
                          aria-hidden
                        />
                        {post.likeCount}
                      </span>
                      <span className="inline-flex items-center gap-1 dark:text-white text-gray-700">
                        <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                        {post.commentCount}
                      </span>
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      ) : (
        <CommunityEmptyState isKo={isKo} />
      )}

      <div className="mt-8 flex flex-col gap-3 border-t dark:border-white/10 border-gray-200 pt-8 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <Link
          href="/community"
          className="group inline-flex items-center gap-2 border-b-2 border-transparent font-mono text-[11px] font-bold uppercase tracking-[0.22em] dark:text-white text-gray-800 transition-colors hover:border-white/40 hover:dark:text-white text-gray-900"
        >
          {t("communityViewAll")}
          <span aria-hidden className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </Link>
        {posts.length > 0 ? (
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 border-b-2 border-transparent font-mono text-[11px] font-bold uppercase tracking-[0.22em] dark:text-white text-gray-800 transition-colors hover:border-[#a855f7]/70 hover:dark:text-white text-gray-900"
          >
            {t("communityJoin")}
            <span aria-hidden className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        ) : null}
      </div>
    </NeonSection>
  );
}
