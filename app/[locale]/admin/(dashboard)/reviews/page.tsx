"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MediaStarRating } from "@/components/media/media-star-rating";

type ReviewItem = {
  id: string;
  mediaId: string;
  mediaName: string;
  userName: string;
  userEmail: string;
  rating: number;
  title: string;
  body: string;
  campaignPeriod: string | null;
  industry: string | null;
  isVerified: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

type StatusFilter = "all" | "PENDING" | "APPROVED" | "REJECTED";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminMediaReviewsPage() {
  const pathname = usePathname();
  const locale = useMemo(() => pathname.split("/")[1] || "ko", [pathname]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = statusFilter === "all" ? "all" : statusFilter;
      const res = await fetch(`/api/admin/media-reviews?status=${q}`);
      const data = (await res.json()) as {
        items?: ReviewItem[];
        pendingCount?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "load failed");
      setItems(data.items ?? []);
      setPendingCount(data.pendingCount ?? 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/media-reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) await load();
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">매체 리뷰 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            승인 후 공개 · 검수 대기 {pendingCount}건
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          새로고침
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["PENDING", `대기 (${pendingCount})`],
            ["all", "전체"],
            ["APPROVED", "승인"],
            ["REJECTED", "반려"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key as StatusFilter)}
            className={
              statusFilter === key
                ? "rounded-lg bg-foreground px-3 py-1.5 text-sm font-semibold text-background"
                : "rounded-lg border px-3 py-1.5 text-sm"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          불러오는 중…
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">표시할 리뷰가 없습니다.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((r) => (
            <li key={r.id}>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{r.title}</CardTitle>
                      <CardDescription>
                        {r.mediaName} · {r.userName} ({r.userEmail}) ·{" "}
                        {fmt(r.createdAt)}
                      </CardDescription>
                    </div>
                    <MediaStarRating value={r.rating} size="sm" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {r.body}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {r.campaignPeriod ? (
                      <span className="rounded border px-2 py-0.5">
                        {r.campaignPeriod}
                      </span>
                    ) : null}
                    {r.industry ? (
                      <span className="rounded border px-2 py-0.5">
                        {r.industry}
                      </span>
                    ) : null}
                    {r.isVerified ? (
                      <span className="rounded border border-emerald-500/40 px-2 py-0.5 text-emerald-600">
                        실집행 인증
                      </span>
                    ) : null}
                    <span className="rounded border px-2 py-0.5">{r.status}</span>
                  </div>
                  {r.status === "PENDING" ? (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        disabled={actingId === r.id}
                        onClick={() => void setStatus(r.id, "APPROVED")}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold dark:text-white text-gray-900"
                      >
                        <Check className="h-3.5 w-3.5" />
                        승인
                      </button>
                      <button
                        type="button"
                        disabled={actingId === r.id}
                        onClick={() => void setStatus(r.id, "REJECTED")}
                        className="inline-flex items-center gap-1 rounded-lg border border-destructive/50 px-3 py-1.5 text-xs font-semibold text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                        반려
                      </button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
