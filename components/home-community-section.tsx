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
      <div className="flex flex-col gap-4 border-2 border-black bg-card p-6 text-card-foreground shadow-[4px_4px_0_0_rgb(0,0,0)] sm:p-8">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          {isKo ? "// 멤버 커뮤니티" : "// members community"}
        </p>
        <p className="text-base leading-relaxed text-foreground sm:text-lg">
          {isKo
            ? "질문을 남기고, 집행 사례를 공유하고, 업계 동료와 바로 연결하세요. 가입 후 첫 글을 작성할 수 있습니다."
            : "Ask questions, share execution stories, and connect with peers. Sign up to publish your first post."}
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {bullets.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="font-mono text-[#FF6600]" aria-hidden>
                →
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/register"
          className="mt-2 inline-flex w-fit items-center gap-2 border-2 border-black bg-[#FF6600] px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-[3px_3px_0_0_rgb(0,0,0)] transition-transform hover:-translate-y-0.5"
        >
          {t("communityJoin")}
          <span aria-hidden>→</span>
        </Link>
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
        <p className="max-w-2xl text-[15px] leading-relaxed text-white/78 sm:text-base">
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
                  "group block border-2 border-black bg-card text-card-foreground shadow-[4px_4px_0_0_rgb(0,0,0)] transition-all duration-200",
                  "hover:-translate-y-0.5 hover:shadow-[6px_8px_0_0_rgb(0,0,0)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6600] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                )}
              >
                <article className="flex h-full flex-col gap-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span
                      className="inline-flex max-w-full items-center border-2 border-black bg-[#FF6600] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white"
                      style={{ wordBreak: "break-word" }}
                    >
                      {isKo ? labels.shortKo : labels.en}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {fmtRelative(post.createdAt, locale)}
                    </span>
                  </div>

                  <h3 className="line-clamp-2 font-sans text-lg font-bold leading-snug tracking-tight text-foreground sm:text-xl">
                    {post.title}
                  </h3>

                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t-2 border-black/10 pt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="font-bold text-foreground">{post.authorName}</span>
                    {!post.isAnonymous && post.author ? (
                      <RoleBadge role={post.author.role} locale={locale} />
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="inline-flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <Heart className="h-3.5 w-3.5 text-[#FF6600]" aria-hidden />
                        {post.likeCount}
                      </span>
                      <span className="inline-flex items-center gap-1 text-foreground">
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

      <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-8 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <Link
          href="/community"
          className="group inline-flex items-center gap-2 border-b-2 border-transparent font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/88 transition-colors hover:border-white/40 hover:text-white"
        >
          {t("communityViewAll")}
          <span aria-hidden className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </Link>
        {posts.length > 0 ? (
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 border-b-2 border-transparent font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/88 transition-colors hover:border-[#FF6600]/70 hover:text-white"
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
