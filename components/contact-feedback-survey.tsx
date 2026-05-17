"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Gift, CheckCircle, Copy } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import Spinner from "@/components/spinner";
import { cn } from "@/lib/utils";

const inputCls =
  "h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30";
const textareaCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30";
const labelCls = "mb-2 block text-sm text-white/70";
const btnPrimary =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 text-sm font-bold text-white shadow-[0_12px_40px_rgba(139,92,246,0.35)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50";
const btnSecondary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-50";
const chipActive =
  "border-violet-500/50 bg-gradient-to-r from-violet-500/90 to-cyan-400/90 text-white shadow-[0_6px_20px_rgba(139,92,246,0.3)]";
const chipIdle =
  "border-white/15 bg-white/5 text-white/80 hover:border-white/25 hover:bg-white/10";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CampaignOpt = "yes" | "no" | "na";

export function ContactFeedbackSurvey() {
  const t = useTranslations("contactFeedback");
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [serviceSatisfaction, setServiceSatisfaction] = useState<number | "">(
    "",
  );
  const [nps, setNps] = useState<number | "">("");
  const [campaign, setCampaign] = useState<CampaignOpt | "">("");
  const [campaignResult, setCampaignResult] = useState<number | "">("");
  const [campaignComment, setCampaignComment] = useState("");
  const [improvement, setImprovement] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [couponCode, setCouponCode] = useState("");

  const reset = useCallback(() => {
    setDone(false);
    setCouponCode("");
    setEmail("");
    setName("");
    setCompany("");
    setServiceSatisfaction("");
    setNps("");
    setCampaign("");
    setCampaignResult("");
    setCampaignComment("");
    setImprovement("");
  }, []);

  const copyCoupon = useCallback(() => {
    if (!couponCode) return;
    void navigator.clipboard.writeText(couponCode);
    toast("success", t("copyOk"));
  }, [couponCode, toast, t]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      toast("warning", t("errorEmail"));
      return;
    }
    if (
      serviceSatisfaction === "" ||
      nps === "" ||
      campaign === "" ||
      (campaign === "yes" && campaignResult === "")
    ) {
      toast("warning", t("errorRequired"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          company: company.trim(),
          serviceSatisfaction,
          nps,
          campaign,
          campaignResult: campaign === "yes" ? campaignResult : undefined,
          campaignComment: campaignComment.trim(),
          improvement: improvement.trim(),
          website,
        }),
      });
      const data = (await res.json()) as {
        couponCode?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "fail");
      }
      if (data.couponCode) {
        setCouponCode(data.couponCode);
        setDone(true);
        toast("success", t("submitOk"));
      }
    } catch {
      toast("error", t("submitFail"));
    } finally {
      setLoading(false);
    }
  };

  if (done && couponCode) {
    return (
      <div className="space-y-6 py-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-violet-500/20 to-cyan-400/20 text-cyan-300">
            <CheckCircle className="h-8 w-8" />
          </div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400/90">
            [ THANKS ]
          </p>
          <p className="text-lg font-bold tracking-tight text-white">
            {t("thankTitle")}
          </p>
          <p className="text-sm text-white/65">
            {t("thankDesc")}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-6">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400/90">
            <Gift className="h-4 w-4" />
            [ {t("couponTitle")} ]
          </div>
          <p className="mt-2 font-mono text-[11px] tracking-tight text-muted-foreground">
            {t("couponHint")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 font-mono text-lg font-bold tracking-wider text-cyan-300">
              {couponCode}
            </code>
            <button type="button" className={btnSecondary} onClick={copyCoupon}>
              <Copy className="h-4 w-4" />
              {t("copyCode")}
            </button>
          </div>
          <p className="mt-4 font-mono text-[11px] leading-relaxed tracking-tight text-muted-foreground">
            {`// `}{t("couponTerms")}
          </p>
        </div>

        <button type="button" className={cn(btnSecondary, "w-full")} onClick={reset}>
          {t("again")}
        </button>
      </div>
    );
  }

  return (
    <form className="relative space-y-6" onSubmit={submit} noValidate>
      <div className="absolute -left-[9999px]" aria-hidden="true" tabIndex={-1}>
        <label htmlFor="fb-website">Website</label>
        <input
          id="fb-website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <p className="text-sm leading-relaxed text-white/55">
        {`// `}{t("intro")}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>
            [ {t("email")} ] <span className="text-rose-400">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPh")}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>
            [ {t("name")} ]
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>
            [ {t("company")} ]
          </label>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className={labelCls}>
          [ {t("qService")} ] <span className="text-rose-400">*</span>
        </legend>
        <div className="flex flex-wrap gap-0">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setServiceSatisfaction(n)}
              className={cn(
                "rounded-xl border inline-flex h-10 min-w-[40px] items-center justify-center px-3 text-sm font-semibold transition-all",
                serviceSatisfaction === n
                  ? chipActive
                  : chipIdle,
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/50">
          {`// `}{t("scale15")}
        </p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={labelCls}>
          [ {t("qNps")} ] <span className="text-rose-400">*</span>
        </legend>
        <div className="flex flex-wrap gap-0">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNps(n)}
              className={cn(
                "rounded-xl border inline-flex h-9 min-w-[36px] items-center justify-center px-2 text-sm font-semibold transition-all",
                nps === n
                  ? chipActive
                  : chipIdle,
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/50">
          {`// `}{t("npsHint")}
        </p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={labelCls}>
          [ {t("qCampaign")} ] <span className="text-rose-400">*</span>
        </legend>
        <div className="flex flex-wrap gap-0">
          {(
            [
              ["yes", t("campYes")],
              ["no", t("campNo")],
              ["na", t("campNa")],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setCampaign(v);
                if (v !== "yes") setCampaignResult("");
              }}
              className={cn(
                "rounded-xl border px-4 py-2 text-xs font-semibold transition-all",
                campaign === v
                  ? chipActive
                  : chipIdle,
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {campaign === "yes" ? (
        <div className="space-y-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400/90">
            [ {t("qCampaignResult")} ]
          </p>
          <div className="flex flex-wrap gap-0">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCampaignResult(n)}
                className={cn(
                  "rounded-xl border inline-flex h-10 min-w-[40px] items-center justify-center px-3 text-sm font-semibold transition-all",
                  campaignResult === n
                    ? chipActive
                    : chipIdle,
                )}
              >
                {n}
              </button>
            ))}
               </div>
          <div>
            <label className={labelCls}>
              [ {t("campaignComment")} ]
            </label>
            <textarea
              rows={3}
              value={campaignComment}
              onChange={(e) => setCampaignComment(e.target.value)}
              placeholder={t("campaignCommentPh")}
              className={textareaCls}
            />
          </div>
        </div>
      ) : null}

      <div>
        <label className={labelCls}>
          [ {t("qImprove")} ]
        </label>
        <textarea
          rows={3}
          value={improvement}
          onChange={(e) => setImprovement(e.target.value)}
          placeholder={t("improvePh")}
          className={textareaCls}
        />
      </div>

      <p className="text-xs text-white/50">
        {`// `}{t("timeHint")}
      </p>

      <button type="submit" className={btnPrimary} disabled={loading}>
        {loading ? (
          <>
            <Spinner className="mr-2" />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </button>
    </form>
  );
}
