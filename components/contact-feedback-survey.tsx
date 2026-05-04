"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Gift, CheckCircle, Copy } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { useToast } from "@/components/toast-provider";
import Spinner from "@/components/spinner";
import { cn } from "@/lib/utils";

const inputCls =
  "h-11 w-full border-2 border-border bg-card px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";
const textareaCls =
  "w-full border-2 border-border bg-card px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";

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
          <div className="flex h-14 w-14 items-center justify-center border-2 border-primary bg-primary text-primary-foreground">
            <CheckCircle className="h-8 w-8" />
          </div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            [ THANKS ]
          </p>
          <p className="text-lg font-bold tracking-tight text-foreground">
            {t("thankTitle")}
          </p>
          <p className="font-mono text-[12px] tracking-tight text-muted-foreground">
            {t("thankDesc")}
          </p>
        </div>

        <div className="border-2 border-primary bg-card p-6">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            <Gift className="h-4 w-4" />
            [ {t("couponTitle")} ]
          </div>
          <p className="mt-2 font-mono text-[11px] tracking-tight text-muted-foreground">
            {t("couponHint")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="border-2 border-border bg-hero-void px-4 py-2 font-mono text-lg font-bold tracking-[0.22em] text-primary">
              {couponCode}
            </code>
            <BtnBlock variant="secondary" size="sm" onClick={copyCoupon}>
              <Copy className="h-4 w-4" />
              {t("copyCode")}
            </BtnBlock>
          </div>
          <p className="mt-4 font-mono text-[11px] leading-relaxed tracking-tight text-muted-foreground">
            {`// `}{t("couponTerms")}
          </p>
        </div>

        <BtnBlock variant="secondary" size="md" onClick={reset} className="w-full">
          {t("again")}
        </BtnBlock>
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

      <p className="font-mono text-[12px] leading-relaxed tracking-tight text-muted-foreground">
        {`// `}{t("intro")}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            [ {t("email")} ] <span className="text-primary">*</span>
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
          <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            [ {t("name")} ]
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
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
        <legend className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          [ {t("qService")} ] <span className="text-primary">*</span>
        </legend>
        <div className="flex flex-wrap gap-0">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setServiceSatisfaction(n)}
              className={cn(
                "-mt-[2px] -ml-[2px] inline-flex h-10 min-w-[40px] items-center justify-center border-2 px-3 font-mono text-sm font-bold transition-colors",
                serviceSatisfaction === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {`// `}{t("scale15")}
        </p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          [ {t("qNps")} ] <span className="text-primary">*</span>
        </legend>
        <div className="flex flex-wrap gap-0">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNps(n)}
              className={cn(
                "-mt-[2px] -ml-[2px] inline-flex h-9 min-w-[36px] items-center justify-center border-2 px-2 font-mono text-sm font-bold transition-colors",
                nps === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {`// `}{t("npsHint")}
        </p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          [ {t("qCampaign")} ] <span className="text-primary">*</span>
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
                "-mt-[2px] -ml-[2px] border-2 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                campaign === v
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {campaign === "yes" ? (
        <div className="space-y-3 border-2 border-primary bg-muted p-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            [ {t("qCampaignResult")} ]
          </p>
          <div className="flex flex-wrap gap-0">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCampaignResult(n)}
                className={cn(
                  "-mt-[2px] -ml-[2px] inline-flex h-10 min-w-[40px] items-center justify-center border-2 px-3 font-mono text-sm font-bold transition-colors",
                  campaignResult === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
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
        <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
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

      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {`// `}{t("timeHint")}
      </p>

      <BtnBlock
        type="submit"
        variant="accent"
        size="lg"
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <>
            <Spinner className="mr-2" />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </BtnBlock>
    </form>
  );
}
