"use client";

import { useCallback, useEffect, useState } from "react";
import { HandCoins, Loader2 } from "lucide-react";
import { ownerGlassCard } from "@/components/media-owner/media-owner-shell";
import { useAppToast } from "@/lib/use-toast";
import { useLocale } from "next-intl";

type NegotiationRow = {
  id: string;
  mediaId: string;
  mediaName: string;
  listLabel: string;
  proposedLabel: string;
  companyName: string | null;
  message: string | null;
  expiresAt: string;
};

export function MediaOwnerPriceNegotiations() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const toast = useAppToast();
  const [items, setItems] = useState<NegotiationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/media-owner/price-negotiations", {
      cache: "no-store",
    });
    const json = await res.json();
    if (json.ok && Array.isArray(json.data?.items)) {
      setItems(json.data.items as NegotiationRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function respond(id: string, accept: boolean) {
    setActingId(id);
    try {
      const res = await fetch(`/api/media-owner/price-negotiations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error?.message ?? (isKo ? "처리 실패" : "Failed"));
        return;
      }
      setItems((prev) => prev.filter((r) => r.id !== id));
      const data = json.data as {
        quoteId?: string | null;
        contractUrl?: string | null;
      };
      if (accept && data.quoteId) {
        toast.success(
          isKo
            ? `수락 완료 · 견적·계약 자동 생성 (${data.quoteId.slice(0, 8)}…)`
            : `Accepted · quote & contract created`,
        );
      } else {
        toast.success(
          accept
            ? isKo
              ? "제안을 수락했습니다. 광고주에게 계약 링크 메일을 보냈습니다."
              : "Accepted. Contract link emailed to advertiser."
            : isKo
              ? "제안을 검토 완료(거절) 처리했습니다."
              : "Declined and advertiser notified.",
        );
      }
    } finally {
      setActingId(null);
    }
  }

  if (loading) {
    return (
      <div className={ownerGlassCard}>
        <Loader2 className="h-5 w-5 animate-spin text-violet-300" />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className={ownerGlassCard}>
      <h3 className="flex items-center gap-2 font-semibold text-white">
        <HandCoins className="h-4 w-4 text-emerald-300" />
        {isKo ? "가격 제안 (24시간 내 회신)" : "Price proposals (reply within 24h)"}
      </h3>
      <p className="mt-1 text-xs text-white/50">
        {isKo
          ? "광고주 연락처는 익명으로 전달됩니다. 수락 시 담당자가 견적·계약을 이어갑니다."
          : "Advertiser contact is anonymized. Acceptance triggers quote follow-up."}
      </p>
      <ul className="mt-4 space-y-3">
        {items.map((row) => {
          const hoursLeft = Math.max(
            0,
            Math.round(
              (new Date(row.expiresAt).getTime() - Date.now()) / 3_600_000,
            ),
          );
          return (
            <li
              key={row.id}
              className="rounded-xl border border-white/10 bg-black/25 p-4"
            >
              <p className="font-medium text-white">{row.mediaName}</p>
              <p className="mt-1 font-mono text-sm text-violet-200">
                {isKo ? "표시가" : "List"} {row.listLabel} →{" "}
                {isKo ? "제안" : "Offer"} {row.proposedLabel}
              </p>
              {row.companyName ? (
                <p className="mt-1 text-xs text-white/55">{row.companyName}</p>
              ) : null}
              {row.message ? (
                <p className="mt-2 text-sm text-white/70">{row.message}</p>
              ) : null}
              <p className="mt-2 text-xs text-amber-200/90">
                {isKo ? `남은 시간 약 ${hoursLeft}시간` : `~${hoursLeft}h left`}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={actingId === row.id}
                  onClick={() => void respond(row.id, true)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {isKo ? "수락" : "Accept"}
                </button>
                <button
                  type="button"
                  disabled={actingId === row.id}
                  onClick={() => void respond(row.id, false)}
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/80 disabled:opacity-50"
                >
                  {isKo ? "검토 완료" : "Decline"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
