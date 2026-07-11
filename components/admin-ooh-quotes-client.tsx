"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import type { QuoteBreakdown } from "@/lib/quote-calculator";
import {
  canShowAwaitingSignature,
  canShowBookingConfirm,
  canShowContractConfirm,
  canShowCancel,
  canShowPaymentConfirm,
  canShowSendInvoice,
  canShowSendQuote,
} from "@/lib/ooh-quote-admin-ui";
import { useToast } from "@/components/toast-provider";
import { formatOohQuoteManwonShort } from "@/lib/ooh-quote-amount";
import { mapOohQuoteRecalcApiError } from "@/lib/ooh-quote-recalc-error";
import {
  AdminQuotePageShell,
  adminDesktopTableWrapClass,
  adminMobileTouchBtnClass,
  adminQuoteEmphasisTextClass,
  adminQuoteLinkVioletClass,
  adminQuoteSectionCard,
  adminQuoteSelectClass,
  adminQuoteTableExpandedRowClass,
  adminQuoteTableTheadClass,
} from "@/components/admin/admin-quote-page-shell";
import {
  AdminOohContractDetailPanel,
  type OohQuoteContractDetail,
} from "@/components/admin/admin-ooh-contract-detail";
import {
  AdminMobileCard,
  AdminMobileList,
} from "@/components/admin/admin-mobile-list-primitives";

const OOH_STATUSES = [
  "all",
  "revision_requested",
  "draft",
  "sent",
  "expired",
  "booking_requested",
  "booking_pending",
  "booking_confirmed",
  "invoice_sent",
  "payment_pending",
  "payment_confirmed",
  "contract_confirmed",
  "in_progress",
  "completed",
  "cancelled",
] as const;

type OohRow = {
  id: string;
  status: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  totalAmount: number;
  period: string;
  updatedAt: string;
  contractSigned: boolean;
  sourceAdminQuoteId: string | null;
  sourceAdminQuoteNumber: string | null;
  revisionMessage: string | null;
  revisionRequestedAt: string | null;
};

export default function AdminOohQuotesClient() {
  const t = useTranslations("adminOohQuotes");
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight")?.trim() ?? "";

  const [quotes, setQuotes] = useState<OohRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payOpenId, setPayOpenId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [cancelOpenId, setCancelOpenId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mobileMoreId, setMobileMoreId] = useState<string | null>(null);
  const [detailById, setDetailById] = useState<Record<string, OohQuoteContractDetail>>({});
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});

  const loadDetail = useCallback(async (id: string) => {
    setDetailById((prev) => ({ ...prev, [id]: { ...prev[id], loading: true } }));
    try {
      const res = await fetch(`/api/admin/ooh-quotes/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const raw = (await res.json()) as {
        quote?: {
          quoteBreakdown?: QuoteBreakdown | null;
          contract?: OohQuoteContractDetail["contract"];
          contractDisplay?: OohQuoteContractDetail["contractDisplay"];
          contractMeta?: OohQuoteContractDetail["contractMeta"];
        };
      };
      if (!res.ok) throw new Error("load_failed");
      const q = raw.quote;
      setDetailById((prev) => ({
        ...prev,
        [id]: {
          loading: false,
          quoteBreakdown: q?.quoteBreakdown ?? null,
          contract: q?.contract ?? null,
          contractDisplay: q?.contractDisplay ?? null,
          contractMeta: q?.contractMeta ?? null,
        },
      }));
    } catch {
      setDetailById((prev) => ({ ...prev, [id]: { loading: false } }));
    }
  }, []);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    void loadDetail(id);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      if (status !== "all") sp.set("status", status);
      const res = await fetch(`/api/admin/ooh-quotes?${sp.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const raw: unknown = await res.json();
      if (!res.ok) {
        setError(
          typeof raw === "object" &&
            raw !== null &&
            "error" in raw &&
            typeof (raw as { error?: unknown }).error === "string"
            ? (raw as { error: string }).error
            : t("loadError"),
        );
        setQuotes([]);
        return;
      }
      const rows =
        typeof raw === "object" &&
        raw !== null &&
        "quotes" in raw &&
        Array.isArray((raw as { quotes: unknown }).quotes)
          ? (raw as { quotes: OohRow[] }).quotes
          : [];
      setQuotes(rows);
    } catch {
      setError(t("loadError"));
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, [status, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!highlightId || !quotes.some((q) => q.id === highlightId)) return;
    const el = rowRefs.current[highlightId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-amber-50", "dark:bg-amber-950/30");
      const tmr = setTimeout(
        () => el.classList.remove("bg-amber-50", "dark:bg-amber-950/30"),
        2500,
      );
      return () => clearTimeout(tmr);
    }
  }, [highlightId, quotes]);

  function statusLabel(s: string) {
    const key = `status_${s}` as
      | "status_draft"
      | "status_sent"
      | "status_booking_requested"
      | "status_booking_pending"
      | "status_booking_confirmed"
      | "status_invoice_sent"
      | "status_payment_pending"
      | "status_payment_confirmed"
      | "status_contract_confirmed"
      | "status_in_progress"
      | "status_completed"
      | "status_cancelled";
    try {
      return t(key);
    } catch {
      return s;
    }
  }

  const act = async (
    path: string,
    method: string,
    body?: Record<string, unknown>,
  ) => {
    const res = await fetch(path, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const raw: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errCode =
        typeof raw === "object" &&
        raw !== null &&
        "error" in raw &&
        typeof (raw as { error?: unknown }).error === "string"
          ? (raw as { error: string }).error
          : undefined;
      throw new Error(
        mapOohQuoteRecalcApiError(errCode, {
          recalcCustomOnly: t("recalcCustomOnly"),
          recalcNoMedia: t("recalcNoMedia"),
          fallback: t("fail"),
        }),
      );
    }
  };

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
      toast("success", t("ok"));
      void load();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : t("fail"));
    } finally {
      setBusyId(null);
    }
  };

  const touchBtn = adminMobileTouchBtnClass;

  const revisionBadge = (row: OohRow) =>
    row.revisionMessage ? (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
        {t("revisionRequestBadge")}
      </span>
    ) : null;

  const revisionMessageBlock = (row: OohRow) =>
    row.revisionMessage ? (
      <div className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/80 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
          {t("revisionRequestMessageLabel")}
          {row.revisionRequestedAt
            ? ` · ${row.revisionRequestedAt.slice(0, 16).replace("T", " ")}`
            : ""}
        </p>
        <p className="mt-1 whitespace-pre-wrap text-foreground">{row.revisionMessage}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3 border-amber-300 bg-white hover:bg-amber-50 dark:border-amber-500/40 dark:bg-transparent dark:hover:bg-amber-500/10"
          disabled={busyId === row.id}
          onClick={() =>
            void run(row.id, () =>
              act(`/api/admin/ooh-quotes/${row.id}`, "PATCH", {
                clearRevisionRequest: true,
              }),
            )
          }
        >
          {t("revisionRequestAcknowledge")}
        </Button>
      </div>
    ) : null;

  const renderMobilePrimaryActions = (row: OohRow) => {
    const actions: ReactNode[] = [];
    if (canShowSendQuote(row)) {
      actions.push(
        <Button
          key="send"
          className={`w-full bg-hermes text-white hover:bg-hermes/90 ${touchBtn}`}
          disabled={busyId === row.id}
          onClick={() =>
            void run(row.id, () =>
              act(`/api/admin/ooh-quotes/${row.id}/send-quote`, "POST"),
            )
          }
        >
          {row.status === "draft" ? t("sendQuote") : t("resendQuote")}
        </Button>,
      );
    }
    if (canShowBookingConfirm(row)) {
      actions.push(
        <Button
          key="booking"
          className={`w-full bg-navy text-white hover:bg-navy/90 ${touchBtn}`}
          disabled={busyId === row.id}
          onClick={() =>
            void run(row.id, () =>
              act(`/api/admin/ooh-quotes/${row.id}/booking-confirm`, "PATCH"),
            )
          }
        >
          {t("bookingConfirm")}
        </Button>,
      );
    }
    if (canShowContractConfirm(row)) {
      actions.push(
        <Button
          key="contract"
          className={`w-full bg-gold text-foreground dark:text-hero-fg ${touchBtn}`}
          disabled={busyId === row.id}
          onClick={() =>
            void run(row.id, () =>
              act(`/api/admin/ooh-quotes/${row.id}/contract-confirm`, "PATCH"),
            )
          }
        >
          {t("contractConfirm")}
        </Button>,
      );
    }
    if (canShowSendInvoice(row)) {
      actions.push(
        <Button
          key="invoice"
          variant="secondary"
          className={`w-full ${touchBtn}`}
          disabled={busyId === row.id}
          onClick={() =>
            void run(row.id, () =>
              act(`/api/admin/ooh-quotes/${row.id}/send-invoice`, "POST"),
            )
          }
        >
          {t("sendInvoice")}
        </Button>,
      );
    }
    if (canShowPaymentConfirm(row)) {
      actions.push(
        <Button
          key="pay"
          variant="outline"
          className={`w-full ${touchBtn}`}
          onClick={() => {
            setPayOpenId(row.id);
            setPayAmount(String(row.totalAmount));
          }}
        >
          {t("paymentConfirm")}
        </Button>,
      );
    }
    if (canShowAwaitingSignature(row)) {
      actions.push(
        <Button key="sign" variant="secondary" className={`w-full ${touchBtn}`} asChild>
          <Link href={`/quote/${row.id}/contract`} target="_blank" rel="noreferrer">
            {t("awaitingSignature")}
          </Link>
        </Button>,
      );
    }
    return actions.slice(0, 3);
  };

  const renderMobileSecondaryActions = (row: OohRow) => (
    <>
      <Button variant="outline" className={`w-full ${touchBtn}`} asChild>
        <Link href={`/quote/${row.id}/preview`} target="_blank" rel="noreferrer">
          <ExternalLink className="mr-1.5 h-4 w-4" />
          {t("openDetail")}
        </Link>
      </Button>
      {canShowSendQuote(row) ? (
        <Button
          variant="outline"
          className={`w-full ${touchBtn}`}
          disabled={busyId === row.id}
          onClick={() =>
            void run(row.id, async () => {
              await act(`/api/admin/ooh-quotes/${row.id}`, "PATCH", {
                recalculate: true,
              });
              await loadDetail(row.id);
            })
          }
        >
          {t("recalc")}
        </Button>
      ) : null}
      {canShowCancel(row) ? (
        <Button
          variant="ghost"
          className={`w-full text-red-600 ${touchBtn}`}
          onClick={() => setCancelOpenId(row.id)}
        >
          {t("cancel")}
        </Button>
      ) : null}
    </>
  );

  return (
    <AdminQuotePageShell>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card className={adminQuoteSectionCard}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground">{t("filterStatus")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <select
            className={`h-9 min-w-[200px] ${adminQuoteSelectClass}`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {OOH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "all"
                  ? t("all")
                  : s === "revision_requested"
                    ? t("filterRevisionRequested")
                    : statusLabel(s)}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("refresh")}
          </Button>
        </CardContent>
      </Card>

      {payOpenId ? (
        <Card className="border-gold/40">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">
                {t("paymentAmountLabel")}
              </label>
              <Input
                type="number"
                min={0}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <Button
              className="bg-navy text-white hover:bg-navy/90"
              disabled={busyId === payOpenId}
              onClick={() =>
                void run(payOpenId, async () => {
                  await act(
                    `/api/admin/ooh-quotes/${payOpenId}/payment-confirm`,
                    "PATCH",
                    { paymentAmount: Number(payAmount) },
                  );
                  setPayOpenId(null);
                  setPayAmount("");
                })
              }
            >
              {t("paymentConfirm")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setPayOpenId(null)}>
              {t("dismiss")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {cancelOpenId ? (
        <Card className="border-red-200">
          <CardContent className="flex flex-col gap-3 p-4">
            <label className="text-xs text-muted-foreground">{t("cancelReason")}</label>
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="…"
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                disabled={busyId === cancelOpenId}
                onClick={() =>
                  void run(cancelOpenId, async () => {
                    await act(`/api/admin/ooh-quotes/${cancelOpenId}/cancel`, "PATCH", {
                      reason: cancelReason.trim(),
                    });
                    setCancelOpenId(null);
                    setCancelReason("");
                  })
                }
              >
                {t("cancel")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setCancelOpenId(null)}>
                {t("dismiss")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className={adminQuoteSectionCard}>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("loading")}
            </div>
          ) : error ? (
            <p className="p-6 text-sm text-red-600">{error}</p>
          ) : quotes.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <>
              <AdminMobileList>
                {quotes.map((row) => {
                  const expanded = expandedId === row.id;
                  const detail = detailById[row.id];
                  const showMore = mobileMoreId === row.id;
                  const primaryActions = renderMobilePrimaryActions(row);
                  return (
                    <AdminMobileCard
                      key={row.id}
                      cardRef={(el) => {
                        rowRefs.current[row.id] = el;
                      }}
                    >
                      <div className="space-y-2">
                        <button
                          type="button"
                          className={`w-full text-left ${adminQuoteEmphasisTextClass}`}
                          onClick={() => toggleExpand(row.id)}
                        >
                          <span className="inline-flex items-center gap-1 text-sm font-semibold">
                            {expanded ? (
                              <ChevronUp className="h-4 w-4 shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 shrink-0" />
                            )}
                            {row.clientName}
                          </span>
                        </button>
                        {row.sourceAdminQuoteId && row.sourceAdminQuoteNumber ? (
                          <p className="text-[11px] leading-snug text-muted-foreground">
                            {t("sourceFromAdminQuote", {
                              number: row.sourceAdminQuoteNumber,
                            })}{" "}
                            <Link
                              href={`/admin/quotes/${row.sourceAdminQuoteId}/edit`}
                              className={adminQuoteLinkVioletClass}
                            >
                              {t("sourceFromAdminQuoteLink")}
                            </Link>
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="font-semibold tabular-nums text-foreground">
                            {formatOohQuoteManwonShort(row.totalAmount)}
                          </span>
                          <span className="text-muted-foreground">{row.period}</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground">
                              {statusLabel(row.status)}
                            </span>
                            {revisionBadge(row)}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {row.updatedAt.slice(0, 10)}
                          </span>
                        </div>
                        {row.clientEmail ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {row.clientEmail}
                          </p>
                        ) : null}
                      </div>
                      {primaryActions.length > 0 ? (
                        <div className="mt-3 flex flex-col gap-2">
                          {primaryActions}
                        </div>
                      ) : null}
                      <div className="mt-2 flex flex-col gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className={touchBtn}
                          onClick={() => toggleExpand(row.id)}
                        >
                          {expanded ? t("collapseDetail") : t("expandDetail")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className={touchBtn}
                          onClick={() =>
                            setMobileMoreId(showMore ? null : row.id)
                          }
                        >
                          {t("moreActions")}
                        </Button>
                      </div>
                      {showMore ? (
                        <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-2">
                          {renderMobileSecondaryActions(row)}
                        </div>
                      ) : null}
                      {expanded ? (
                        <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 p-3 dark:bg-card/10">
                          {revisionMessageBlock(row)}
                          <AdminOohContractDetailPanel
                            quoteId={row.id}
                            detail={detail}
                            recalcBusy={busyId === row.id}
                            onRecalc={() =>
                              void run(row.id, async () => {
                                await act(`/api/admin/ooh-quotes/${row.id}`, "PATCH", {
                                  recalculate: true,
                                });
                                await loadDetail(row.id);
                              })
                            }
                            onSaved={() => void loadDetail(row.id)}
                          />
                        </div>
                      ) : null}
                    </AdminMobileCard>
                  );
                })}
              </AdminMobileList>
              <div className={adminDesktopTableWrapClass}>
              <table className="w-full text-sm">
                <thead className={adminQuoteTableTheadClass}>
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("colClient")}</th>
                    <th className="px-3 py-2 font-medium">{t("colEmail")}</th>
                    <th className="px-3 py-2 font-medium">{t("colAmount")}</th>
                    <th className="px-3 py-2 font-medium">{t("colPeriod")}</th>
                    <th className="px-3 py-2 font-medium">{t("colStatus")}</th>
                    <th className="px-3 py-2 font-medium">{t("colUpdated")}</th>
                    <th className="px-3 py-2 font-medium"> </th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((row) => {
                    const expanded = expandedId === row.id;
                    const detail = detailById[row.id];
                    return (
                    <Fragment key={row.id}>
                    <tr
                      key={row.id}
                      ref={(el) => {
                        rowRefs.current[row.id] = el;
                      }}
                      className="border-b border-border/10 transition-colors dark:border-hero-fg/10"
                    >
                      <td className={`px-3 py-2 ${adminQuoteEmphasisTextClass}`}>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-left hover:underline"
                          onClick={() => toggleExpand(row.id)}
                        >
                          {expanded ? (
                            <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                          )}
                          {row.clientName}
                        </button>
                        {row.sourceAdminQuoteId && row.sourceAdminQuoteNumber ? (
                          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                            {t("sourceFromAdminQuote", {
                              number: row.sourceAdminQuoteNumber,
                            })}{" "}
                            <Link
                              href={`/admin/quotes/${row.sourceAdminQuoteId}/edit`}
                              className={adminQuoteLinkVioletClass}
                            >
                              {t("sourceFromAdminQuoteLink")}
                            </Link>
                          </p>
                        ) : null}
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-xs">
                        {row.clientEmail || "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatOohQuoteManwonShort(row.totalAmount)}
                      </td>
                      <td className="px-3 py-2">{row.period}</td>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>{statusLabel(row.status)}</span>
                          {revisionBadge(row)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {row.updatedAt.slice(0, 10)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/quote/${row.id}/preview`} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-1 h-3 w-3" />
                              {t("openDetail")}
                            </Link>
                          </Button>
                          {canShowSendQuote(row) ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyId === row.id}
                                onClick={() =>
                                  void run(row.id, async () => {
                                    await act(`/api/admin/ooh-quotes/${row.id}`, "PATCH", {
                                      recalculate: true,
                                    });
                                    await loadDetail(row.id);
                                  })
                                }
                              >
                                {t("recalc")}
                              </Button>
                              <Button
                                size="sm"
                                className="bg-hermes text-white hover:bg-hermes/90"
                                disabled={busyId === row.id}
                                onClick={() =>
                                  void run(row.id, () =>
                                    act(
                                      `/api/admin/ooh-quotes/${row.id}/send-quote`,
                                      "POST",
                                    ),
                                  )
                                }
                              >
                                {row.status === "draft"
                                  ? t("sendQuote")
                                  : t("resendQuote")}
                              </Button>
                            </>
                          ) : null}
                          {canShowBookingConfirm(row) ? (
                            <Button
                              size="sm"
                              className="bg-navy text-white hover:bg-navy/90"
                              disabled={busyId === row.id}
                              onClick={() =>
                                void run(row.id, () =>
                                  act(
                                    `/api/admin/ooh-quotes/${row.id}/booking-confirm`,
                                    "PATCH",
                                  ),
                                )
                              }
                            >
                              {t("bookingConfirm")}
                            </Button>
                          ) : null}
                          {canShowSendInvoice(row) ? (
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={busyId === row.id}
                                onClick={() =>
                                  void run(row.id, () =>
                                    act(
                                      `/api/admin/ooh-quotes/${row.id}/send-invoice`,
                                      "POST",
                                    ),
                                  )
                                }
                              >
                                {t("sendInvoice")}
                              </Button>
                            </div>
                          ) : null}
                          {canShowAwaitingSignature(row) ? (
                            <div className="flex flex-col gap-1">
                              <Button size="sm" variant="secondary" asChild>
                                <Link
                                  href={`/quote/${row.id}/contract`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {t("awaitingSignature")}
                                </Link>
                              </Button>
                              <p className="max-w-[12rem] text-[10px] leading-snug text-amber-800 dark:text-amber-200">
                                {t("awaitingSignatureHint")}
                              </p>
                            </div>
                          ) : null}
                          {canShowPaymentConfirm(row) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPayOpenId(row.id);
                                setPayAmount(String(row.totalAmount));
                              }}
                            >
                              {t("paymentConfirm")}
                            </Button>
                          ) : null}
                          {canShowContractConfirm(row) ? (
                            <Button
                              size="sm"
                              className="bg-gold text-foreground dark:text-hero-fg"
                              disabled={busyId === row.id}
                              onClick={() =>
                                void run(row.id, () =>
                                  act(
                                    `/api/admin/ooh-quotes/${row.id}/contract-confirm`,
                                    "PATCH",
                                  ),
                                )
                              }
                            >
                              {t("contractConfirm")}
                            </Button>
                          ) : null}
                          {canShowCancel(row) ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => setCancelOpenId(row.id)}
                            >
                              {t("cancel")}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr key={`${row.id}-detail`} className={adminQuoteTableExpandedRowClass}>
                        <td colSpan={7} className="px-4 py-3">
                          {revisionMessageBlock(row)}
                          <AdminOohContractDetailPanel
                            quoteId={row.id}
                            detail={detail}
                            recalcBusy={busyId === row.id}
                            onRecalc={() =>
                              void run(row.id, async () => {
                                await act(`/api/admin/ooh-quotes/${row.id}`, "PATCH", {
                                  recalculate: true,
                                });
                                await loadDetail(row.id);
                              })
                            }
                            onSaved={() => void loadDetail(row.id)}
                          />
                        </td>
                      </tr>
                    ) : null}
                    </Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AdminQuotePageShell>
  );
}
