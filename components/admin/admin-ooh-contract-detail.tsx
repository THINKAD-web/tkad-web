"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, FileText, Loader2, Save } from "lucide-react";
import type { OohContractMeta } from "@/lib/ooh-contract-meta";
import type { QuoteBreakdown } from "@/lib/quote-calculator";
import {
  effectiveSpecialTerms,
  generalContractTerms,
} from "@/lib/ooh-contract-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";

function formatKoNumber(value: number | null | undefined, fallback = "—"): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  return value.toLocaleString("ko-KR");
}

export type OohQuoteContractDetail = {
  quoteBreakdown?: QuoteBreakdown | null;
  contract?: {
    id: string;
    status: string;
    specialTerms: string | null;
    signedAt: string | null;
    canEditTerms: boolean;
  } | null;
  contractDisplay?: {
    isKo: boolean;
    advertiserLine: string;
    mediaLines: string[];
    period: string;
    amountLine: string;
    canPreview: boolean;
    campaignName?: string;
    clientRepName?: string;
    clientAddress?: string;
    clientPhone?: string;
    productionCost?: string;
    mediaCount?: string;
    paymentMethod?: string;
    totalAmount?: string;
    amountKorean?: string;
  } | null;
  contractMeta?: OohContractMeta | null;
  loading?: boolean;
};

type Props = {
  quoteId: string;
  detail: OohQuoteContractDetail | undefined;
  onSaved: () => void;
  onRecalc: () => void;
  recalcBusy: boolean;
};

export function AdminOohContractDetailPanel({
  quoteId,
  detail,
  onSaved,
  onRecalc,
  recalcBusy,
}: Props) {
  const t = useTranslations("adminOohQuotes");
  const { toast } = useToast();
  const [termsDraft, setTermsDraft] = useState("");
  const [metaDraft, setMetaDraft] = useState<OohContractMeta>({});
  const [saving, setSaving] = useState(false);
  const [metaSaving, setMetaSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const contract = detail?.contract;
  const display = detail?.contractDisplay;
  const breakdown = detail?.quoteBreakdown;
  const isKo = display?.isKo ?? true;

  function contractStatusLabel(status: string) {
    const key = `contractStatus_${status}` as
      | "contractStatus_pending"
      | "contractStatus_signed"
      | "contractStatus_confirmed"
      | "contractStatus_cancelled";
    try {
      return t(key);
    } catch {
      return status;
    }
  }

  useEffect(() => {
    setTermsDraft(contract?.specialTerms ?? "");
  }, [contract?.specialTerms, quoteId]);

  useEffect(() => {
    setMetaDraft(detail?.contractMeta ?? {});
  }, [detail?.contractMeta, quoteId]);

  const saveTerms = useCallback(async () => {
    if (!contract?.canEditTerms) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/ooh-quotes/${quoteId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialTerms: termsDraft }),
      });
      const raw: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err =
          typeof raw === "object" &&
          raw !== null &&
          "error" in raw &&
          typeof (raw as { error?: unknown }).error === "string"
            ? (raw as { error: string }).error
            : t("contractTermsSaveFail");
        if (err === "contract_terms_signed_locked") {
          toast("error", t("contractTermsSignedLocked"));
        } else if (err === "contract_terms_need_booking") {
          toast("error", t("contractTermsNeedBooking"));
        } else {
          toast("error", err);
        }
        return;
      }
      toast("success", t("contractTermsSaveOk"));
      setPreviewKey((k) => k + 1);
      onSaved();
    } catch {
      toast("error", t("contractTermsSaveFail"));
    } finally {
      setSaving(false);
    }
  }, [contract?.canEditTerms, onSaved, quoteId, t, termsDraft, toast]);

  const saveMeta = useCallback(async () => {
    setMetaSaving(true);
    try {
      const res = await fetch(`/api/admin/ooh-quotes/${quoteId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractMeta: metaDraft }),
      });
      const raw: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err =
          typeof raw === "object" &&
          raw !== null &&
          "error" in raw &&
          typeof (raw as { error?: unknown }).error === "string"
            ? (raw as { error: string }).error
            : t("contractMetaSaveFail");
        toast("error", err);
        return;
      }
      toast("success", t("contractMetaSaveOk"));
      setPreviewKey((k) => k + 1);
      onSaved();
    } catch {
      toast("error", t("contractMetaSaveFail"));
    } finally {
      setMetaSaving(false);
    }
  }, [metaDraft, onSaved, quoteId, t, toast]);

  if (detail?.loading) {
    return <p className="text-xs text-muted-foreground">{t("loading")}</p>;
  }

  const previewUrl = `/api/quote/${quoteId}/contract/preview`;

  return (
    <div className="space-y-4 text-xs">
      {breakdown ? (
        <section className="space-y-2">
          <p className="font-semibold text-foreground">{t("breakdownTitle")}</p>
          <ul className="divide-y rounded-xl border border-gray-100 bg-white dark:border-white/10 dark:bg-white/5">
            {breakdown.lines.map((line, idx) => (
              <li
                key={`${line.mediaId}-${idx}`}
                className="flex flex-wrap justify-between gap-2 px-3 py-2"
              >
                <span>
                  {line.mediaName} · {line.location ?? "—"}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  ₩{formatKoNumber(line.lineSupplyWon, "0")} · {t("breakdownImpressions")}{" "}
                  {formatKoNumber(line.impressions)}
                </span>
              </li>
            ))}
          </ul>
          <p className="tabular-nums text-muted-foreground">
            {t("breakdownSubtotal")} ₩{formatKoNumber(breakdown.subtotalWon, "0")} · VAT(10%) ₩
            {formatKoNumber(breakdown.vatWon, "0")} · {t("breakdownTotal")} ₩
            {formatKoNumber(breakdown.totalWon, "0")}
            {breakdown.validUntil ? (
              <>
                {" "}
                · {t("breakdownValid")} {breakdown.validUntil.slice(0, 10)}
              </>
            ) : null}
          </p>
        </section>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-muted-foreground">{t("breakdownEmpty")}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={recalcBusy}
            onClick={onRecalc}
          >
            {recalcBusy ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : null}
            {t("recalc")}
          </Button>
        </div>
      )}

      {display ? (
        <section className="space-y-3 rounded-2xl border border-violet-200/70 bg-white p-4 dark:border-violet-400/25 dark:bg-white/5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <FileText className="h-4 w-4 text-violet-600" aria-hidden />
              {t("contractSectionTitle")}
            </p>
            {contract ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {contractStatusLabel(contract.status)}
              </span>
            ) : null}
          </div>

          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("contractAdvertiser")}
              </dt>
              <dd className="mt-0.5 font-medium text-foreground">{display.advertiserLine}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("contractCampaignName")}
              </dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {display.campaignName ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("contractPeriod")}
              </dt>
              <dd className="mt-0.5 font-medium text-foreground">{display.period}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("contractAmount")}
              </dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {display.totalAmount ?? display.amountLine}
                {display.amountKorean ? (
                  <span className="ml-2 text-muted-foreground">
                    ({display.amountKorean})
                  </span>
                ) : null}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("contractMedia")}
              </dt>
              <dd className="mt-1 space-y-1">
                {display.mediaLines.length > 0 ? (
                  display.mediaLines.map((name) => (
                    <p key={name} className="text-foreground">
                      · {name}
                    </p>
                  ))
                ) : (
                  <p className="text-muted-foreground">—</p>
                )}
              </dd>
            </div>
          </dl>

          <div className="grid gap-2 rounded-xl border border-gray-100 bg-muted/10 p-3 sm:grid-cols-2 dark:border-white/10">
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">
                {t("contractClientRep")}
              </span>
              <Input
                value={metaDraft.clientRepName ?? ""}
                onChange={(e) =>
                  setMetaDraft((m) => ({ ...m, clientRepName: e.target.value }))
                }
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">
                {t("contractCampaignName")}
              </span>
              <Input
                value={metaDraft.campaignName ?? ""}
                onChange={(e) =>
                  setMetaDraft((m) => ({ ...m, campaignName: e.target.value }))
                }
              />
            </label>
            <label className="space-y-1 text-xs sm:col-span-2">
              <span className="font-medium text-muted-foreground">
                {t("contractClientAddress")}
              </span>
              <Input
                value={metaDraft.clientAddress ?? ""}
                onChange={(e) =>
                  setMetaDraft((m) => ({ ...m, clientAddress: e.target.value }))
                }
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">
                {t("contractProductionCost")}
              </span>
              <Input
                value={metaDraft.productionCost ?? ""}
                onChange={(e) =>
                  setMetaDraft((m) => ({ ...m, productionCost: e.target.value }))
                }
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">
                {t("contractMediaCount")}
              </span>
              <Input
                value={metaDraft.mediaCount ?? ""}
                onChange={(e) =>
                  setMetaDraft((m) => ({ ...m, mediaCount: e.target.value }))
                }
              />
            </label>
            <label className="space-y-1 text-xs sm:col-span-2">
              <span className="font-medium text-muted-foreground">
                {t("contractPaymentMethod")}
              </span>
              <Input
                value={metaDraft.paymentMethod ?? ""}
                onChange={(e) =>
                  setMetaDraft((m) => ({ ...m, paymentMethod: e.target.value }))
                }
              />
            </label>
            <div className="sm:col-span-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={metaSaving}
                onClick={() => void saveMeta()}
              >
                {metaSaving ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Save className="mr-1 h-3 w-3" />
                )}
                {t("contractMetaSave")}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5 rounded-xl border border-gray-100 bg-muted/20 p-3 dark:border-white/10">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("contractStandardTerms")}
            </p>
            <p className="leading-relaxed text-foreground/90">
              <span className="font-medium">{t("contractArticle5")}: </span>
              {effectiveSpecialTerms(isKo, contract?.specialTerms ?? null)}
            </p>
            <p className="leading-relaxed text-muted-foreground">
              <span className="font-medium">{t("contractArticle6")}: </span>
              {generalContractTerms(isKo)}
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`special-terms-${quoteId}`}
              className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t("contractSpecialTermsLabel")}
            </label>
            {!contract?.canEditTerms && contract ? (
              <p
                className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium leading-snug text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100"
                role="status"
              >
                {t("contractTermsSignedWarning")}
              </p>
            ) : null}
            <textarea
              id={`special-terms-${quoteId}`}
              rows={4}
              value={termsDraft}
              disabled={!contract?.canEditTerms || saving}
              onChange={(e) => setTermsDraft(e.target.value)}
              placeholder={t("contractSpecialTermsPh")}
              className={cn(
                "w-full rounded-xl border border-input bg-white px-3 py-2 text-sm leading-relaxed text-foreground shadow-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40",
                "disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground",
                "dark:bg-white/5",
              )}
            />
            {contract?.canEditTerms ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-gradient-to-r from-violet-500 to-cyan-400 text-white hover:opacity-95"
                  disabled={saving}
                  onClick={() => void saveTerms()}
                >
                  {saving ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-3 w-3" />
                  )}
                  {t("contractTermsSave")}
                </Button>
                <p className="self-center text-[10px] text-muted-foreground">
                  {t("contractTermsSaveHint")}
                </p>
              </div>
            ) : !display.canPreview ? (
              <p className="text-[10px] text-muted-foreground">{t("contractTermsNeedBooking")}</p>
            ) : null}
          </div>

          {display.canPreview ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-foreground">{t("contractPreviewTitle")}</p>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 hover:underline dark:text-violet-300"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden />
                  {t("contractPreviewNewTab")}
                </a>
              </div>
              <iframe
                key={previewKey}
                title={t("contractPreviewTitle")}
                src={previewUrl}
                className="h-[min(520px,70vh)] w-full rounded-xl border border-gray-200 bg-white dark:border-white/10"
              />
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">{t("contractPreviewUnavailable")}</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
