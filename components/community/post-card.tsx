import { ArrowUpRight, Eye, Heart, MessageSquare } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  COMMUNITY_CATEGORY_LABELS,
  type CommunityPostListItem,
} from "@/lib/community/types";
import { cn } from "@/lib/utils";
import { RoleBadge } from "@/components/community/role-badge";

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
  post: CommunityPostListItem;
  locale: string;
  href?: string;
  variant?: "feed" | "home" | "community";
  className?: string;
};

export function CommunityPostCard({
  post,
  locale,
  href = `/community/post/${post.id}`,
  variant = "feed",
  className,
}: Props) {
  const isKo = locale === "ko";
  const labels = COMMUNITY_CATEGORY_LABELS[post.category];
  const isNeon = variant === "home" || variant === "community";

  return (
    <Link
      href={href}
      className={cn(
        "group block border-2 border-border bg-card transition-colors hover:bg-muted",
        isNeon &&
          "rounded-[30px] dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-0 dark:text-white text-gray-900 backdrop-blur tkad-neon-border tkad-neon-glow hover:dark:bg-white/10 bg-gray-100",
        className,
      )}
    >
      <article
        className={cn(
          "flex h-full flex-col gap-4 p-5 sm:p-6",
          isNeon && "h-full p-6 sm:p-7",
          variant === "community" && "gap-5",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <span
            className={cn(
              "inline-flex items-center border-2 border-accent bg-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent-foreground",
              isNeon &&
                "rounded-full dark:border-white/15 border-gray-200 dark:bg-white/10 bg-gray-100 px-3 py-1 dark:text-white text-gray-900",
            )}
          >
            {isKo ? labels.shortKo : labels.en}
          </span>
          <span
            className={cn(
              "font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground",
              isNeon && "dark:text-white text-gray-500",
            )}
          >
            {fmtRelative(post.createdAt, locale)}
          </span>
        </div>

        <div className="space-y-3">
          <h3
            className={cn(
              "text-lg font-bold tracking-tight text-foreground sm:text-xl",
              isNeon && "dark:text-white text-gray-900",
              variant === "community" &&
                "text-[clamp(1.2rem,2vw,1.6rem)] leading-[1.05] tracking-[-0.04em]",
            )}
          >
            {post.title}
          </h3>
          <p
            className={cn(
              "line-clamp-3 text-sm leading-relaxed text-muted-foreground",
              isNeon && "dark:text-white",
              variant === "community" && "line-clamp-4 text-[15px]",
            )}
          >
            {post.bodyExcerpt}
          </p>
        </div>

        <div className="mt-auto space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "font-mono text-[11px] uppercase tracking-[0.18em] text-foreground",
                isNeon && "dark:text-white text-gray-800",
              )}
            >
              {post.authorName}
            </span>
            {!post.isAnonymous && post.author ? (
              <RoleBadge
                role={post.author.role}
                locale={locale}
                className={isNeon ? "dark:bg-white/10 bg-gray-100" : undefined}
              />
            ) : null}
            {!post.isAnonymous && post.author?.company ? (
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground",
                  isNeon && "dark:text-white text-gray-500",
                )}
              >
                {post.author.company}
              </span>
            ) : null}
          </div>

          <div
            className={cn(
              "flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground",
              isNeon && "dark:text-white text-gray-500",
              variant === "community" && "justify-between gap-y-2",
            )}
          >
            <div className="flex flex-wrap items-center gap-3">
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
            </div>
            {variant === "community" ? (
              <span className="inline-flex items-center gap-1 dark:text-white text-gray-700 transition-transform group-hover:translate-x-1">
                {isKo ? "자세히 보기" : "Open"}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            ) : null}
          </div>
        </div>
      </article>
    </Link>
  );
}
