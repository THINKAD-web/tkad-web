"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";
import {
  MediaOwnerPageLoader,
  ownerGlassCard,
  ownerInputCls,
} from "@/components/media-owner/media-owner-shell";

type BidDetail = {
  id: string;
  status: string;
  priceAmount: number | null;
  benefits: string | null;
  message: string | null;
  media: { id: string; name: string; type: string; region: string; price: number };
  openBid: {
    summaryKo: string;
    regionLabel: string | null;
    budgetMin: number | null;
    budgetMax: number | null;
    periodLabel: string | null;
    industryAnonymized: string | null;
    daysLeft: number;
    status: string;
  };
};

export function MediaOwnerMatchDetailClient({ bidId }: { bidId: string }) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const router = useRouter();
  const [bid, setBid] = useState<BidDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [priceAmount, setPriceAmount] = useState("");
  const [benefits, setBenefits] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/media-owner/matches/${bidId}`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (json.ok) {
      const b = json.data.bid as BidDetail;
      setBid(b);
      if (b.priceAmount) setPriceAmount(String(b.priceAmount));
      if (b.benefits) setBenefits(b.benefits);
      if (b.message) setMessage(b.message);
    }
    setLoading(false);
  }, [bidId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function postAction(action: "interested" | "submit") {
    setBusy(true);
    setError(null);
    const body =
      action === "interested"
        ? { action }
        : {
            action,
            priceAmount: Number(priceAmount),
            benefits,
            message,
          };
    const res = await fetch(`/api/media-owner/matches/${bidId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) {
      setError(isKo ? "처리에 실패했습니다." : "Request failed.");
      return;
    }
    await load();
    if (action === "interested") {
      router.refresh();
    }
  }

  if (loading) return <MediaOwnerPageLoader />;
  if (!bid) {
    return (
      <p className={ownerGlassCard}>
        {isKo ? "문의를 찾을 수 없습니다." : "Inquiry not found."}
      </p>
    );
  }

  const canInterest = bid.status === "NOTIFY";
  const canSubmit = ["NOTIFY", "INTERESTED", "SUBMITTED"].includes(bid.status);
  const isClosed = bid.openBid.status !== "OPEN" && bid.openBid.status !== "REVIEWING";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold dark:text-white text-gray-900">
          {isKo ? "매칭 응답" : "Match response"}
        </h2>
        <p className="mt-1 text-sm text-violet-200/80">D-{bid.openBid.daysLeft}</p>
      </div>

      <div className={ownerGlassCard}>
        <p className="text-sm font-semibold dark:text-white text-gray-900">{bid.openBid.summaryKo}</p>
        <ul className="mt-3 space-y-1 text-xs dark:text-white text-gray-500">
          {bid.openBid.industryAnonymized ? (
            <li>
              {isKo ? "광고주" : "Advertiser"}: {bid.openBid.industryAnonymized}{" "}
              ({isKo ? "익명" : "anonymous"})
            </li>
          ) : null}
          {bid.openBid.periodLabel ? (
            <li>
              {isKo ? "기간" : "Period"}: {bid.openBid.periodLabel}
            </li>
          ) : null}
          <li>
            {isKo ? "매체" : "Media"}: {bid.media.name} ({bid.media.region})
          </li>
        </ul>
      </div>

      {canInterest ? (
        <button
          type="button"
          disabled={busy || isClosed}
          onClick={() => void postAction("interested")}
          className="w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-bold dark:text-white text-gray-900 hover:bg-violet-400 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          ) : isKo ? (
            "관심 있음 — 견적 작성하기"
          ) : (
            "Interested — submit quote"
          )}
        </button>
      ) : null}

      {(canSubmit && bid.status !== "NOTIFY") || bid.status === "SUBMITTED" ? (
        <form
          className={`${ownerGlassCard} space-y-4`}
          onSubmit={(e) => {
            e.preventDefault();
            void postAction("submit");
          }}
        >
          <p className="text-sm font-bold dark:text-white text-gray-900">
            {isKo ? "견적 제출" : "Submit quote"}
          </p>
          <label className="block text-xs dark:text-white text-gray-500">
            {isKo ? "제안 가격 (만원)" : "Price (10K KRW)"}
            <input
              className={`${ownerInputCls} mt-1`}
              type="number"
              min={1}
              required
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
              disabled={isClosed || bid.status === "SELECTED"}
            />
          </label>
          <label className="block text-xs dark:text-white text-gray-500">
            {isKo ? "추가 혜택" : "Extra benefits"}
            <textarea
              className={`${ownerInputCls} mt-1 min-h-[72px] py-2`}
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
              placeholder={
                isKo ? "예: 3일 연장 무료, 소재 제작 지원" : "e.g. free extension"
              }
              disabled={isClosed || bid.status === "SELECTED"}
            />
          </label>
          <label className="block text-xs dark:text-white text-gray-500">
            {isKo ? "메모" : "Message"}
            <textarea
              className={`${ownerInputCls} mt-1 min-h-[72px] py-2`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isClosed || bid.status === "SELECTED"}
            />
          </label>
          <p className="text-[10px] dark:text-white">
            {isKo
              ? "* 제출 후 THINKAD 검토를 거쳐 광고주에게 전달됩니다."
              : "* Submitted quotes are reviewed before reaching the advertiser."}
          </p>
          {bid.status !== "SELECTED" && !isClosed ? (
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-cyan-400 disabled:opacity-50"
            >
              {isKo ? "견적 제출" : "Submit"}
            </button>
          ) : null}
        </form>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
