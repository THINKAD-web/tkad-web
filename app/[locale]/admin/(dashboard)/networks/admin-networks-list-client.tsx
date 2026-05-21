"use client";

import { useCallback, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, AlertCircle, MapPin } from "lucide-react";
import { NETWORK_TYPE_LABELS } from "@/lib/media-network-types";

export type AdminNetworkListRow = {
  id: string;
  name: string;
  type: string;
  totalLocations: number;
  regions: string[];
  pricePackage: number | null;
  isActive: boolean;
  _count: { locations: number };
};

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
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState(initialError);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/networks", { cache: "no-store" });
      if (!res.ok) {
        setError("load");
        return;
      }
      const data = (await res.json()) as { networks?: AdminNetworkListRow[] };
      if (Array.isArray(data.networks)) setRows(data.networks);
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

  const typeLabel = (code: string) =>
    NETWORK_TYPE_LABELS[code]?.[locale === "en" ? "en" : "ko"] ?? code;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" onClick={() => refresh()}>
            {locale === "en" ? "Refresh" : "새로고침"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/networks/quick-add">
              {locale === "en" ? "Quick add (JSON)" : "빠른 등록 (JSON)"}
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
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t("dbError")}
        </div>
      )}
      {error === "load" && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t("loadError")}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <Card
            key={row.id}
            className={`border-border/15 border-border/20 ${!row.isActive ? "opacity-70" : ""}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-semibold leading-snug">
                  {row.name}
                </CardTitle>
                {!row.isActive && (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {t("inactive")}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="outline" className="text-[10px] font-normal">
                  {typeLabel(row.type)}
                </Badge>
                <Badge className="border-2 border-border bg-foreground text-[10px] font-medium text-primary-foreground dark:bg-card dark:text-foreground">
                  {t("sites", { count: row.totalLocations })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-foreground/90">
              {row.regions.length > 0 && (
                <p className="line-clamp-2">{row.regions.join(" · ")}</p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {t("registeredPins", { count: row._count.locations })}
              </div>
              {row.pricePackage != null && (
                <p className="text-xs text-muted-foreground">
                  {t("pricePackage")}: {row.pricePackage.toLocaleString()}
                  {locale === "en" ? " (10K/mo)" : "만원/월"}
                </p>
              )}
              <div className="flex flex-wrap gap-2 border-t border-border/10 pt-3 border-border/15">
                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/media/network/${row.id}`} target="_blank">
                    {t("publicPreview")}
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/networks/${row.id}`}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    {t("manage")}
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={deletingId === row.id}
                  onClick={() => onDelete(row.id)}
                >
                  {deletingId === row.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  <span className="sr-only">{t("delete")}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rows.length === 0 && !error && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
            <p className="text-sm">{locale === "en" ? "No networks yet." : "등록된 네트워크가 없습니다."}</p>
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
