"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { QuoteApi } from "@/lib/admin-sales-quote";
import { ADMIN_QUOTE_STATUSES } from "@/lib/admin-sales-quote";
import {
  Copy,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  FileDown,
  Search,
  Pencil,
  Trash2,
  FileSignature,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import {
  AdminQuotePageShell,
  adminQuoteSectionCard,
} from "@/components/admin/admin-quote-page-shell";

function formatWon(n: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(n));
}

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

export default function AdminQuotesListClient() {
  const t = useTranslations("adminQuotesList");
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<QuoteApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [emailOpenId, setEmailOpenId] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQDebounced(q);
      debounceRef.current = null;
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      if (qDebounced.trim()) sp.set("q", qDebounced.trim());
      if (status !== "all") sp.set("status", status);
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      const res = await fetch(`/api/admin/quotes?${sp.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const raw: unknown = await res.json();
      if (!res.ok) {
        const err =
          typeof raw === "object" &&
          raw !== null &&
          "error" in raw &&
          typeof (raw as { error?: unknown }).error === "string"
            ? (raw as { error: string }).error
            : t("loadError");
        setError(err);
        setQuotes([]);
        return;
      }
      const rows =
        typeof raw === "object" &&
        raw !== null &&
        "quotes" in raw &&
        Array.isArray((raw as { quotes: unknown }).quotes)
          ? (raw as { quotes: QuoteApi[] }).quotes
          : [];
      setQuotes(rows);
    } catch {
      setError(t("networkError"));
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, [qDebounced, status, from, to, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEmail = (row: QuoteApi) => {
    setEmailOpenId(row.id);
    setEmailTo(row.clientEmail ?? "");
  };

  const sendEmail = async () => {
    if (!emailOpenId) return;
    if (!emailTo.trim()) {
      toast("warning", t("emailNeedAddress"));
      return;
    }
    setBusyId(emailOpenId);
    try {
      const res = await fetch(
        `/api/admin/quotes/${emailOpenId}/send-email`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: emailTo.trim() }),
        },
      );
      const raw: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof raw === "object" &&
          raw !== null &&
          "error" in raw &&
          typeof (raw as { error?: unknown }).error === "string"
            ? (raw as { error: string }).error
            : t("emailFailed");
        toast("error", msg);
        return;
      }
      toast("success", t("emailSent"));
      setEmailOpenId(null);
      void load();
    } catch {
      toast("error", t("emailFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const downloadPdf = async (id: string, quoteNumber: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/quotes/${id}/pdf`, {
        credentials: "include",
      });
      if (!res.ok) {
        toast("error", t("pdfFailed"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `thinkad-quote-${quoteNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast("error", t("pdfFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const copyQuote = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/quotes/${id}/copy`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        toast("error", t("copyFailed"));
        return;
      }
      toast("success", t("copyOk"));
      void load();
    } catch {
      toast("error", t("copyFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const deleteQuote = async (row: QuoteApi) => {
    if (
      !window.confirm(
        t("deleteConfirm", { number: row.quoteNumber, name: row.clientName }),
      )
    ) {
      return;
    }
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/quotes/${row.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        toast("error", t("deleteFailed"));
        return;
      }
      toast("success", t("deleteOk"));
      void load();
    } catch {
      toast("error", t("deleteFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const patchStatus = async (id: string, next: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/quotes/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        toast("error", t("statusFailed"));
        return;
      }
      void load();
    } catch {
      toast("error", t("statusFailed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminQuotePageShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link href="/admin/quotes/new">
          <Button className="bg-hero-void text-hero-fg hover:bg-muted dark:border dark:border-hero-fg/20">
            <Plus className="mr-2 h-4 w-4" />
            {t("newQuote")}
          </Button>
        </Link>
      </div>

      <Card className={adminQuoteSectionCard}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground">{t("filters")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("searchPh")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              {t("status")}
            </label>
            <select
              className="h-9 w-full min-w-[140px] rounded-md border border-input bg-white px-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">{t("statusAll")}</option>
              {ADMIN_QUOTE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status_${s}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              {t("from")}
            </label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              {t("to")}
            </label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button type="button" variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("refresh")}
          </Button>
        </CardContent>
      </Card>

      {emailOpenId ? (
        <Card className="border-2 border-border/20 dark:border-hero-fg/25">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("emailTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">
                {t("emailTo")}
              </label>
              <Input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="client@company.com"
              />
            </div>
            <Button
              type="button"
              className="bg-hero-void text-hero-fg dark:border dark:border-hero-fg/20"
              disabled={busyId === emailOpenId}
              onClick={() => void sendEmail()}
            >
              {busyId === emailOpenId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  {t("emailSend")}
                </>
              )}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEmailOpenId(null)}>
              {t("cancel")}
            </Button>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted text-left text-xs text-muted-foreground dark:bg-card/5">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("colNumber")}</th>
                    <th className="px-3 py-2 font-medium">{t("colClient")}</th>
                    <th className="px-3 py-2 font-medium">{t("colStatus")}</th>
                    <th className="px-3 py-2 font-medium">{t("colTotal")}</th>
                    <th className="px-3 py-2 font-medium">{t("colCreated")}</th>
                    <th className="px-3 py-2 font-medium">{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((row) => (
                    <tr key={row.id} className="border-b border-border/10 dark:border-hero-fg/10">
                      <td className="px-3 py-2 text-xs font-medium text-foreground dark:text-hero-fg">
                        <Link
                          href={`/admin/quotes/${row.id}/edit`}
                          className="font-semibold text-violet-700 hover:underline"
                        >
                          {row.quoteNumber}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        {row.clientName.includes(" · ") ? (
                          <>
                            <div className="font-medium">
                              {row.clientName.split(" · ")[0]}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {row.clientName.split(" · ").slice(1).join(" · ")}
                              {row.clientPhone ? ` · ${row.clientPhone}` : ""}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-medium">{row.clientName}</div>
                            <div className="text-xs text-muted-foreground">
                              {row.clientPhone ?? "—"}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="h-8 max-w-[9rem] rounded border border-slate-200 bg-white px-1.5 text-xs"
                          value={row.status}
                          disabled={busyId === row.id}
                          onChange={(e) => void patchStatus(row.id, e.target.value)}
                        >
                          {ADMIN_QUOTE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {t(`status_${s}`)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 tabular-nums">₩{formatWon(row.total)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            disabled={busyId === row.id}
                            asChild
                          >
                            <Link href={`/admin/quotes/${row.id}/edit`}>
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              {t("edit")}
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 border-navy/30 bg-navy/5 text-xs text-navy hover:bg-navy/10 dark:text-hero-fg"
                            disabled={busyId === row.id}
                            asChild
                          >
                            <Link
                              href={
                                row.clientEmail?.trim()
                                  ? `/admin/quotes/${row.id}/edit?contract=1`
                                  : `/admin/quotes/${row.id}/edit`
                              }
                            >
                              <FileSignature className="mr-1 h-3.5 w-3.5" />
                              {t("createContract")}
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            disabled={busyId === row.id}
                            onClick={() => void downloadPdf(row.id, row.quoteNumber)}
                          >
                            <FileDown className="mr-1 h-3.5 w-3.5" />
                            PDF
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            disabled={busyId === row.id}
                            onClick={() => openEmail(row)}
                          >
                            <Mail className="mr-1 h-3.5 w-3.5" />
                            {t("email")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            disabled={busyId === row.id}
                            onClick={() => void copyQuote(row.id)}
                          >
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            {t("copy")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                            disabled={busyId === row.id}
                            onClick={() => void deleteQuote(row)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            {t("delete")}
                          </Button>
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
    </AdminQuotePageShell>
  );
}
