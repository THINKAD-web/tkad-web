"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, FileText, Loader2, Mail, Save } from "lucide-react";
import type { ContractInviteSendEntry } from "@/lib/contract-invite-log";
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
import {
  buildContractMoney,
  isSentenceMediaCount,
  resolveContractMediaCountLabel,
  supplyWonFromManwonField,
} from "@/lib/contract-money";
import { isQuoteAddonLineId } from "@/lib/quote-addon-line";

function formatKoNumber(value: number | null | undefined, fallback = "—"): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  return value.toLocaleString("ko-KR");
}

export type OohQuoteContractDetail = {
  quoteBreakdown?: QuoteBreakdown | null;
  contract?: {
    id: string;
    status: string;
    sendMode?: string;
    specialTerms: string | null;
    signedAt: string | null;
    canEditTerms: boolean;
    inviteSendLog?: ContractInviteSendEntry[];
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
  /** OoHQuote.totalAmount (만원, VAT별도) */
  contractAmountManwon?: number;
};

export function AdminOohContractDetailPanel({
  quoteId,
  detail,
  onSaved,
  onRecalc,
  recalcBusy,
  contractAmountManwon,
}: Props) {
  const t = useTranslations("adminOohQuotes");
  const { toast } = useToast();
  const [termsDraft, setTermsDraft] = useState("");
  const [metaDraft, setMetaDraft] = useState<OohContractMeta>({});
  const [saving, setSaving] = useState(false);
  const [metaSaving, setMetaSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [resendBusy, setResendBusy] = useState(false);

  const contract = detail?.contract;
  const display = detail?.contractDisplay;
  const breakdown = detail?.quoteBreakdown;
  const isKo = display?.isKo ?? true;

  function contractStatusLabel(status: string) {
    const key = `contractStatus_${status}` as
      | "contractStatus_pending"
      | "contractStatus_signed"
      | "contractStatus_confirmed"
      | "contractStatus_attachment_sent"
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

  const mediaUnitCount = Math.max(
    1,
    (breakdown?.lines ?? []).filter(
      (line) => line.mediaId && !isQuoteAddonLineId(line.mediaId),
    ).length ||
      display?.mediaLines.length ||
      1,
  );
  const prevMediaUnits = useRef<number | null>(null);
  useEffect(() => {
    if (prevMediaUnits.current == null) {
      prevMediaUnits.current = mediaUnitCount;
      return;
    }
    if (prevMediaUnits.current === mediaUnitCount) return;
    prevMediaUnits.current = mediaUnitCount;
    setMetaDraft((m) => {
      if (isSentenceMediaCount(m.mediaCount)) return m;
      return { ...m, mediaCount: `${mediaUnitCount}기` };
    });
  }, [mediaUnitCount]);

  const countResolution = resolveContractMediaCountLabel({
    mediaUnitCount,
    adminMediaCount: metaDraft.mediaCount,
  });
  const liveMoney = buildContractMoney({
    mediaLines: (breakdown?.lines ?? [])
      .filter((line) => line.mediaId && !isQuoteAddonLineId(line.mediaId))
      .map((line) => ({
        name: line.mediaName,
        location: line.location ?? "",
        spec: line.quantityLabel ?? "",
        supplyWon: line.lineSupplyWon,
      })),
    contractMediaSupplyWon:
      contractAmountManwon != null
        ? supplyWonFromManwonField(contractAmountManwon)
        : undefined,
    extraProductionWon: metaDraft.extraProductionWon,
    extraInstallWon: metaDraft.extraInstallWon,
    extraOtherWon: metaDraft.extraOtherWon,
    productionCostText: metaDraft.productionCost,
  });

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

  function inviteLogKindLabel(kind: ContractInviteSendEntry["kind"]) {
    if (kind === "resend") return t("contractInviteLogKind_resend");
    if (kind === "attachment_initial") {
      return t("contractInviteLogKind_attachment_initial");
    }
    if (kind === "attachment_resend") {
      return t("contractInviteLogKind_attachment_resend");
    }
    return t("contractInviteLogKind_initial");
  }

  const canResendInvite =
    contract?.status === "pending" ||
    contract?.status === "attachment_sent";

  const resendInvite = useCallback(async () => {
    if (!contract?.id || !canResendInvite) return;
    setResendBusy(true);
    try {
      const res = await fetch(
        `/api/admin/contracts/${contract.id}/resend-invite`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const raw: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err =
          typeof raw === "object" &&
          raw !== null &&
          "error" in raw &&
          typeof (raw as { error?: unknown }).error === "string"
            ? (raw as { error: string }).error
            : t("contractResendInviteFail");
        if (err === "missing_client_email") {
          toast("error", t("contractResendInviteNoEmail"));
        } else if (err === "contract_not_pending") {
          toast("error", t("contractResendInviteNotPending"));
        } else if (err === "contract_not_attachment_sent") {
          toast("error", t("contractResendAttachmentNotSent"));
        } else {
          toast("error", err);
        }
        return;
      }
      const emailed =
        typeof raw === "object" &&
        raw !== null &&
        "emailed" in raw &&
        (raw as { emailed?: unknown }).emailed === true;
      if (emailed) {
        toast("success", t("contractResendInviteOk"));
      } else {
        const detail =
          typeof raw === "object" &&
          raw !== null &&
          "emailDetail" in raw &&
          typeof (raw as { emailDetail?: unknown }).emailDetail === "string"
            ? (raw as { emailDetail: string }).emailDetail.trim()
            : "";
        const base =
          typeof raw === "object" &&
          raw !== null &&
          "emailSkipReason" in raw &&
          (raw as { emailSkipReason?: unknown }).emailSkipReason ===
            "not_configured"
            ? t("sendEsignEmailSkipped")
            : t("contractInviteEmailSkipped");
        toast("error", detail ? `${base} (${detail})` : base);
      }
      onSaved();
    } catch {
      toast("error", t("contractResendInviteFail"));
    } finally {
      setResendBusy(false);
    }
  }, [canResendInvite, contract?.id, onSaved, t, toast]);

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
        <section className="space-y-3 rounded-2xl border border-[color:var(--qp-accent)]/30 bg-white p-4 dark:border-[color:var(--qp-accent)]/25 dark:bg-white/5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <FileText className="h-4 w-4 text-[color:var(--qp-accent)]" aria-hidden />
              {t("contractSectionTitle")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {contract ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {contractStatusLabel(contract.status)}
                </span>
              ) : null}
              {canResendInvite ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={resendBusy}
                  onClick={() => void resendInvite()}
                >
                  {resendBusy ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Mail className="mr-1 h-3 w-3" />
                  )}
                  {contract?.status === "attachment_sent"
                    ? t("contractResendAttachment")
                    : t("contractResendInvite")}
                </Button>
              ) : null}
            </div>
          </div>

          {contract?.inviteSendLog && contract.inviteSendLog.length > 0 ? (
            <div className="rounded-xl border border-gray-100 bg-muted/10 p-3 dark:border-white/10">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("contractInviteLogTitle")}
              </p>
              <ul className="mt-2 space-y-1 text-[11px] text-foreground">
                {contract.inviteSendLog.map((entry, idx) => (
                  <li key={`${entry.sentAt}-${idx}`} className="tabular-nums">
                    {new Date(entry.sentAt).toLocaleString(isKo ? "ko-KR" : "en-US")}{" "}
                    · {entry.to} ·{" "}
                    {inviteLogKindLabel(entry.kind)}
                  </li>
                ))}
              </ul>
            </div>
          ) : canResendInvite ? (
            <p className="text-[10px] text-muted-foreground">
              {t("contractInviteLogEmpty")}
            </p>
          ) : null}

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
                {t("contractAccountManager")}
              </span>
              <Input
                value={metaDraft.accountManagerName ?? ""}
                onChange={(e) =>
                  setMetaDraft((m) => ({
                    ...m,
                    accountManagerName: e.target.value,
                  }))
                }
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">
                {t("contractAccountManagerEmail")}
              </span>
              <Input
                type="email"
                value={metaDraft.accountManagerEmail ?? ""}
                onChange={(e) =>
                  setMetaDraft((m) => ({
                    ...m,
                    accountManagerEmail: e.target.value,
                  }))
                }
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">
                {t("contractAccountManagerPhone")}
              </span>
              <Input
                value={metaDraft.accountManagerPhone ?? ""}
                onChange={(e) =>
                  setMetaDraft((m) => ({
                    ...m,
                    accountManagerPhone: e.target.value,
                  }))
                }
              />
            </label>
            <label className="space-y-1 text-xs sm:col-span-2">
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
                placeholder="자체제작 또는 제작비 설명"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">
                제작비 (원, VAT별도)
              </span>
              <Input
                type="number"
                min={0}
                value={
                  metaDraft.extraProductionWon != null &&
                  metaDraft.extraProductionWon > 0
                    ? String(metaDraft.extraProductionWon)
                    : ""
                }
                onChange={(e) => {
                  const n = Math.max(0, parseInt(e.target.value, 10) || 0);
                  setMetaDraft((m) => ({
                    ...m,
                    extraProductionWon: n > 0 ? n : undefined,
                  }));
                }}
                placeholder="예) 2000000"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">설치비 (원, VAT별도)</span>
              <Input
                inputMode="numeric"
                value={
                  metaDraft.extraInstallWon != null && metaDraft.extraInstallWon > 0
                    ? String(metaDraft.extraInstallWon)
                    : ""
                }
                onChange={(e) => {
                  const n = Math.max(0, parseInt(e.target.value.replace(/[^\d]/g, ""), 10) || 0);
                  setMetaDraft((m) => ({ ...m, extraInstallWon: n > 0 ? n : undefined }));
                }}
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">기타 (원, VAT별도)</span>
              <Input
                inputMode="numeric"
                value={
                  metaDraft.extraOtherWon != null && metaDraft.extraOtherWon > 0
                    ? String(metaDraft.extraOtherWon)
                    : ""
                }
                onChange={(e) => {
                  const n = Math.max(0, parseInt(e.target.value.replace(/[^\d]/g, ""), 10) || 0);
                  setMetaDraft((m) => ({ ...m, extraOtherWon: n > 0 ? n : undefined }));
                }}
              />
            </label>
            <label className="space-y-1 text-xs sm:col-span-2">
              <span className="font-medium text-muted-foreground">기타사항 (제1조)</span>
              <Input
                value={metaDraft.otherNotes ?? ""}
                onChange={(e) =>
                  setMetaDraft((m) => ({ ...m, otherNotes: e.target.value }))
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
            {countResolution.overridden ? (
              <p className="sm:col-span-2 text-[11px] text-amber-700 dark:text-amber-300">
                수량 입력이 매체 수({mediaUnitCount}기)와 달라 계약서에는 {countResolution.label}로 표시됩니다.
              </p>
            ) : null}
            {liveMoney.adjustmentWon !== 0 ? (
              <p className="sm:col-span-2 text-[11px] text-amber-700 dark:text-amber-300">
                협의 조정 {liveMoney.adjustmentWon > 0 ? "+" : "−"}
                {Math.abs(liveMoney.adjustmentWon).toLocaleString("ko-KR")}원이 계약서에 표시됩니다.
              </p>
            ) : null}
            <div className="sm:col-span-2 rounded-lg bg-muted/40 p-2 text-[11px] tabular-nums leading-relaxed">
              매체비 {liveMoney.mediaSubtotalWon.toLocaleString("ko-KR")} · 조정{" "}
              {liveMoney.adjustmentWon.toLocaleString("ko-KR")} · 제작{" "}
              {liveMoney.extraProductionWon.toLocaleString("ko-KR")} · 설치{" "}
              {liveMoney.extraInstallWon.toLocaleString("ko-KR")} · 기타{" "}
              {liveMoney.extraOtherWon.toLocaleString("ko-KR")} · 공급가{" "}
              {liveMoney.supplyWon.toLocaleString("ko-KR")} · VAT{" "}
              {liveMoney.vatWon.toLocaleString("ko-KR")} · 총액{" "}
              {liveMoney.totalAmountDisplay}
            </div>
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
              <span className="font-medium">{t("contractSpecialTermsLabel")}: </span>
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
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--qp-accent)]/40",
                "disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground",
                "dark:bg-white/5",
              )}
            />
            {contract?.canEditTerms ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-[color:var(--qp-accent)] text-white hover:opacity-95"
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
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[color:var(--qp-accent)] hover:underline dark:text-[color:var(--qp-accent)]"
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
