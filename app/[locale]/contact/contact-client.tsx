"use client";

import { useTranslations } from "next-intl";
import { CONTACT_EMAIL } from "@/lib/constants";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/toast-provider";
import { TurnstileWidget } from "@/components/turnstile";
import ScrollAnimate from "@/components/scroll-animate";
import Spinner from "@/components/spinner";

/* ── Tailwind class constants (mirrors shadcn/ui styling without Radix imports) ── */

const inputCls =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const selectCls =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const textareaCls =
  "flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

const btnCls =
  "inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold whitespace-nowrap shadow-sm transition-all duration-200 outline-none hover:-translate-y-px hover:shadow-md active:translate-y-0 active:scale-95 focus-visible:ring-[3px] focus-visible:ring-cta/35 disabled:pointer-events-none disabled:opacity-50 bg-cta text-white hover:bg-cta-hover h-11 px-6";

const labelCls = "block text-sm font-medium text-foreground mb-1.5";

const PHONE_RE = /^[\d\-+() ]{8,}$/;

export default function ContactPage() {
  const t = useTranslations("contact");
  const { toast } = useToast();

  /* ── form state ── */
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [inquiryType, setInquiryType] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [cfToken, setCfToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* ── URL-param referral context (case study / academy) ── */
  const [refSource, setRefSource] = useState<string | null>(null);
  const [caseTitle, setCaseTitle] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const cTitle = params.get("case");
    if (ref) setRefSource(ref);
    if (cTitle) setCaseTitle(decodeURIComponent(cTitle));
    if (ref === "case-study" && cTitle) {
      setMessage(
        t("caseRefMessageTemplate", { title: decodeURIComponent(cTitle) }),
      );
    } else if (ref === "academy") {
      setMessage(t("academyRefMessageTemplate"));
    }
  }, [t]);

  /* ── submit ── */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim()) {
        toast("warning", `${t("name")} 필수 입력입니다.`);
        return;
      }
      if (!phone.trim() || !PHONE_RE.test(phone)) {
        toast("warning", `${t("phone")} 형식을 확인해주세요.`);
        return;
      }
      if (!message.trim()) {
        toast("warning", `${t("message")} 필수 입력입니다.`);
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            inquiryType: inquiryType || undefined,
            budget: budget || undefined,
            message: message.trim(),
            cfTurnstileToken: cfToken || undefined,
          }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            detail?: string;
            fields?: string[];
          };

          let userMsg: string;
          if (res.status === 429) {
            userMsg =
              "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
          } else if (res.status === 403) {
            userMsg =
              "보안 인증에 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요.";
          } else if (res.status === 400 && data.fields?.length) {
            userMsg = `입력값을 확인해주세요: ${data.fields.join(", ")}`;
          } else if (res.status === 503) {
            userMsg =
              "서비스가 일시적으로 이용 불가합니다. 잠시 후 다시 시도해주세요.";
          } else {
            // Temporarily include detail for debugging
            userMsg = data.detail
              ? `${data.error ?? "전송에 실패했습니다."}\n(${data.detail})`
              : data.error ?? "전송에 실패했습니다.";
          }

          console.error("[contact] Submit failed:", {
            status: res.status,
            error: data.error,
            detail: data.detail,
          });

          throw new Error(userMsg);
        }

        setSubmitted(true);
      } catch (err) {
        toast(
          "error",
          err instanceof Error ? err.message : "전송에 실패했습니다.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [name, phone, inquiryType, budget, message, cfToken, t, toast],
  );

  /* ── success view ── */
  if (submitted) {
    return (
      <section className="mx-auto max-w-xl px-4 py-24 text-center">
        <ScrollAnimate>
          <div className="rounded-2xl border border-border bg-card p-10 shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {t("successTitle")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t("successMessage")}
            </p>
          </div>
        </ScrollAnimate>
      </section>
    );
  }

  /* ── form view ── */
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:py-20">
      <ScrollAnimate>
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        </div>
      </ScrollAnimate>

      <div className="grid gap-10 lg:grid-cols-5">
        {/* ── left: form ── */}
        <div className="lg:col-span-3">
          <ScrollAnimate delay={100}>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <h2 className="mb-6 text-xl font-semibold text-foreground">
                {t("formTitle")}
              </h2>

              {/* referral banner */}
              {refSource === "case-study" && caseTitle && (
                <div className="mb-6 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
                  {t("caseRefBanner")}
                </div>
              )}
              {refSource === "academy" && (
                <div className="mb-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  {t("academyRefBanner")}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 이름 */}
                <div>
                  <label htmlFor="name" className={labelCls}>
                    {t("name")} <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    className={inputCls}
                    placeholder={t("namePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                {/* 연락처 */}
                <div>
                  <label htmlFor="phone" className={labelCls}>
                    {t("phone")} <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    className={inputCls}
                    placeholder={t("phonePlaceholder")}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                {/* 문의 유형 */}
                <div>
                  <label htmlFor="inquiryType" className={labelCls}>
                    {t("inquiryType")}
                  </label>
                  <select
                    id="inquiryType"
                    className={selectCls}
                    value={inquiryType}
                    onChange={(e) => setInquiryType(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="">{t("inquiryTypePlaceholder")}</option>
                    <option value="media">{t("inquiryTypeMedia")}</option>
                    <option value="campaign">{t("inquiryTypeCampaign")}</option>
                    <option value="quote">{t("inquiryTypeQuote")}</option>
                    <option value="partnership">
                      {t("inquiryTypePartnership")}
                    </option>
                    <option value="other">{t("inquiryTypeOther")}</option>
                  </select>
                </div>

                {/* 예상 예산 */}
                <div>
                  <label htmlFor="budget" className={labelCls}>
                    {t("budget")}
                  </label>
                  <select
                    id="budget"
                    className={selectCls}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="">{t("budgetPlaceholder")}</option>
                    <option value="under10m">{t("budgetUnder10m")}</option>
                    <option value="10to50m">{t("budget10to50m")}</option>
                    <option value="50to100m">{t("budget50to100m")}</option>
                    <option value="over100m">{t("budgetOver100m")}</option>
                  </select>
                </div>

                {/* 문의 내용 */}
                <div>
                  <label htmlFor="message" className={labelCls}>
                    {t("message")} <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    id="message"
                    className={textareaCls}
                    placeholder={t("messagePlaceholder")}
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                {/* Turnstile */}
                <TurnstileWidget
                  onVerify={setCfToken}
                  className="flex justify-center"
                />

                {/* honeypot */}
                <div className="hidden" aria-hidden="true">
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                </div>

                {/* submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className={btnCls}
                >
                  {submitting ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      전송 중…
                    </>
                  ) : (
                    t("submitButton")
                  )}
                </button>
              </form>
            </div>
          </ScrollAnimate>
        </div>

        {/* ── right: contact info ── */}
        <div className="lg:col-span-2">
          <ScrollAnimate delay={200}>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <h3 className="mb-4 text-lg font-semibold text-foreground">
                {t("infoTitle")}
              </h3>
              <div className="space-y-4 text-sm text-muted-foreground">
                {/* phone */}
                <div className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="mt-0.5 h-4 w-4 shrink-0 text-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <span>{t("phoneNumber")}</span>
                </div>
                {/* email */}
                <div className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="mt-0.5 h-4 w-4 shrink-0 text-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{CONTACT_EMAIL}</span>
                </div>
                {/* address */}
                <div className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="mt-0.5 h-4 w-4 shrink-0 text-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>{t("address")}</span>
                </div>
                {/* hours */}
                <div className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="mt-0.5 h-4 w-4 shrink-0 text-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6l4 2"
                    />
                  </svg>
                  <span>{t("hours")}</span>
                </div>
              </div>

              {/* directions */}
              <div className="mt-6 border-t border-border pt-5">
                <h4 className="mb-3 text-sm font-semibold text-foreground">
                  {t("directionsTitle")}
                </h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">
                      {t("subway")}
                    </span>{" "}
                    {t("subwayDesc")}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      {t("busTitle")}
                    </span>{" "}
                    {t("busDesc")}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      {t("parkingTitle")}
                    </span>{" "}
                    {t("parkingDesc")}
                  </p>
                </div>
              </div>
            </div>
          </ScrollAnimate>
        </div>
      </div>
    </section>
  );
}
