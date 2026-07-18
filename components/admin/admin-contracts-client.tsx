"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import type { QuoteBreakdown } from "@/lib/quote-calculator";
import {
  AdminQuotePageShell,
  adminDesktopTableWrapClass,
  adminMobileTouchBtnClass,
  adminQuoteSectionCard,
  adminQuoteSectionHeader,
  adminQuoteSectionHint,
  adminQuoteSectionTitle,
  adminQuoteSelectClass,
} from "@/components/admin/admin-quote-page-shell";
import {
  AdminMobileCard,
  AdminMobileList,
} from "@/components/admin/admin-mobile-list-primitives";
import {
  AdminOohContractDetailPanel,
  type OohQuoteContractDetail,
} from "@/components/admin/admin-ooh-contract-detail";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/components/toast-provider";
import { mapOohQuoteRecalcApiError } from "@/lib/ooh-quote-recalc-error";
import {
  formatOohQuoteManwonShort,
  formatOohQuoteTotalKrw,
} from "@/lib/ooh-quote-amount";

type ContractRow = {
  quoteId: string;
  contractId: string;
  clientName: string;
  clientCompany: string | null;
  clientEmail: string;
  totalAmount: number;
  period: string;
  startDate: string | null;
  endDate: string | null;
  quoteStatus: string;
  contractStatus: string;
  contractSigned: boolean;
  signedAt: string | null;
};

type Kpi = {
  pendingCount: number;
  signedCount: number;
  thisMonthCount: number;
  thisMonthAmountManwon: number;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ko-KR");
}

function formatPeriod(row: ContractRow): string {
  if (row.startDate && row.endDate) {
    return `${formatDate(row.startDate)} ~ ${formatDate(row.endDate)}`;
  }
  return row.period || "—";
}

export default function AdminContractsClient() {
  const t = useTranslations("adminContracts");
  const tOoh = useTranslations("adminOohQuotes");
  const { toast } = useToast();

  const [rows, setRows] = useState<ContractRow[]>([]);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contractStatus, setContractStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [sheetQuoteId, setSheetQuoteId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OohQuoteContractDetail | undefined>();
  const [recalcBusy, setRecalcBusy] = useState(false);

  const loadDetail = useCallback(async (quoteId: string) => {
    setDetail({ loading: true });
    try {
      const res = await fetch(`/api/admin/ooh-quotes/${quoteId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const raw = (await res.json()) as {
        quote?: {
          quoteBreakdown?: QuoteBreakdown | null;
          contract?: OohQuoteContractDetail["contract"];
          contractDisplay?: OohQuoteContractDetail["contractDisplay"];
        };
      };
      if (!res.ok) throw new Error("load_failed");
      const q = raw.quote;
      setDetail({
        loading: false,
        quoteBreakdown: q?.quoteBreakdown ?? null,
        contract: q?.contract ?? null,
        contractDisplay: q?.contractDisplay ?? null,
      });
    } catch {
      setDetail({ loading: false });
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      if (contractStatus !== "all") sp.set("contractStatus", contractStatus);
      if (dateFrom) sp.set("dateFrom", dateFrom);
      if (dateTo) sp.set("dateTo", dateTo);
      if (search) sp.set("search", search);

      const res = await fetch(`/api/admin/contracts?${sp.toString()}`, {
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
        setRows([]);
        setKpi(null);
        return;
      }
      const data = raw as { contracts?: ContractRow[]; kpi?: Kpi };
      setRows(Array.isArray(data.contracts) ? data.contracts : []);
      setKpi(data.kpi ?? null);
    } catch {
      setError(t("loadError"));
      setRows([]);
      setKpi(null);
    } finally {
      setLoading(false);
    }
  }, [contractStatus, dateFrom, dateTo, search, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (sheetQuoteId) void loadDetail(sheetQuoteId);
  }, [sheetQuoteId, loadDetail]);

  function contractStatusLabel(status: string) {
    const key = `contractStatus_${status}` as
      | "contractStatus_pending"
      | "contractStatus_signed"
      | "contractStatus_confirmed"
      | "contractStatus_cancelled";
    try {
      return tOoh(key);
    } catch {
      return status;
    }
  }

  function openRow(quoteId: string) {
    setSheetQuoteId(quoteId);
  }

  const selectedRow = rows.find((r) => r.quoteId === sheetQuoteId);

  return (
    <AdminQuotePageShell>
      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="text-xs text-muted-foreground">
            {t("roleHint")}{" "}
            <Link
              href="/admin/quotes?tab=booking"
              className="font-semibold text-[color:var(--qp-accent)] underline-offset-2 hover:underline dark:text-[color:var(--qp-accent)]"
            >
              {t("bookingPipelineLink")}
            </Link>
          </p>
          <Link
            href="/admin/contracts/new"
            className="inline-flex items-center rounded-full border border-[color:var(--qp-accent)]/40 bg-[color:var(--qp-accent-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--qp-accent)] hover:bg-[color:var(--qp-accent-soft)] dark:border-[color:var(--qp-accent)]/40 dark:bg-[color:var(--qp-accent)]/10 dark:text-[color:var(--qp-accent)]"
          >
            {t("newContract")}
          </Link>
        </div>
      </div>

      {kpi ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: t("kpiPending"),
              value: `${kpi.pendingCount}${t("kpiUnit")}`,
            },
            {
              label: t("kpiSigned"),
              value: `${kpi.signedCount}${t("kpiUnit")}`,
            },
            {
              label: t("kpiThisMonth"),
              value: `${kpi.thisMonthCount}${t("kpiUnit")}`,
            },
            {
              label: t("kpiThisMonthAmount"),
              value: formatOohQuoteManwonShort(kpi.thisMonthAmountManwon),
            },
          ].map((item) => (
            <Card key={item.label} className={adminQuoteSectionCard}>
              <CardContent className="px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1 font-display text-xl font-bold tabular-nums text-foreground">
                  {item.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Card className={adminQuoteSectionCard}>
        <div className={adminQuoteSectionHeader}>
          <CardContent className="space-y-4 p-0">
            <div>
              <h2 className={adminQuoteSectionTitle}>{t("filterTitle")}</h2>
              <p className={adminQuoteSectionHint}>{t("filterHint")}</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("filterStatus")}
                </span>
                <select
                  value={contractStatus}
                  onChange={(e) => setContractStatus(e.target.value)}
                  className={`block h-9 min-w-[140px] ${adminQuoteSelectClass}`}
                >
                  <option value="all">{t("statusAll")}</option>
                  <option value="pending">{t("statusPending")}</option>
                  <option value="signed">{t("statusSigned")}</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("filterDateFrom")}
                </span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 w-[150px]"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("filterDateTo")}
                </span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 w-[150px]"
                />
              </label>
              <label className="min-w-[200px] flex-1 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("filterSearch")}
                </span>
                <div className="flex gap-2">
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setSearch(searchInput.trim());
                    }}
                    placeholder={t("searchPlaceholder")}
                    className="h-9"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 shrink-0"
                    onClick={() => setSearch(searchInput.trim())}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9"
                onClick={() => void load()}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                {t("refresh")}
              </Button>
            </div>
          </CardContent>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <p className="flex items-center gap-2 px-5 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loading")}
            </p>
          ) : error ? (
            <p className="px-5 py-10 text-sm text-destructive">{error}</p>
          ) : rows.length === 0 ? (
            <p className="px-5 py-10 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <>
              <AdminMobileList>
                {rows.map((row) => (
                  <AdminMobileCard key={row.quoteId}>
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => openRow(row.quoteId)}
                    >
                      <p className="font-mono text-xs font-semibold text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]">
                        {row.contractId.slice(-8).toUpperCase()}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {row.clientName}
                      </p>
                      {row.clientCompany ? (
                        <p className="text-xs text-muted-foreground">{row.clientCompany}</p>
                      ) : null}
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {row.clientEmail}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold tabular-nums text-foreground">
                          {formatOohQuoteTotalKrw(row.totalAmount)}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                          {contractStatusLabel(row.contractStatus)}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {t("colSignedAt")}: {formatDate(row.signedAt)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatPeriod(row)}
                      </p>
                    </button>
                    <div
                      className="mt-3 flex flex-col gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a
                        href={`/api/quote/${row.quoteId}/contract/preview`}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 font-semibold hover:bg-muted ${adminMobileTouchBtnClass}`}
                      >
                        <FileText className="h-4 w-4" />
                        {t("previewPdf")}
                      </a>
                      {row.contractSigned ? (
                        <a
                          href={`/api/quote/${row.quoteId}/contract/signed`}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center justify-center gap-1.5 rounded-md border border-[color:var(--qp-accent)]/40 bg-[color:var(--qp-accent-soft)] px-3 font-semibold text-[color:var(--qp-accent)] hover:bg-[color:var(--qp-accent-soft)] dark:border-[color:var(--qp-accent)]/40 dark:bg-[color:var(--qp-accent)]/10 dark:text-[color:var(--qp-accent)] ${adminMobileTouchBtnClass}`}
                        >
                          <Download className="h-4 w-4" />
                          {t("signedPdf")}
                        </a>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        className={adminMobileTouchBtnClass}
                        onClick={() => openRow(row.quoteId)}
                      >
                        {t("detailTitle")}
                      </Button>
                    </div>
                  </AdminMobileCard>
                ))}
              </AdminMobileList>
              <div className={adminDesktopTableWrapClass}>
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b border-border/60 bg-muted/30 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t("colContractId")}</th>
                    <th className="px-4 py-3">{t("colClient")}</th>
                    <th className="px-4 py-3">{t("colCompany")}</th>
                    <th className="px-4 py-3">{t("colAmount")}</th>
                    <th className="px-4 py-3">{t("colSignStatus")}</th>
                    <th className="px-4 py-3">{t("colSignedAt")}</th>
                    <th className="px-4 py-3">{t("colPeriod")}</th>
                    <th className="px-4 py-3">{t("colPdf")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.quoteId}
                      className="cursor-pointer border-b border-border/40 transition-colors hover:bg-[color:var(--qp-accent-soft)] dark:hover:bg-[color:var(--qp-accent)]/5"
                      onClick={() => openRow(row.quoteId)}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]">
                        {row.contractId.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{row.clientName}</div>
                        <div className="text-xs text-muted-foreground">{row.clientEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.clientCompany ?? "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium">
                        {formatOohQuoteTotalKrw(row.totalAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                          {contractStatusLabel(row.contractStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {formatDate(row.signedAt)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatPeriod(row)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-1">
                          <a
                            href={`/api/quote/${row.quoteId}/contract/preview`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-semibold hover:bg-muted"
                            title={t("previewPdf")}
                          >
                            <FileText className="h-3 w-3" />
                            {t("previewPdf")}
                          </a>
                          {row.contractSigned ? (
                            <a
                              href={`/api/quote/${row.quoteId}/contract/signed`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-[color:var(--qp-accent)]/40 bg-[color:var(--qp-accent-soft)] px-2 py-1 text-[10px] font-semibold text-[color:var(--qp-accent)] hover:bg-[color:var(--qp-accent-soft)] dark:border-[color:var(--qp-accent)]/40 dark:bg-[color:var(--qp-accent)]/10 dark:text-[color:var(--qp-accent)]"
                              title={t("signedPdf")}
                            >
                              <Download className="h-3 w-3" />
                              {t("signedPdf")}
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={sheetQuoteId != null}
        onOpenChange={(open) => {
          if (!open) {
            setSheetQuoteId(null);
            setDetail(undefined);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-3xl"
        >
          <SheetHeader className="border-b border-border/60 pb-4">
            <SheetTitle>{t("detailTitle")}</SheetTitle>
            <SheetDescription>
              {selectedRow ? (
                <>
                  {selectedRow.clientName}
                  {selectedRow.clientCompany ? ` · ${selectedRow.clientCompany}` : ""}
                  {" · "}
                  <span className="font-mono">{selectedRow.contractId.slice(-8).toUpperCase()}</span>
                </>
              ) : null}
            </SheetDescription>
            {selectedRow ? (
              <div className="flex flex-wrap gap-2 pt-2">
                <Link
                  href={`/admin/quotes?tab=booking&highlight=${selectedRow.quoteId}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--qp-accent)] hover:underline dark:text-[color:var(--qp-accent)]"
                >
                  <ExternalLink className="h-3 w-3" />
                  {t("openInPipeline")}
                </Link>
                {selectedRow.contractSigned ? (
                  <a
                    href={`/api/quote/${selectedRow.quoteId}/contract/signed`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--qp-accent)] hover:underline dark:text-[color:var(--qp-accent)]"
                  >
                    <Download className="h-3 w-3" />
                    {t("signedPdf")}
                  </a>
                ) : null}
              </div>
            ) : null}
          </SheetHeader>

          {sheetQuoteId ? (
            <div className="py-4">
              <AdminOohContractDetailPanel
                quoteId={sheetQuoteId}
                detail={detail}
                recalcBusy={recalcBusy}
                onRecalc={() => {
                  if (!sheetQuoteId) return;
                  setRecalcBusy(true);
                  void (async () => {
                    try {
                      const res = await fetch(`/api/admin/ooh-quotes/${sheetQuoteId}`, {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ recalculate: true }),
                      });
                      if (!res.ok) {
                        const raw: unknown = await res.json().catch(() => ({}));
                        const errCode =
                          typeof raw === "object" &&
                          raw !== null &&
                          "error" in raw &&
                          typeof (raw as { error?: unknown }).error === "string"
                            ? (raw as { error: string }).error
                            : undefined;
                        toast(
                          "error",
                          mapOohQuoteRecalcApiError(errCode, {
                            recalcCustomOnly: tOoh("recalcCustomOnly"),
                            recalcNoMedia: tOoh("recalcNoMedia"),
                            fallback: tOoh("fail"),
                          }),
                        );
                        return;
                      }
                      await loadDetail(sheetQuoteId);
                      toast("success", tOoh("ok"));
                    } catch {
                      toast("error", tOoh("fail"));
                    } finally {
                      setRecalcBusy(false);
                    }
                  })();
                }}
                onSaved={() => {
                  void loadDetail(sheetQuoteId);
                  void load();
                }}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </AdminQuotePageShell>
  );
}
