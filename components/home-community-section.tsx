import { Heart, MessageSquare } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  COMMUNITY_CATEGORY_LABELS,
  type CommunityPostListItem,
} from "@/lib/community/types";
import { cn } from "@/lib/utils";
import { RoleBadge } from "@/components/community/role-badge";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";

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
  isKo: boolean;
};

export function HomeCommunitySection({ posts, locale, isKo }: Props) {
  return (
    <NeonSection>
      <div className="flex flex-col gap-4">
        <NeonSectionHead
          number="06"
          kicker="Community"
          title={
            isKo ? (
              <>
                OOH 업계 사람들과{" "}
                <span className="tkad-home-accent-text">연결</span>되세요
              </>
            ) : (
              <>
                Connect with people across{" "}
                <span className="tkad-home-accent-text">OOH</span>
              </>
            )
          }
          meta="ooh industry network"
          className="mb-0"
        />
        <p className="max-w-2xl text-[15px] leading-relaxed text-white/78 sm:text-base">
          {isKo
            ? "광고주·매체사·대행사가 모이는 국내 유일 OOH 커뮤니티"
            : "The place where advertisers, media owners, and agencies meet for OOH in Korea."}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 md:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-5">
        {posts.length > 0 ? (
          posts.map((post) => {
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
          })
        ) : (
          <div className="rounded-none border-2 border-black bg-card/80 p-8 text-center shadow-[4px_4px_0_0_rgb(0,0,0)] md:col-span-2 lg:col-span-3">
            <p className="font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              {isKo
                ? "// 커뮤니티 글이 곧 노출됩니다"
                : "// community posts coming soon"}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-8 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <Link
          href="/community"
          className="group inline-flex items-center gap-2 border-b-2 border-transparent font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/88 transition-colors hover:border-white/40 hover:text-white"
        >
          {isKo ? "커뮤니티 전체 보기" : "View full community"}
          <span aria-hidden className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </Link>
        <Link
          href="/register"
          className="group inline-flex items-center gap-2 border-b-2 border-transparent font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/88 transition-colors hover:border-[#FF6600]/70 hover:text-white"
        >
          {isKo ? "멤버로 참여하기" : "Join as a member"}
          <span aria-hidden className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </NeonSection>
  );
}
