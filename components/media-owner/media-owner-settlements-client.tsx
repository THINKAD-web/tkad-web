"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { FileText, Loader2 } from "lucide-react";
import {
  MediaOwnerPageLoader,
  ownerGlassCard,
} from "@/components/media-owner/media-owner-shell";
import { useAppToast } from "@/lib/use-toast";

type Settlement = {
  id: string;
  periodMonth: string;
  grossWon: number;
  feeWon: number;
  netWon: number;
  status: string;
  taxInvoiceRequestedAt: string | null;
  completedAt: string | null;
};

export function MediaOwnerSettlementsClient() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const toast = useAppToast();
  const [rows, setRows] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/media-owner/settlements", {
      cache: "no-store",
    });
    const json = await res.json();
    if (json.ok) setRows(json.data.settlements as Settlement[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function requestTaxInvoice(id: string) {
    setRequestingId(id);
    try {
      const res = await fetch(
        `/api/media-owner/settlements/${id}/tax-invoice`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(isKo ? "요청 실패" : "Failed");
        return;
      }
      toast.success(isKo ? "세금계산서 발행 요청이 접수되었습니다." : "Requested.");
      await load();
    } finally {
      setRequestingId(null);
    }
  }

  if (loading) return <MediaOwnerPageLoader />;

  const scheduled = rows.filter((r) => r.status === "SCHEDULED");
  const completed = rows.filter((r) => r.status === "COMPLETED");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold dark:text-white text-gray-900">
          {isKo ? "정산 내역" : "Settlements"}
        </h2>
        <p className="mt-1 text-sm dark:text-white text-gray-500">
          {isKo
            ? "플랫폼 수수료 15% 제외 후 정산 예정·완료 금액입니다."
            : "Net amounts after 15% platform fee."}
        </p>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-violet-200">
          {isKo ? "정산 예정" : "Scheduled"}
        </h3>
        {scheduled.length === 0 ? (
          <p className={ownerGlassCard}>
            {isKo ? "예정 내역 없음" : "None scheduled"}
          </p>
        ) : (
          <ul className="space-y-3">
            {scheduled.map((r) => (
              <li key={r.id} className={ownerGlassCard}>
                <p className="font-mono text-sm dark:text-white text-gray-900">{r.periodMonth}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums dark:text-white text-gray-900">
                  ₩{r.netWon.toLocaleString(isKo ? "ko-KR" : "en-US")}
                </p>
                <p className="text-xs dark:text-white">
                  {isKo ? "총" : "Gross"} ₩{r.grossWon.toLocaleString()} ·{" "}
                  {isKo ? "수수료" : "Fee"} ₩{r.feeWon.toLocaleString()}
                </p>
                {!r.taxInvoiceRequestedAt ? (
                  <button
                    type="button"
                    disabled={requestingId === r.id}
                    onClick={() => void requestTaxInvoice(r.id)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border dark:border-white/15 border-gray-200 px-3 py-2 text-xs dark:text-white text-gray-900 hover:dark:bg-white/5 bg-gray-50"
                  >
                    {requestingId === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    {isKo ? "세금계산서 발행 요청" : "Request tax invoice"}
                  </button>
                ) : (
                  <p className="mt-2 text-xs text-emerald-300/90">
                    {isKo ? "세금계산서 요청 완료" : "Tax invoice requested"}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold dark:text-white text-gray-600">
          {isKo ? "정산 완료" : "Completed"}
        </h3>
        {completed.length === 0 ? (
          <p className={ownerGlassCard}>
            {isKo ? "완료 내역 없음" : "None completed"}
          </p>
        ) : (
          <ul className="space-y-3">
            {completed.map((r) => (
              <li key={r.id} className={ownerGlassCard}>
                <p className="font-mono text-sm dark:text-white text-gray-900">{r.periodMonth}</p>
                <p className="mt-2 text-xl font-bold tabular-nums text-emerald-200">
                  ₩{r.netWon.toLocaleString(isKo ? "ko-KR" : "en-US")}
                </p>
                {r.completedAt ? (
                  <p className="mt-1 text-xs dark:text-white text-gray-400">
                    {new Date(r.completedAt).toLocaleDateString(
                      isKo ? "ko-KR" : "en-US",
                    )}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
