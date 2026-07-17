"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, FileText, Send } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";

type QuoteRow = {
  id: string;
  status: string;
  totalAmount: number;
  mediaIds: string[];
  period: string;
};

type Props = {
  inquiryId: string;
  quote: QuoteRow | null;
};

export function AdminInquiryQuotePanel({ inquiryId, quote }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendQuote() {
    if (!quote || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/ooh-quotes/${quote.id}/send-quote`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("send_failed");
      router.refresh();
    } catch {
      setError("견적 발송에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (!quote) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
        <p className="font-semibold">견적서 초안 없음</p>
        <p className="mt-1 text-xs">
          매체 ID가 포함된 문의는 접수 시 자동 생성됩니다. (#{inquiryId.slice(-8)})
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5">
      <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-emerald-800">
        [ 견적서 초안 ]
      </p>
      <p className="mt-2 text-sm font-semibold text-emerald-950">
        상태: {quote.status} · ₩{quote.totalAmount.toLocaleString("ko-KR")}만 ·{" "}
        {quote.period}
      </p>
      <p className="mt-1 text-xs text-emerald-900">
        매체 {quote.mediaIds.length}건 · ID {quote.id.slice(-8)}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/quote/${quote.id}/preview`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"
        >
          <FileText className="h-3.5 w-3.5" />
          견적서 초안 보기
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href={`/admin/quotes?tab=booking&highlight=${quote.id}`}
          className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"
        >
          연결된 견적 보기
        </Link>
        {(quote.status === "draft" || quote.status === "sent") && (
          <BtnBlock
            type="button"
            variant="accent"
            size="sm"
            disabled={busy}
            onClick={() => void sendQuote()}
            className="inline-flex items-center gap-1"
          >
            <Send className="h-3.5 w-3.5" />
            {busy ? "발송 중…" : "견적서 발송"}
          </BtnBlock>
        )}
      </div>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
