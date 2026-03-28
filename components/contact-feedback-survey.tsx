"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Gift, CheckCircle, Copy } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import Spinner from "@/components/spinner";

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
          <CheckCircle className="h-12 w-12 text-emerald-500" />
          <p className="text-lg font-semibold text-navy">{t("thankTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("thankDesc")}</p>
        </div>

        <div className="rounded-2xl border-2 border-dashed border-gold/60 bg-gold/10 p-6">
          <div className="flex items-center gap-2 text-sm font-bold text-navy">
            <Gift className="h-5 w-5 text-gold-dark" />
            {t("couponTitle")}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("couponHint")}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-white px-4 py-2 font-mono text-lg font-bold tracking-wide text-navy shadow-sm">
              {couponCode}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-navy/20"
              onClick={copyCoupon}
            >
              <Copy className="mr-1.5 h-4 w-4" />
              {t("copyCode")}
            </Button>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-navy/70">
            {t("couponTerms")}
          </p>
        </div>

        <Button type="button" variant="ghost" className="w-full" onClick={reset}>
          {t("again")}
        </Button>
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

      <p className="text-sm text-muted-foreground">{t("intro")}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-navy">
            {t("email")} <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPh")}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">
            {t("name")}
          </label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">
            {t("company")}
          </label>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold text-navy">
          {t("qService")} <span className="text-red-500">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Button
              key={n}
              type="button"
              variant={serviceSatisfaction === n ? "default" : "outline"}
              size="sm"
              className={
                serviceSatisfaction === n
                  ? "bg-navy text-white"
                  : "border-navy/20"
              }
              onClick={() => setServiceSatisfaction(n)}
            >
              {n}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t("scale15")}</p>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold text-navy">
          {t("qNps")} <span className="text-red-500">*</span>
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <Button
              key={n}
              type="button"
              variant={nps === n ? "default" : "outline"}
              size="sm"
              className={`min-w-9 px-2 ${nps === n ? "bg-gold text-navy" : "border-navy/20"}`}
              onClick={() => setNps(n)}
            >
              {n}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t("npsHint")}</p>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold text-navy">
          {t("qCampaign")} <span className="text-red-500">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["yes", t("campYes")],
              ["no", t("campNo")],
              ["na", t("campNa")],
            ] as const
          ).map(([v, label]) => (
            <Button
              key={v}
              type="button"
              variant={campaign === v ? "default" : "outline"}
              size="sm"
              className={
                campaign === v ? "bg-navy text-white" : "border-navy/20"
              }
              onClick={() => {
                setCampaign(v);
                if (v !== "yes") setCampaignResult("");
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      </fieldset>

      {campaign === "yes" ? (
        <div className="space-y-3 rounded-xl border border-navy/10 bg-slate-50/80 p-4">
          <p className="text-sm font-semibold text-navy">{t("qCampaignResult")}</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Button
                key={n}
                type="button"
                variant={campaignResult === n ? "default" : "outline"}
                size="sm"
                className={
                  campaignResult === n ? "bg-navy text-white" : "border-navy/20"
                }
                onClick={() => setCampaignResult(n)}
              >
                {n}
              </Button>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-navy">
              {t("campaignComment")}
            </label>
            <Textarea
              rows={3}
              value={campaignComment}
              onChange={(e) => setCampaignComment(e.target.value)}
              placeholder={t("campaignCommentPh")}
            />
          </div>
        </div>
      ) : null}

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-navy">
          {t("qImprove")}
        </label>
        <Textarea
          rows={3}
          value={improvement}
          onChange={(e) => setImprovement(e.target.value)}
          placeholder={t("improvePh")}
        />
      </div>

      <p className="text-xs text-muted-foreground">{t("timeHint")}</p>

      <Button
        type="submit"
        className="w-full bg-gold font-semibold text-navy hover:bg-gold-dark"
        size="lg"
        disabled={loading}
      >
        {loading ? (
          <>
            <Spinner className="mr-2" />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </Button>
    </form>
  );
}
