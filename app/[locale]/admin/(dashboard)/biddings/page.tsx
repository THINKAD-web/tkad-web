"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type BidRow = {
  id: string;
  mode: string;
  status: string;
  summaryKo: string;
  regionLabel: string | null;
  industryAnonymized: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  periodLabel: string | null;
  daysLeft: number;
  bidCount: number;
  submittedCount: number;
  createdAt: string;
};

export default function AdminBiddingsPage() {
  const [items, setItems] = useState<BidRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/biddings", { cache: "no-store" });
      const json = await res.json();
      setItems(json.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">오픈 비딩</h1>
          <p className="text-sm text-muted-foreground">
            광고주 조건별 매체사 제안 · 싱크드 검토 · 광고주 선택
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          새로고침
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            진행 중인 비딩이 없습니다. 문의 접수 시 자동 생성됩니다.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((row) => (
            <Link key={row.id} href={`/admin/biddings/${row.id}`}>
              <Card className="transition-colors hover:border-primary/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{row.summaryKo}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5">{row.status}</span>
                  <span>{row.mode === "OPEN_BID" ? "오픈 비딩" : "일반 매칭"}</span>
                  <span>D-{row.daysLeft}</span>
                  <span>제안 {row.submittedCount}/{row.bidCount}</span>
                  {row.industryAnonymized ? (
                    <span>{row.industryAnonymized}</span>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
