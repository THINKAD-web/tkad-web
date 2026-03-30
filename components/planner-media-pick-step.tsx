"use client";

import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useTranslations } from "next-intl";
import { GripVertical, Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/media-data";

const MIME = "application/x-tkad-planner-media";

type DragPayload =
  | { kind: "catalog"; id: string }
  | { kind: "basket"; index: number };

function readPayload(e: React.DragEvent): DragPayload | null {
  try {
    const raw = e.dataTransfer.getData(MIME);
    if (!raw) return null;
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

type Props = {
  catalog: MediaItem[];
  campaignMediaIds: string[];
  setCampaignMediaIds: Dispatch<SetStateAction<string[]>>;
  isKo: boolean;
  regionLabel: (region: string) => string;
};

export default function PlannerMediaPickStep({
  catalog,
  campaignMediaIds,
  setCampaignMediaIds,
  isKo,
  regionLabel,
}: Props) {
  const t = useTranslations("planner");
  const [query, setQuery] = useState("");
  const [dragOver, setDragOver] = useState<"zone" | number | null>(null);

  const byId = useMemo(
    () => new Map(catalog.map((m) => [m.id, m])),
    [catalog],
  );

  const basketItems = useMemo(
    () =>
      campaignMediaIds
        .map((id) => byId.get(id))
        .filter((m): m is MediaItem => m != null),
    [campaignMediaIds, byId],
  );

  const basketMonthlyTotal = useMemo(
    () => basketItems.reduce((s, m) => s + (m.price || 0), 0),
    [basketItems],
  );

  const listFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((m) => {
      const name = (isKo ? m.name : m.nameEn || m.name).toLowerCase();
      const loc = (isKo ? m.location : m.locationEn || m.location).toLowerCase();
      return name.includes(q) || loc.includes(q);
    });
  }, [catalog, query, isKo]);

  const addId = useCallback(
    (id: string, atIndex?: number) => {
      setCampaignMediaIds((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev];
        if (atIndex != null && atIndex >= 0 && atIndex <= next.length) {
          next.splice(atIndex, 0, id);
        } else {
          next.push(id);
        }
        return next;
      });
    },
    [setCampaignMediaIds],
  );

  const removeAt = useCallback(
    (index: number) => {
      setCampaignMediaIds((prev) => {
        const next = [...prev];
        next.splice(index, 1);
        return next;
      });
    },
    [setCampaignMediaIds],
  );

  const moveTo = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      setCampaignMediaIds((prev) => {
        const next = [...prev];
        const [x] = next.splice(from, 1);
        next.splice(to, 0, x);
        return next;
      });
    },
    [setCampaignMediaIds],
  );

  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const p = readPayload(e);
    if (!p) return;
    if (p.kind === "catalog") addId(p.id);
    if (p.kind === "basket") {
      setCampaignMediaIds((prev) => {
        const from = p.index;
        const to = Math.max(0, prev.length - 1);
        if (from === to) return prev;
        const next = [...prev];
        const [x] = next.splice(from, 1);
        next.splice(to, 0, x);
        return next;
      });
    }
  };

  const handleDropAt = (targetIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    const p = readPayload(e);
    if (!p) return;
    if (p.kind === "catalog") {
      setCampaignMediaIds((prev) => {
        const id = p.id;
        const existing = prev.indexOf(id);
        if (existing === -1) {
          const next = [...prev];
          next.splice(
            Math.min(targetIndex, next.length),
            0,
            id,
          );
          return next;
        }
        if (existing === targetIndex) return prev;
        const next = [...prev];
        next.splice(existing, 1);
        const adjusted =
          existing < targetIndex ? targetIndex - 1 : targetIndex;
        next.splice(Math.min(adjusted, next.length), 0, id);
        return next;
      });
    } else {
      moveTo(p.index, targetIndex);
    }
  };

  const startCatalogDrag = (id: string) => (e: React.DragEvent) => {
    e.dataTransfer.setData(MIME, JSON.stringify({ kind: "catalog", id }));
    e.dataTransfer.effectAllowed = "copyMove";
  };

  const startBasketDrag = (index: number) => (e: React.DragEvent) => {
    e.dataTransfer.setData(MIME, JSON.stringify({ kind: "basket", index }));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,24rem)]">
      <Card className="border-navy/10 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-navy">{t("mediaListTitle")}</CardTitle>
          <CardDescription>{t("mediaListDesc")}</CardDescription>
          <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("mediaSearchPlaceholder")}
              className="h-10 border-navy/15 pl-9"
              aria-label={t("mediaSearchPlaceholder")}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ul
            className="max-h-[min(52vh,28rem)] space-y-1.5 overflow-y-auto pr-1"
            role="list"
          >
            {listFiltered.length === 0 ? (
              <li className="rounded-lg border border-dashed border-navy/15 py-10 text-center text-sm text-muted-foreground">
                {t("mediaListEmpty")}
              </li>
            ) : (
              listFiltered.map((m) => {
                const inBasket = campaignMediaIds.includes(m.id);
                return (
                  <li key={m.id}>
                    <div
                      draggable
                      onDragStart={startCatalogDrag(m.id)}
                      className={cn(
                        "flex cursor-grab items-start gap-2 rounded-xl border bg-white p-3 text-left transition active:cursor-grabbing",
                        inBasket
                          ? "border-gold/40 bg-gold/5"
                          : "border-navy/10 hover:border-navy/25",
                      )}
                    >
                      <GripVertical
                        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold text-navy">
                          {isKo ? m.name : m.nameEn || m.name}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {regionLabel(m.region)} ·{" "}
                          {(isKo ? m.location : m.locationEn || m.location).slice(
                            0,
                            48,
                          )}
                        </p>
                        <p className="mt-1 text-xs font-medium text-gold-dark">
                          ₩{m.price.toLocaleString()}
                          <span className="text-navy/60">
                            {isKo ? " 만/월" : " ₩10K/mo"}
                          </span>
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={inBasket ? "outline" : "default"}
                        className={cn(
                          "shrink-0 touch-manipulation",
                          !inBasket && "btn-gold border-0",
                        )}
                        onClick={() => !inBasket && addId(m.id)}
                        disabled={inBasket}
                        aria-label={t("addToCampaign")}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">{t("dragHint")}</p>
        </CardContent>
      </Card>

      <Card
        className={cn(
          "border-navy/10 shadow-lg transition-colors",
          dragOver === "zone" && "border-gold/50 bg-gold/5 ring-1 ring-gold/30",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragEnter={() => setDragOver("zone")}
        onDragLeave={() => setDragOver(null)}
        onDrop={handleDropZone}
      >
        <CardHeader>
          <CardTitle className="flex items-start justify-between gap-3 text-navy">
            <span>{t("campaignPanelTitle")}</span>
            <span className="text-right text-sm font-extrabold text-gold-dark">
              {t("campaignMonthlyTotalLabel")}
              <span className="ml-2">
                ₩{basketMonthlyTotal.toLocaleString()}
                <span className="ml-1 text-xs font-semibold text-navy/60">
                  {isKo ? "만/월" : " ₩10K/mo"}
                </span>
              </span>
            </span>
          </CardTitle>
          <CardDescription>{t("campaignPanelDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "min-h-[min(52vh,28rem)] rounded-2xl border-2 border-dashed p-3 transition-colors",
              dragOver === "zone"
                ? "border-gold/60 bg-gold/5"
                : "border-navy/15 bg-slate-50/50",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {basketItems.length === 0 ? (
              <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 px-4 text-center">
                <p className="text-sm font-medium text-navy">
                  {t("emptyCampaign")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("dropHint")}
                </p>
              </div>
            ) : (
              <ul className="space-y-2" role="list">
                {basketItems.map((m, index) => (
                  <li key={`${m.id}-${index}`}>
                    <div
                      draggable
                      onDragStart={startBasketDrag(index)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setDragOver(index);
                      }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={handleDropAt(index)}
                      className={cn(
                        "flex items-start gap-2 rounded-xl border bg-white p-3 shadow-sm transition",
                        dragOver === index
                          ? "border-gold ring-1 ring-gold/40"
                          : "border-navy/10",
                      )}
                    >
                      <GripVertical
                        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold text-navy">
                          {isKo ? m.name : m.nameEn || m.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {regionLabel(m.region)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAt(index)}
                        aria-label={t("removeFromCampaign")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("campaignReorderHint")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
