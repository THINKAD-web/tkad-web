"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { MessageSquarePlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Modal from "@/components/ui/modal";
import Spinner from "@/components/spinner";
import { useToast } from "@/components/toast-provider";
import { CheckCircle } from "lucide-react";

const STORAGE_KEY = "tkad-quick-inquiry-count";
const KAKAO_CHANNEL_URL = "https://pf.kakao.com/_thinkad";

function readInquiryCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = parseInt(raw ?? "0", 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function persistInquiryCount(next: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    /* ignore */
  }
}

export default function QuickInquiryButton() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const fullLabel = isKo ? "빠른 문의" : "Quick Inquiry";

  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inquiryCount, setInquiryCount] = useState(0);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [typed, setTyped] = useState("");

  const typingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    setInquiryCount(readInquiryCount());
  }, []);

  useEffect(() => {
    typingTimers.current.forEach(clearTimeout);
    typingTimers.current = [];
    let cancelled = false;

    const push = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      typingTimers.current.push(id);
    };

    const runCycle = () => {
      if (cancelled) return;
      setBubbleVisible(true);
      setTyped("");
      let i = 0;
      const typeNext = () => {
        if (cancelled) return;
        if (i <= fullLabel.length) {
          setTyped(fullLabel.slice(0, i));
          i += 1;
          push(typeNext, 85);
        } else {
          push(() => {
            if (cancelled) return;
            setBubbleVisible(false);
            push(runCycle, 5200);
          }, 3200);
        }
      };
      push(typeNext, 400);
    };

    push(runCycle, 1800);

    return () => {
      cancelled = true;
      typingTimers.current.forEach(clearTimeout);
      typingTimers.current = [];
    };
  }, [fullLabel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSubmitted(true);
      toast("success", isKo ? "문의가 접수되었습니다!" : "Inquiry submitted!");
      setInquiryCount((c) => {
        const next = c + 1;
        persistInquiryCount(next);
        return next;
      });
      setTimeout(() => {
        setSubmitted(false);
        setOpen(false);
      }, 2500);
    } catch {
      toast("error", isKo ? "일시적 오류가 발생했습니다. 다시 시도해 주세요." : "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-24 right-4 z-50 flex flex-row-reverse items-center gap-2">
        {bubbleVisible && (
          <div
            className="pointer-events-none max-w-[11rem] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-navy shadow-lg"
            aria-hidden
          >
            <span>{typed}</span>
            <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-navy align-middle" />
          </div>
        )}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 hover:shadow-xl"
            style={{ backgroundColor: "#9b3c31" }}
            aria-label={fullLabel}
          >
            <MessageSquarePlus className="h-6 w-6 text-white" />
          </button>
          {inquiryCount > 0 && (
            <span className="absolute -top-1 -right-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-navy px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {inquiryCount > 99 ? "99+" : inquiryCount}
            </span>
          )}
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        locked={submitted}
        ariaLabel={fullLabel}
        className="max-w-md"
      >
        <div className="p-6">
          {submitted ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 ring-2 ring-gold/30">
                <CheckCircle className="h-8 w-8 text-gold-dark" />
              </div>
              <h3 className="text-xl font-bold text-navy">
                {isKo ? "문의가 접수되었습니다!" : "Inquiry Submitted!"}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {isKo
                  ? "담당자가 빠르게 연락드리겠습니다."
                  : "Our team will contact you shortly."}
              </p>
            </div>
          ) : (
            <>
              {inquiryCount > 0 && (
                <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-medium text-slate-600">
                  {isKo
                    ? `이전 문의 ${inquiryCount}건 접수됨`
                    : `${inquiryCount} previous ${inquiryCount === 1 ? "inquiry" : "inquiries"} submitted`}
                </p>
              )}
              <div className="mb-6">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 text-xs font-bold text-gold-dark">
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  {isKo ? "빠른 문의" : "Quick Inquiry"}
                </div>
                <h3 className="text-xl font-bold text-navy">
                  {isKo ? "간편 문의하기" : "Quick Contact"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isKo
                    ? "간단한 정보만 남겨주시면 빠르게 답변드립니다."
                    : "Leave your details and we'll get back to you quickly."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="absolute -left-[9999px]" aria-hidden="true" tabIndex={-1}>
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                </div>
                <Input
                  required
                  placeholder={isKo ? "회사명" : "Company Name"}
                  className="h-11 border-slate-200 focus:border-gold focus:ring-gold/20"
                />
                <Input
                  required
                  placeholder={isKo ? "담당자명" : "Contact Person"}
                  className="h-11 border-slate-200 focus:border-gold focus:ring-gold/20"
                />
                <Input
                  required
                  type="tel"
                  placeholder={isKo ? "연락처 (010-0000-0000)" : "Phone (010-0000-0000)"}
                  className="h-11 border-slate-200 focus:border-gold focus:ring-gold/20"
                />
                <Textarea
                  required
                  rows={3}
                  placeholder={
                    isKo
                      ? "간단한 문의내용을 입력해주세요"
                      : "Please briefly describe your inquiry"
                  }
                  className="resize-none border-slate-200 focus:border-gold focus:ring-gold/20"
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full bg-gold text-navy font-bold hover:bg-gold-dark rounded-xl text-sm"
                >
                  {loading ? (
                    <>
                      <Spinner className="mr-2" />
                      {isKo ? "전송 중..." : "Sending..."}
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {isKo ? "문의 보내기" : "Send Inquiry"}
                    </>
                  )}
                </Button>
                <a
                  href={KAKAO_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-full items-center justify-center rounded-xl border-2 border-[#FEE500] bg-[#FEE500]/10 text-sm font-bold text-navy transition-colors hover:bg-[#FEE500]/25"
                >
                  {isKo ? "카카오톡으로 문의하기" : "Contact via KakaoTalk"}
                </a>
              </form>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
