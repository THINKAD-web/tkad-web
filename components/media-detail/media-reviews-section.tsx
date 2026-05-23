"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BadgeCheck, ThumbsUp } from "lucide-react";
import { MediaStarRating } from "@/components/media/media-star-rating";
import type { MediaReviewStats, PublicMediaReview } from "@/lib/media-reviews";
import { cn } from "@/lib/utils";
import { useAppToast } from "@/lib/use-toast";

type Props = {
  mediaId: string;
  mediaName: string;
};

const EMPTY_STATS: MediaReviewStats = {
  averageRating: 0,
  reviewCount: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

export function MediaReviewsSection({ mediaId, mediaName }: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const toast = useAppToast();

  const [stats, setStats] = useState<MediaReviewStats>(EMPTY_STATS);
  const [items, setItems] = useState<PublicMediaReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pubRes, eligRes] = await Promise.all([
        fetch(`/api/public/media/${mediaId}/reviews?locale=${locale}&limit=10`),
        fetch(`/api/media/${mediaId}/reviews`),
      ]);
      if (pubRes.ok) {
        const data = (await pubRes.json()) as {
          stats: MediaReviewStats;
          items: PublicMediaReview[];
        };
        setStats(data.stats ?? EMPTY_STATS);
        setItems(data.items ?? []);
      }
      if (eligRes.ok) {
        const elig = (await eligRes.json()) as { canReview?: boolean };
        setCanReview(Boolean(elig.canReview));
      }
    } finally {
      setLoading(false);
    }
  }, [mediaId, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleHelpful = async (reviewId: string) => {
    const res = await fetch(
      `/api/public/media/${mediaId}/reviews/helpful`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId }),
      },
    );
    if (res.status === 401) {
      toast.error(
        isKo ? "로그인이 필요합니다." : "Please sign in to continue.",
      );
      return;
    }
    if (!res.ok) return;
    const data = (await res.json()) as {
      helpful: boolean;
      helpfulCount: number;
    };
    setItems((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              helpfulCount: data.helpfulCount,
              userHasMarkedHelpful: data.helpful,
            }
          : r,
      ),
    );
  };

  const distMax = Math.max(...Object.values(stats.distribution), 1);

  return (
    <section className="mt-12" aria-labelledby="media-reviews-heading">
      <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
        [ REVIEWS ]
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h2
          id="media-reviews-heading"
          className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
        >
          {isKo ? "광고주 리뷰" : "Advertiser reviews"}
        </h2>
        {canReview ? (
          <Link
            href={`/media/${mediaId}/review`}
            className="inline-flex rounded-xl border-2 border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {isKo ? "리뷰 작성" : "Write a review"}
          </Link>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">
          {isKo ? "불러오는 중…" : "Loading…"}
        </p>
      ) : stats.reviewCount === 0 && items.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border/80 bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          {isKo
            ? `아직 ${mediaName}에 대한 리뷰가 없습니다. 집행 경험이 있으시면 첫 리뷰를 남겨 주세요.`
            : `No reviews for ${mediaName} yet. Be the first to share your experience.`}
        </p>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,240px)_1fr]">
          <div className="rounded-2xl border border-border/80 bg-card/50 p-5">
            <div className="flex items-center gap-3">
              <MediaStarRating
                value={stats.averageRating}
                size="lg"
                showValue
              />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {isKo
                ? `${stats.reviewCount}개 리뷰`
                : `${stats.reviewCount} reviews`}
            </p>
            <ul className="mt-5 space-y-2">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const count = stats.distribution[star];
                const pct = Math.round((count / distMax) * 100);
                return (
                  <li key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 tabular-nums text-muted-foreground">
                      {star}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-400/90"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <ul className="space-y-4">
            {items.map((review) => (
              <li
                key={review.id}
                className="rounded-2xl border border-border/80 bg-card/40 p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {review.authorLabel}
                  </span>
                  {review.isVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      <BadgeCheck className="h-3 w-3" />
                      {isKo ? "실집행 인증" : "Verified execution"}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <MediaStarRating value={review.rating} size="sm" />
                  <span className="text-sm font-bold text-foreground">
                    {review.title}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {review.body}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  {review.campaignPeriod ? (
                    <span className="rounded-md border border-border/60 px-2 py-0.5">
                      {review.campaignPeriod}
                    </span>
                  ) : null}
                  {review.industry ? (
                    <span className="rounded-md border border-border/60 px-2 py-0.5">
                      {review.industry}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void toggleHelpful(review.id)}
                  className={cn(
                    "mt-4 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    review.userHasMarkedHelpful
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : "border-border/70 text-muted-foreground hover:bg-muted",
                  )}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {isKo ? "도움이 됐어요" : "Helpful"}
                  <span className="tabular-nums">({review.helpfulCount})</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
