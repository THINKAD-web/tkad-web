"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MEDIA_REVIEW_STATUS,
  reviewReasonLabelKo,
} from "@/lib/media-review-status";

type Props = {
  reviewStatus: string;
  reviewReason: string | null;
  onMarkReviewed?: () => void;
};

export function AdminMediaReviewFlagBadge({
  reviewStatus,
  reviewReason,
  onMarkReviewed,
}: Props) {
  if (reviewStatus === MEDIA_REVIEW_STATUS.reviewed) {
    return (
      <Badge
        variant="secondary"
        className="border border-border text-[10px] font-semibold"
        title={reviewReasonLabelKo(reviewReason)}
      >
        검토완료
      </Badge>
    );
  }
  if (reviewStatus !== MEDIA_REVIEW_STATUS.flagged) return null;

  const label = reviewReasonLabelKo(reviewReason);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <button
        type="button"
        title={label}
        className="inline-flex"
        onClick={() => window.alert(label)}
      >
        <Badge className="cursor-pointer border-amber-600/40 bg-amber-100 text-[10px] font-semibold text-amber-950 hover:bg-amber-200">
          검토 필요
        </Badge>
      </button>
      {onMarkReviewed ? (
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="h-6 px-2 text-[10px]"
          onClick={onMarkReviewed}
        >
          검토 완료
        </Button>
      ) : null}
    </span>
  );
}
