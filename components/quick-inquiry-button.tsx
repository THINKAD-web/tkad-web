"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { MessageSquarePlus, X, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Spinner from "@/components/spinner";
import ErrorToast from "@/components/error-toast";

export default function QuickInquiryButton() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(false);
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setOpen(false);
      }, 2500);
    } catch {
      setSubmitError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitted) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitted]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 hover:shadow-xl"
        style={{ backgroundColor: "#c9a84c" }}
        aria-label={isKo ? "빠른 문의" : "Quick Inquiry"}
      >
        <MessageSquarePlus className="h-6 w-6 text-white" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={isKo ? "빠른 문의" : "Quick Inquiry"}>
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !submitted && setOpen(false)}
            aria-label={isKo ? "닫기" : "Close"}
            tabIndex={-1}
          />
          <div className="relative w-full max-w-md animate-fade-in-up rounded-2xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              aria-label={isKo ? "닫기" : "Close"}
              className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>

            {submitted ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
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
                  {submitError && (
                    <ErrorToast
                      onRetry={() => handleSubmit(new Event("submit") as unknown as React.FormEvent)}
                      onDismiss={() => setSubmitError(false)}
                    />
                  )}
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
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
