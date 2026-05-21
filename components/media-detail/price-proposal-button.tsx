"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { HandCoins, Loader2, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Modal from "@/components/ui/modal";
import { getOrCreateTrackingSessionId } from "@/lib/tracking/client";

type Props = {
  mediaId: string;
  mediaName: string;
  listPriceWon: number;
};

export function PriceProposalButton({ mediaId, mediaName, listPriceWon }: Props) {
  const locale = useLocale();
  const isKo = locale.startsWith("ko");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [priceMan, setPriceMan] = useState(
    listPriceWon > 0 ? String(Math.round(listPriceWon / 10_000)) : "",
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [negotiationId, setNegotiationId] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<{
    contractUrl: string;
    previewUrl: string;
  } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const proposedPriceWon = Math.round(Number(priceMan) * 10_000);
      if (!email.trim() || !phone.trim() || proposedPriceWon <= 0) {
        setError(isKo ? "필수 항목을 입력해 주세요." : "Fill required fields.");
        return;
      }
      const res = await fetch(`/api/media/${mediaId}/price-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactEmail: email.trim(),
          contactPhone: phone.trim(),
          companyName: company.trim() || undefined,
          proposedPriceWon,
          message: message.trim() || undefined,
          sessionId: getOrCreateTrackingSessionId(),
          locale,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        negotiationId?: string;
      };
      if (!res.ok || !json.ok) {
        setError(isKo ? "제출에 실패했습니다." : "Submission failed.");
        return;
      }
      setDone(true);
      if (json.negotiationId) {
        setNegotiationId(json.negotiationId);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!done || !negotiationId || !email.trim() || accepted) return;

    const poll = async () => {
      try {
        const q = new URLSearchParams({ email: email.trim() });
        const res = await fetch(
          `/api/price-negotiations/${negotiationId}/status?${q}`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as {
          ok?: boolean;
          status?: string;
          contractUrl?: string | null;
          previewUrl?: string | null;
        };
        if (json.ok && json.status === "ACCEPTED" && json.contractUrl) {
          setAccepted({
            contractUrl: json.contractUrl,
            previewUrl: json.previewUrl ?? json.contractUrl,
          });
          if (pollRef.current) clearInterval(pollRef.current);
        }
        if (
          json.ok &&
          (json.status === "REJECTED" || json.status === "EXPIRED")
        ) {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        /* ignore */
      }
    };

    void poll();
    pollRef.current = setInterval(() => void poll(), 12_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [done, negotiationId, email, accepted]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-card px-4 text-sm font-bold text-foreground transition-colors hover:bg-muted sm:w-auto"
      >
        <HandCoins className="h-4 w-4" aria-hidden />
        {isKo ? "가격 제안하기" : "Propose a price"}
      </button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          if (done) {
            setDone(false);
            setError(null);
          }
        }}
        ariaLabel={isKo ? "가격 제안" : "Price proposal"}
        className="max-w-md border-border"
      >
        <div className="p-6">
          <h2 className="text-lg font-bold">
            {isKo ? "가격 제안하기" : "Propose a price"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isKo
              ? `「${mediaName}」에 희망 단가를 익명으로 전달합니다. 매체사가 24시간 내 회신합니다.`
              : `Your offer for “${mediaName}” is shared anonymously. Owners reply within 24h.`}
          </p>

          {done ? (
            <div className="mt-6 space-y-3">
              {accepted ? (
                <>
                  <p className="text-sm font-semibold text-emerald-600">
                    {isKo
                      ? "제안이 수락되었습니다. 아래에서 견적 확인 후 전자계약을 진행하세요."
                      : "Accepted. Review the quote and sign the e-contract below."}
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link
                      href={accepted.previewUrl}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-border px-4 py-2.5 text-sm font-bold"
                    >
                      {isKo ? "견적 미리보기" : "View quote"}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                    <Link
                      href={accepted.contractUrl}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-bold text-background"
                    >
                      {isKo ? "전자계약 진행" : "Sign contract"}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-sm font-semibold text-emerald-600">
                  {isKo
                    ? "제안이 접수되었습니다. 수락 시 이 화면과 이메일로 계약 링크가 열립니다."
                    : "Submitted. If accepted, contract links appear here and by email."}
                </p>
              )}
            </div>
          ) : (
            <form
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <label className="block text-xs font-semibold">
                {isKo ? "희망 월 단가 (만원)" : "Target monthly (×10K KRW)"}
                <input
                  type="number"
                  required
                  min={1}
                  value={priceMan}
                  onChange={(e) => setPriceMan(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold">
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold">
                {isKo ? "연락처" : "Phone"}
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold">
                {isKo ? "회사명 (선택)" : "Company (optional)"}
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold">
                {isKo ? "메모 (선택)" : "Note (optional)"}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-foreground py-3 text-sm font-bold text-background disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : isKo ? (
                  "익명 제안 보내기"
                ) : (
                  "Send offer"
                )}
              </button>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}
