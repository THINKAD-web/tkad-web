"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  NETWORK_CATALOG_TYPE_LABELS,
} from "@/lib/media-network-types";
import {
  filterAdminNetworks,
  formatNetworkRegionsSummary,
  formatNetworkUpdatedAt,
  resolveRowCatalogType,
  toAdminNetworkListRow,
  type AdminNetworkListRow,
  type NetworkPublicFilter,
  type NetworkTypeFilter,
} from "@/lib/admin-network-list";

export type { AdminNetworkListRow };

const ADMIN_NETWORKS_PAGE_SIZE_KEY = "tkad-admin-networks-page-size-v1";
const PAGE_SIZE_OPTIONS = [8, 12, 24] as const;
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

function parsePageSize(raw: string | null): PageSizeOption {
  const v = Number.parseInt(raw ?? "", 10);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(v)
    ? (v as PageSizeOption)
    : 12;
}

type Props = {
  initialRows: AdminNetworkListRow[];
  initialError: "db" | "load" | null;
};

export default function AdminNetworksListClient({
  initialRows,
  initialError,
}: Props) {
  const t = useTranslations("adminNetworks");
  const locale = useLocale();
  const isKo = locale.startsWith("ko");

  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState(initialError);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<NetworkTypeFilter>("all");
  const [publicFilter, setPublicFilter] = useState<NetworkPublicFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(12);

  useEffect(() => {
    setPageSize(parsePageSize(localStorage.getItem(ADMIN_NETWORKS_PAGE_SIZE_KEY)));
  }, []);

  const onPageSizeChange = useCallback((v: number) => {
    const next = parsePageSize(String(v));
    setPageSize(next);
    setPage(1);
    localStorage.setItem(ADMIN_NETWORKS_PAGE_SIZE_KEY, String(next));
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/networks", { cache: "no-store" });
      if (!res.ok) {
        setError("load");
        return;
      }
      const data = (await res.json()) as { networks?: unknown[] };
      if (Array.isArray(data.networks)) {
        setRows(
          data.networks.map((n) =>
            toAdminNetworkListRow(n as Parameters<typeof toAdminNetworkListRow>[0]),
          ),
        );
      }
    } catch {
      setError("load");
    }
  }, []);

  const onDelete = useCallback(
    async (id: string) => {
      if (!window.confirm(t("deleteConfirm"))) return;
      setDeletingId(id);
      try {
        const res = await fetch(`/api/admin/networks/${id}`, { method: "DELETE" });
        if (!res.ok) {
          setError("load");
          return;
        }
        setRows((prev) => prev.filter((r) => r.id !== id));
      } catch {
        setError("load");
      } finally {
        setDeletingId(null);
      }
    },
    [t],
  );

  const toggleActive = useCallback(async (row: AdminNetworkListRow) => {
    const next = !row.isActive;
    setTogglingId(row.id);
    try {
      const res = await fetch(`/api/admin/networks/${row.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) return;
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, isActive: next } : r)),
      );
    } catch {
      /* ignore */
    } finally {
      setTogglingId(null);
    }
  }, []);

  const catalogLabel = useCallback(
    (row: AdminNetworkListRow) => {
      const catalog = resolveRowCatalogType(row);
      const lb = NETWORK_CATALOG_TYPE_LABELS[catalog];
      return lb?.[isKo ? "ko" : "en"] ?? row.type;
    },
    [isKo],
  );

  const filtered = useMemo(
    () => filterAdminNetworks(rows, { search, typeFilter, publicFilter }),
    [rows, search, typeFilter, publicFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filtered.length / pageSize));
    setPage((p) => Math.min(p, maxPage));
  }, [filtered.length, pageSize]);

  const isRowActive = (row: AdminNetworkListRow) => row.isActive;

  const renderActiveToggle = (row: AdminNetworkListRow) => (
    <button
      type="button"
      disabled={togglingId === row.id}
      title={
        isRowActive(row)
          ? isKo
            ? "공개 목록·검색에서 숨기기"
            : "Hide from public catalog"
          : isKo
            ? "공개 목록·검색에 표시"
            : "Show in public catalog"
      }
      aria-label={
        isRowActive(row)
          ? isKo
            ? "공개 목록 끄기"
            : "Deactivate"
          : isKo
            ? "공개 목록 켜기"
            : "Activate"
      }
      onClick={() => void toggleActive(row)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors disabled:opacity-50 ${
        isRowActive(row) ? "bg-emerald-500" : "bg-slate-300"
      }`}
    >
      <span
        className={`mt-0.5 inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          isRowActive(row) ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );

  const renderRowActions = (row: AdminNetworkListRow, compact?: boolean) => (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "" : "justify-center"}`}>
      <Button variant="secondary" size="xs" asChild className="h-8 px-2 text-xs">
        <Link href={`/media/network/${row.id}`} target="_blank">
          {compact ? (isKo ? "미리보기" : "Preview") : t("publicPreview")}
        </Link>
      </Button>
      <Button variant="outline" size="xs" asChild className="h-8 px-2 text-xs">
        <Link href={`/admin/networks/${row.id}`}>
          <Pencil className="mr-1 h-3.5 w-3.5" />
          {t("manage")}
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        className="text-destructive hover:text-destructive"
        disabled={deletingId === row.id}
        onClick={() => onDelete(row.id)}
        title={t("delete")}
      >
        {deletingId === row.id ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );

  const emptyMessage =
    rows.length === 0
      ? isKo
        ? "등록된 네트워크가 없습니다."
        : "No networks yet."
      : isKo
        ? "조건에 맞는 네트워크가 없습니다."
        : "No networks match your filters.";

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" onClick={() => void refresh()}>
            {isKo ? "새로고침" : "Refresh"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/networks/quick-add">
              {isKo ? "빠른 등록 (JSON)" : "Quick add (JSON)"}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/networks/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("new")}
            </Link>
          </Button>
        </div>
      </div>

      {error === "db" && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t("dbError")}
        </div>
      )}
      {error === "load" && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t("loadError")}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap gap-1">
          {(
            [
              { value: "all" as const, label: isKo ? "전체" : "All" },
              { value: "digital" as const, label: isKo ? "디지털" : "Digital" },
              { value: "static" as const, label: isKo ? "고정형" : "Static" },
              { value: "mobile" as const, label: isKo ? "이동형" : "Mobile" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setTypeFilter(opt.value);
                setPage(1);
              }}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                typeFilter === opt.value
                  ? "border-2 border-border bg-foreground text-background"
                  : "border-2 border-border bg-card text-foreground hover:bg-muted/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="relative w-full min-w-0 sm:w-52">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isKo ? "네트워크·지점명 검색…" : "Search name or site…"}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full pl-8 text-sm"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-muted/15 px-2 py-2 sm:px-2.5">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {isKo ? "노출 필터" : "Visibility"}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-11 shrink-0 text-xs font-medium text-muted-foreground">
            {isKo ? "공개" : "Public"}
          </span>
          {(
            [
              { value: "all" as const, label: isKo ? "전체" : "All" },
              { value: "public" as const, label: isKo ? "공개만" : "Public" },
              { value: "hidden" as const, label: isKo ? "숨김만" : "Hidden" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setPublicFilter(opt.value);
                setPage(1);
              }}
              className={`rounded-full px-2 py-1 text-[11px] font-semibold transition-colors sm:px-2.5 sm:text-xs ${
                publicFilter === opt.value
                  ? "border-2 border-border bg-foreground text-background"
                  : "border-2 border-border bg-card text-foreground hover:bg-muted/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        {/* Mobile cards */}
        <div className="md:hidden">
          {paginated.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {paginated.map((row) => (
                <li
                  key={row.id}
                  className={`border-l-[3px] px-3 py-3 ${
                    isRowActive(row)
                      ? "border-l-transparent"
                      : "border-l-amber-500/75 bg-muted/35 dark:border-l-amber-400/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-sm font-semibold leading-snug">{row.name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {catalogLabel(row)}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {t("registeredPins", { count: row._count.locations })}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatNetworkRegionsSummary(row.regions, locale)}
                      </p>
                      {row.pricePackage != null && (
                        <p className="text-xs text-muted-foreground">
                          {t("pricePackage")}: {row.pricePackage.toLocaleString()}
                          {isKo ? "만원/월" : " (10K/mo)"}
                        </p>
                      )}
                    </div>
                    {renderActiveToggle(row)}
                  </div>
                  <div className="mt-3">{renderRowActions(row, true)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[48rem] table-fixed text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium text-foreground/80 dark:bg-muted/20">
                <th className="w-[28%] min-w-[10rem] px-3 py-2.5">{isKo ? "이름" : "Name"}</th>
                <th className="w-[5.5rem] px-2 py-2.5">{isKo ? "유형" : "Type"}</th>
                <th className="w-20 px-2 py-2.5 text-center">{isKo ? "공개" : "Public"}</th>
                <th className="w-16 px-2 py-2.5 text-center">{isKo ? "지점" : "Sites"}</th>
                <th className="w-24 px-2 py-2.5">{isKo ? "패키지가" : "Package"}</th>
                <th className="w-[18%] min-w-[7rem] px-2 py-2.5">{isKo ? "지역" : "Regions"}</th>
                <th className="w-24 px-2 py-2.5">{isKo ? "수정일" : "Updated"}</th>
                <th className="w-[11rem] px-2 py-2.5 text-center">{isKo ? "관리" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginated.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b last:border-0 border-l-[3px] transition-colors ${
                      isRowActive(row)
                        ? "border-l-transparent hover:bg-muted/40"
                        : "border-l-amber-500/75 bg-muted/25 hover:bg-muted/40 dark:border-l-amber-400/60"
                    }`}
                  >
                    <td className="min-w-0 px-3 py-2.5 align-middle">
                      <div className="truncate font-medium" title={row.name}>
                        {row.name}
                      </div>
                      {row.nameEn ? (
                        <div className="truncate text-xs text-muted-foreground" title={row.nameEn}>
                          {row.nameEn}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-2 py-2.5 align-middle">
                      <Badge
                        variant="secondary"
                        className="max-w-full truncate text-[11px]"
                        title={catalogLabel(row)}
                      >
                        {catalogLabel(row)}
                      </Badge>
                    </td>
                    <td className="px-2 py-2.5 text-center align-middle">
                      {renderActiveToggle(row)}
                    </td>
                    <td className="px-2 py-2.5 text-center align-middle tabular-nums text-muted-foreground">
                      {row._count.locations}
                    </td>
                    <td className="px-2 py-2.5 align-middle text-xs tabular-nums">
                      {row.pricePackage != null
                        ? `${row.pricePackage.toLocaleString()}${isKo ? "만" : "K"}`
                        : "—"}
                    </td>
                    <td className="px-2 py-2.5 align-middle">
                      <span
                        className="line-clamp-2 text-xs text-muted-foreground"
                        title={formatNetworkRegionsSummary(row.regions, locale)}
                      >
                        {formatNetworkRegionsSummary(row.regions, locale)}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 align-middle text-xs text-muted-foreground tabular-nums">
                      {formatNetworkUpdatedAt(row.updatedAt, locale)}
                    </td>
                    <td className="px-2 py-2.5 align-middle">
                      {renderRowActions(row)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-col gap-2 border-t px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4">
            <span className="text-center text-xs text-muted-foreground sm:text-left">
              {isKo ? "총" : ""} {filtered.length}
              {isKo ? "건 중 " : " total · "}
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-end">
              <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="shrink-0">{isKo ? "페이지당" : "Per page"}</span>
                <select
                  className="h-8 min-w-[4.5rem] rounded-md border border-input bg-background px-2 text-xs font-medium"
                  value={pageSize}
                  aria-label={isKo ? "페이지당 네트워크 수" : "Rows per page"}
                  onChange={(e) =>
                    onPageSizeChange(Number.parseInt(e.target.value, 10))
                  }
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                      {isKo ? "개" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {totalPages > 1 && (
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="outline"
                    size="icon-xs"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    aria-label={isKo ? "이전 페이지" : "Previous page"}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="flex items-center px-1 text-[11px] text-muted-foreground">
                    {page}/{totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label={isKo ? "다음 페이지" : "Next page"}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {rows.length === 0 && !error && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
            <p className="text-sm">{isKo ? "등록된 네트워크가 없습니다." : "No networks yet."}</p>
            <Button asChild>
              <Link href="/admin/networks/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("new")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
