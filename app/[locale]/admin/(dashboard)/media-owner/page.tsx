"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PriceReq = {
  id: string;
  mediaName: string;
  currentPrice: number;
  requestedPrice: number;
  reason: string | null;
  owner: { name: string; email: string };
};

type Settlement = {
  id: string;
  periodMonth: string;
  netWon: number;
  grossWon: number;
  status: string;
  taxInvoiceRequestedAt: string | null;
  owner: { name: string; email: string };
};

export default function AdminMediaOwnerOpsPage() {
  const [priceReqs, setPriceReqs] = useState<PriceReq[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pr, st] = await Promise.all([
        fetch("/api/admin/media-price-changes?status=PENDING"),
        fetch("/api/admin/media-owner-settlements"),
      ]);
      const prJson = await pr.json();
      const stJson = await st.json();
      setPriceReqs(prJson.requests ?? []);
      setSettlements(stJson.settlements ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function reviewPrice(id: string, status: "APPROVED" | "REJECTED") {
    setBusy(id);
    try {
      await fetch(`/api/admin/media-price-changes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function completeSettlement(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/admin/media-owner-settlements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">매체사 운영</h1>
          <p className="text-sm text-muted-foreground">
            단가 수정 요청 검토 · 정산 완료 처리 (알림톡 자동 발송)
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          새로고침
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>단가 수정 요청</CardTitle>
              <CardDescription>승인 시 매체 DB 단가 즉시 반영</CardDescription>
            </CardHeader>
            <CardContent>
              {priceReqs.length === 0 ? (
                <p className="text-sm text-muted-foreground">대기 중 요청 없음</p>
              ) : (
                <ul className="space-y-3">
                  {priceReqs.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-lg border p-4 text-sm"
                    >
                      <p className="font-medium">{r.mediaName}</p>
                      <p className="text-muted-foreground">
                        {r.owner.name} · {r.owner.email}
                      </p>
                      <p className="mt-2 tabular-nums">
                        ₩{r.currentPrice.toLocaleString()} → ₩
                        {r.requestedPrice.toLocaleString()}
                      </p>
                      {r.reason ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {r.reason}
                        </p>
                      ) : null}
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          disabled={busy === r.id}
                          onClick={() => void reviewPrice(r.id, "APPROVED")}
                        >
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === r.id}
                          onClick={() => void reviewPrice(r.id, "REJECTED")}
                        >
                          반려
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>정산</CardTitle>
              <CardDescription>
                완료 처리 시 매체사에 정산 완료 알림톡 발송
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                {settlements.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {s.periodMonth} · {s.owner.name}
                      </p>
                      <p className="text-muted-foreground">{s.owner.email}</p>
                      <p className="mt-1 tabular-nums font-semibold">
                        ₩{s.netWon.toLocaleString()} ({s.status})
                      </p>
                      {s.taxInvoiceRequestedAt ? (
                        <p className="text-xs text-amber-700">
                          세금계산서 요청됨
                        </p>
                      ) : null}
                    </div>
                    {s.status === "SCHEDULED" ? (
                      <Button
                        size="sm"
                        disabled={busy === s.id}
                        onClick={() => void completeSettlement(s.id)}
                      >
                        정산 완료
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
