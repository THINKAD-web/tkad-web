"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { X, Sparkles, CheckCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Spinner from "@/components/spinner";
import ErrorToast from "@/components/error-toast";

const inputClass =
  "h-11 border-slate-200 focus:border-gold focus:ring-gold/20";

const selectClass =
  "h-11 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus:border-gold focus:ring-[3px] focus:ring-gold/20 md:text-sm";

export type SolutionCtaModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function SolutionCtaModal({ open, onClose }: SolutionCtaModalProps) {
  const locale = useLocale();
  const isKo = locale === "ko";

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [adGoal, setAdGoal] = useState<"brand" | "promotion" | "event">("brand");
  const [budget, setBudget] = useState<"under5" | "5to10" | "over10">("under5");
  const [region, setRegion] = useState<"seoul" | "capital" | "nationwide" | "other">(
    "seoul"
  );
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!open) {
      setSubmitted(false);
      setAdGoal("brand");
      setBudget("under5");
      setRegion("seoul");
      setCompany("");
      setContactName("");
      setPhone("");
      setEmail("");
    }
  }, [open]);

  useEffect(() => {
    if (!submitted) return;
    const id = window.setTimeout(() => {
      onClose();
    }, 3000);
    return () => window.clearTimeout(id);
  }, [submitted, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(false);
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSubmitted(true);
    } catch {
      setSubmitError(true);
    } finally {
      setLoading(false);
    }
  };

  const adGoalOptions = [
    { value: "brand" as const, ko: "브랜드 인지도", en: "Brand awareness" },
    { value: "promotion" as const, ko: "프로모션", en: "Promotion" },
    { value: "event" as const, ko: "이벤트", en: "Event" },
  ];

  const budgetOptions = [
    { value: "under5" as const, ko: "500만원 미만", en: "Under ₩5M" },
    { value: "5to10" as const, ko: "500-1000만원", en: "₩5M–₩10M" },
    { value: "over10" as const, ko: "1000만원 이상", en: "₩10M+" },
  ];

  const regionOptions = [
    { value: "seoul" as const, ko: "서울", en: "Seoul" },
    { value: "capital" as const, ko: "수도권", en: "Capital area" },
    { value: "nationwide" as const, ko: "전국", en: "Nationwide" },
    { value: "other" as const, ko: "기타", en: "Other" },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => !submitted && onClose()}
        aria-hidden
      />
      <div
        className="relative w-full max-w-lg animate-fade-in-up rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="solution-cta-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label={isKo ? "닫기" : "Close"}
        >
          <X className="h-4 w-4" />
        </button>

        {submitted ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gold/15 ring-2 ring-gold/30">
              <CheckCircle className="h-10 w-10 text-gold-dark animate-in zoom-in-50 duration-500" />
            </div>
            <p className="text-lg font-bold text-navy">
              {isKo ? "담당자가 24시간 내 연락드립니다" : "We will contact you within 24 hours"}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 pr-8">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 text-xs font-bold text-gold-dark">
                <Sparkles className="h-3.5 w-3.5" />
                {isKo ? "맞춤 솔루션" : "Custom solution"}
              </div>
              <h2 id="solution-cta-title" className="text-xl font-bold text-navy">
                {isKo ? "맞춤 상담 설문" : "Solution survey"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isKo
                  ? "아래 정보를 남겨주시면 담당자가 맞춤 제안을 드립니다."
                  : "Share a few details and we will tailor a proposal for you."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {submitError && (
                <ErrorToast
                  onRetry={() => handleSubmit(new Event("submit") as unknown as React.FormEvent)}
                  onDismiss={() => setSubmitError(false)}
                />
              )}
              <div className="absolute -left-[9999px]" aria-hidden="true" tabIndex={-1}>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-semibold text-navy">
                  {isKo ? "광고 목표" : "Ad goal"}
                </legend>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {adGoalOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors sm:min-w-[7.5rem] ${
                        adGoal === opt.value
                          ? "border-gold-dark bg-gold/10 text-navy ring-1 ring-gold-dark/40"
                          : "border-slate-200 text-navy/80 hover:border-gold/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="adGoal"
                        value={opt.value}
                        checked={adGoal === opt.value}
                        onChange={() => setAdGoal(opt.value)}
                        className="size-4 accent-gold-dark"
                      />
                      {isKo ? opt.ko : opt.en}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label
                  htmlFor="solution-budget"
                  className="mb-2 block text-sm font-semibold text-navy"
                >
                  {isKo ? "예산 범위" : "Budget range"}
                </label>
                <select
                  id="solution-budget"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value as typeof budget)}
                  className={selectClass}
                >
                  {budgetOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {isKo ? opt.ko : opt.en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="solution-region"
                  className="mb-2 block text-sm font-semibold text-navy"
                >
                  {isKo ? "타겟 지역" : "Target region"}
                </label>
                <select
                  id="solution-region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value as typeof region)}
                  className={selectClass}
                >
                  {regionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {isKo ? opt.ko : opt.en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="solution-company"
                  className="mb-2 block text-sm font-semibold text-navy"
                >
                  {isKo ? "회사명" : "Company"}
                </label>
                <Input
                  id="solution-company"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={isKo ? "회사명을 입력해주세요" : "Company name"}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="solution-contact"
                  className="mb-2 block text-sm font-semibold text-navy"
                >
                  {isKo ? "담당자명" : "Contact name"}
                </label>
                <Input
                  id="solution-contact"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder={isKo ? "담당자명" : "Name"}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="solution-phone"
                  className="mb-2 block text-sm font-semibold text-navy"
                >
                  {isKo ? "연락처" : "Phone"}
                </label>
                <Input
                  id="solution-phone"
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={isKo ? "010-0000-0000" : "Phone number"}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="solution-email"
                  className="mb-2 block text-sm font-semibold text-navy"
                >
                  {isKo ? "이메일" : "Email"}
                </label>
                <Input
                  id="solution-email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isKo ? "name@company.com" : "name@company.com"}
                  className={inputClass}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-gold font-bold text-navy hover:bg-gold-dark text-sm"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2" />
                    {isKo ? "전송 중..." : "Sending..."}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {isKo ? "맞춤 상담 신청" : "Request consultation"}
                  </>
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
