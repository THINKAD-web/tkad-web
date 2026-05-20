"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Bid = {
  id: string;
  status: string;
  priceAmount: number | null;
  benefits: string | null;
  message: string | null;
  media: { name: string; region: string; type: string };
  owner: {
    name: string;
    email: string;
    tier: string;
    avgRating: number | null;
    reviewCount: number;
    avgResponseMinutes: number | null;
  };
};

type Detail = {
  id: string;
  status: string;
  summaryKo: string;
  regionLabel: string | null;
  periodLabel: string | null;
  industryAnonymized: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  daysLeft: number;
  bids: Bid[];
};

export function AdminBiddingDetailClient({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/biddings/${id}`, { cache: "no-store" });
    const json = await res.json();
    setDetail(json.openBid ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: "approve" | "select", bidId: string) {
    setBusy(bidId);
    await fetch(`/api/admin/biddings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, bidId }),
    });
    setBusy(null);
    await load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!detail) {
    return (
      <p className="p-6 text-sm text-muted-foreground">비딩을 찾을 수 없습니다.</p>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Link href="/admin/biddings" className="text-sm text-primary hover:underline">
        ← 목록
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{detail.summaryKo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {detail.industryAnonymized} · D-{detail.daysLeft} · {detail.status}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">광고주 조건</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {detail.regionLabel ? <p>지역: {detail.regionLabel}</p> : null}
          {detail.periodLabel ? <p>기간: {detail.periodLabel}</p> : null}
          {detail.budgetMin != null || detail.budgetMax != null ? (
            <p>
              예산: {detail.budgetMin ?? "—"} ~ {detail.budgetMax ?? "—"} 만원
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="font-bold">매체사 제안 ({detail.bids.length})</h2>
        {detail.bids.map((b) => (
          <Card key={b.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {b.media.name} — {b.owner.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                {b.owner.tier}
                {b.owner.avgRating != null
                  ? ` · ⭐ ${b.owner.avgRating} (${b.owner.reviewCount}건)`
                  : ""}
                {b.owner.avgResponseMinutes != null
                  ? ` · 응답 ${b.owner.avgResponseMinutes}분`
                  : ""}
              </p>
              {b.priceAmount != null ? (
                <p className="font-semibold">{b.priceAmount.toLocaleString()}만원</p>
              ) : null}
              {b.benefits ? <p>혜택: {b.benefits}</p> : null}
              {b.message ? <p className="text-muted-foreground">{b.message}</p> : null}
              <p className="text-xs text-muted-foreground">상태: {b.status}</p>
              <div className="flex gap-2 pt-2">
                {b.status === "SUBMITTED" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === b.id}
                    onClick={() => void act("approve", b.id)}
                  >
                    싱크드 검토 완료
                  </Button>
                ) : null}
                {["SUBMITTED", "APPROVED"].includes(b.status) ? (
                  <Button
                    size="sm"
                    disabled={busy === b.id}
                    onClick={() => void act("select", b.id)}
                  >
                    광고주 선택 → 계약 진행
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
