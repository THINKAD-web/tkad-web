"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { MediaStarRatingInput } from "@/components/media/media-star-rating";
import { useAppToast } from "@/lib/use-toast";

type Labels = {
  title: string;
  subtitle: string;
  rating: string;
  reviewTitle: string;
  reviewBody: string;
  campaignPeriod: string;
  industry: string;
  submit: string;
  back: string;
  pendingNote: string;
  loginRequired: string;
  alreadyReviewed: string;
};

type Props = {
  mediaId: string;
  mediaName: string;
  labels: Labels;
};

export function WriteMediaReviewClient({
  mediaId,
  mediaName,
  labels,
}: Props) {
  const router = useRouter();
  const toast = useAppToast();

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [campaignPeriod, setCampaignPeriod] = useState("");
  const [industry, setIndustry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [eligibility, setEligibility] = useState<
    "loading" | "ok" | "login" | "done"
  >("loading");

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/media/${mediaId}/reviews`);
      if (res.status === 401 || !res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          reason?: string;
        };
        if (data.reason === "already_reviewed") {
          setEligibility("done");
          return;
        }
        setEligibility("login");
        return;
      }
      const data = (await res.json()) as { canReview?: boolean; reason?: string };
      if (!data.canReview) {
        setEligibility(data.reason === "already_reviewed" ? "done" : "login");
        return;
      }
      setEligibility("ok");
    })();
  }, [mediaId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/media/${mediaId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          title,
          body,
          campaignPeriod: campaignPeriod || null,
          industry: industry || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
      };
      if (res.status === 401) {
        toast.error(labels.loginRequired);
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? "Failed");
        return;
      }
      toast.success(labels.pendingNote);
      router.push(`/media/${mediaId}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (eligibility === "loading") {
    return (
      <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
    );
  }

  if (eligibility === "login") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{labels.title}</h1>
        <p className="text-muted-foreground">{labels.loginRequired}</p>
        <Link
          href={`/login?next=/media/${mediaId}/review`}
          className="inline-flex rounded-xl bg-foreground px-4 py-2 tkad-type-title text-background"
        >
          Login
        </Link>
      </div>
    );
  }

  if (eligibility === "done") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{labels.title}</h1>
        <p className="text-muted-foreground">{labels.alreadyReviewed}</p>
        <Link
          href={`/media/${mediaId}`}
          className="text-sm font-medium text-accent underline"
        >
          {labels.back}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/media/${mediaId}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {labels.back}
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{labels.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {labels.subtitle.replace("{name}", mediaName)}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <div>
          <label className="text-sm font-medium">{labels.rating}</label>
          <div className="mt-2">
            <MediaStarRatingInput value={rating} onChange={setRating} />
          </div>
        </div>

        <div>
          <label htmlFor="review-title" className="text-sm font-medium">
            {labels.reviewTitle}
          </label>
          <input
            id="review-title"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
          />
        </div>

        <div>
          <label htmlFor="review-body" className="text-sm font-medium">
            {labels.reviewBody}
          </label>
          <textarea
            id="review-body"
            required
            minLength={10}
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="campaign-period" className="text-sm font-medium">
              {labels.campaignPeriod}
            </label>
            <input
              id="campaign-period"
              maxLength={80}
              placeholder="2025.03 – 2025.05"
              value={campaignPeriod}
              onChange={(e) => setCampaignPeriod(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="industry" className="text-sm font-medium">
              {labels.industry}
            </label>
            <input
              id="industry"
              maxLength={60}
              placeholder="뷰티"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-[color:var(--qp-accent)] py-3 tkad-type-title text-white disabled:opacity-50"
        >
          {labels.submit}
        </button>
      </form>
    </div>
  );
}
