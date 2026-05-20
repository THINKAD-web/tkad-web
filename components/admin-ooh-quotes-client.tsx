"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { useToast } from "@/components/toast-provider";

const OOH_STATUSES = [
  "all",
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
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

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
      el.classList.add("bg-amber-50");
      const tmr = setTimeout(() => el.classList.remove("bg-amber-50"), 2500);
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
      const msg =
        typeof raw === "object" &&
        raw !== null &&
        "error" in raw &&
        typeof (raw as { error?: unknown }).error === "string"
          ? (raw as { error: string }).error
          : t("fail");
      throw new Error(msg);
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground dark:text-hero-fg">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-navy">{t("filterStatus")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <select
            className="h-9 min-w-[200px] rounded-md border border-input bg-white px-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {OOH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? t("all") : statusLabel(s)}
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
              className="bg-navy text-white"
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

      <Card>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-slate-50 text-left text-xs text-muted-foreground">
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
                  {quotes.map((row) => (
                    <tr
                      key={row.id}
                      ref={(el) => {
                        rowRefs.current[row.id] = el;
                      }}
                      className="border-b border-slate-100 transition-colors"
                    >
                      <td className="px-3 py-2 font-medium text-navy">
                        {row.clientName}
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-xs">
                        {row.clientEmail || "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        ₩{row.totalAmount.toLocaleString("ko-KR")}
                      </td>
                      <td className="px-3 py-2">{row.period}</td>
                      <td className="px-3 py-2 text-xs">{statusLabel(row.status)}</td>
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
                          {(row.status === "draft" || row.status === "sent") && (
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
                          )}
                          {(row.status === "booking_requested" ||
                            row.status === "booking_pending") && (
                            <Button
                              size="sm"
                              className="bg-navy text-white"
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
                          )}
                          {row.status === "booking_confirmed" && (
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
                          )}
                          {(row.status === "invoice_sent" ||
                            row.status === "payment_pending") && (
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
                          )}
                          {row.status === "payment_confirmed" && (
                            <Button
                              size="sm"
                              className="bg-gold text-navy"
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
                          )}
                          {![
                            "cancelled",
                            "completed",
                            "contract_confirmed",
                            "in_progress",
                          ].includes(row.status) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => setCancelOpenId(row.id)}
                            >
                              {t("cancel")}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
