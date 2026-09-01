"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Loader2, Radio } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";

type Item = {
  id: string;
  mediaName: string;
  mediaLocation: string;
  startDate: string;
  endDate: string;
  amount: number;
  status: string;
  contactName: string;
  contactEmail: string;
  creativeUrl: string;
  paidAt: string | null;
  executionConfirmedAt: string | null;
  lastPayment: { provider: string; status: string; amount: number } | null;
};

function AdminInstantBookingsPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/instant-bookings");
      const data = (await res.json()) as { items?: Item[] };
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmExecution = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/instant-bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm_execution" }),
      });
      if (!res.ok) throw new Error("failed");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header>
        <p className="tkad-type-label text-muted-foreground">
          Operations
        </p>
        <h1 className="text-2xl font-black tracking-tight">즉시 예약 (소액 DOOH)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          온라인 결제 완료 건 · 소재 다운로드 · 집행 확정 처리
        </p>
      </header>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          불러오는 중…
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">예약 내역이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-[16px] border border-border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 tkad-type-label">
              <tr>
                <th className="px-3 py-2">매체</th>
                <th className="px-3 py-2">기간</th>
                <th className="px-3 py-2">금액</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">담당</th>
                <th className="px-3 py-2">소재</th>
                <th className="px-3 py-2">집행</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-border/60 ${ highlightId === row.id ? "bg-primary/10" : "" }`}
                >
                  <td className="px-3 py-3">
                    <p className="font-semibold">{row.mediaName}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.mediaLocation}
                    </p>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {row.startDate} ~ {row.endDate}
                  </td>
                  <td className="px-3 py-3">
                    {row.amount.toLocaleString("ko-KR")}원
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                      {row.status}
                    </span>
                    {row.lastPayment ? (
                      <p className="mt-1 tkad-type-note text-muted-foreground">
                        {row.lastPayment.provider} / {row.lastPayment.status}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <p>{row.contactName}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.contactEmail}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <a
                      href={row.creativeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary underline"
                    >
                      <Download className="h-3 w-3" />
                      다운로드
                    </a>
                  </td>
                  <td className="px-3 py-3">
                    {row.status === "paid" && !row.executionConfirmedAt ? (
                      <BtnBlock
                        size="sm"
                        variant="secondary"
                        disabled={busyId === row.id}
                        onClick={() => void confirmExecution(row.id)}
                      >
                        {busyId === row.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Radio className="h-3 w-3" />
                        )}
                        집행 확정
                      </BtnBlock>
                    ) : row.executionConfirmedAt ? (
                      <span className="text-xs text-muted-foreground">
                        {row.executionConfirmedAt.slice(0, 10)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminInstantBookingsPageWithSuspense() {
  return (
    <Suspense fallback={null}>
      <AdminInstantBookingsPage />
    </Suspense>
  );
}
