"use client";

import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

const BASKET_DROP_ID = "basket-drop";

type Props = {
  catalog: MediaItem[];
  campaignMediaIds: string[];
  setCampaignMediaIds: Dispatch<SetStateAction<string[]>>;
  isKo: boolean;
  regionLabel: (region: string) => string;
};

function DraggableCatalogRow({
  m,
  isKo,
  regionLabel,
  inBasket,
  onAdd,
  t,
}: {
  m: MediaItem;
  isKo: boolean;
  regionLabel: (region: string) => string;
  inBasket: boolean;
  onAdd: () => void;
  t: ReturnType<typeof useTranslations<"planner">>;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `catalog-${m.id}`,
      data: { type: "catalog", mediaId: m.id },
    });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <li ref={setNodeRef} style={style} className={cn(isDragging && "opacity-40")}>
      <div
        className={cn(
          "flex cursor-grab items-start gap-2 rounded-xl border bg-white p-3 text-left transition active:cursor-grabbing",
          inBasket
            ? "border-gold/40 bg-gold/5"
            : "border-navy/10 hover:border-navy/25",
        )}
      >
        <button
          type="button"
          className="mt-0.5 touch-none text-muted-foreground"
          aria-label={t("dragHint")}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold text-navy">
            {isKo ? m.name : (m.nameEn || m.name) || m.name}
          </p>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {regionLabel(m.region)} ·{" "}
            {(isKo ? m.location : (m.locationEn || m.location) || m.location).slice(0, 48)}
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
          onClick={onAdd}
          disabled={inBasket}
          aria-label={t("addToCampaign")}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

function SortableBasketRow({
  m,
  isKo,
  regionLabel,
  onRemove,
  t,
}: {
  m: MediaItem;
  isKo: boolean;
  regionLabel: (region: string) => string;
  onRemove: () => void;
  t: ReturnType<typeof useTranslations<"planner">>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: m.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <div className="flex items-start gap-2 rounded-xl border border-navy/10 bg-white p-3 shadow-sm">
        <button
          type="button"
          className="mt-0.5 touch-none text-muted-foreground"
          aria-label={t("campaignReorderHint")}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold text-navy">
            {isKo ? m.name : (m.nameEn || m.name) || m.name}
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
          onClick={onRemove}
          aria-label={t("removeFromCampaign")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

export default function PlannerMediaSelector({
  catalog,
  campaignMediaIds,
  setCampaignMediaIds,
  isKo,
  regionLabel,
}: Props) {
  const t = useTranslations("planner");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

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
      const name = (isKo ? m.name : (m.nameEn || m.name) || m.name).toLowerCase();
      const loc = (isKo ? m.location : (m.locationEn || m.location) || m.location).toLowerCase();
      return name.includes(q) || loc.includes(q);
    });
  }, [catalog, query, isKo]);

  const addId = useCallback(
    (id: string) => {
      setCampaignMediaIds((prev) => {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      });
    },
    [setCampaignMediaIds],
  );

  const onDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  }, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over) return;

      const aid = String(active.id);
      const oid = String(over.id);

      if (aid.startsWith("catalog-")) {
        const mediaId = aid.replace("catalog-", "");
        setCampaignMediaIds((prev) => {
          if (prev.includes(mediaId)) return prev;
          if (oid === BASKET_DROP_ID) return [...prev, mediaId];
          if (prev.includes(oid)) {
            const idx = prev.indexOf(oid);
            const next = [...prev];
            next.splice(idx, 0, mediaId);
            return next;
          }
          return prev;
        });
        return;
      }

      setCampaignMediaIds((prev) => {
        if (!prev.includes(aid) || !prev.includes(oid) || aid === oid)
          return prev;
        const oldIndex = prev.indexOf(aid);
        const newIndex = prev.indexOf(oid);
        if (oldIndex < 0 || newIndex < 0) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    },
    [setCampaignMediaIds],
  );

  const onDragCancel = useCallback((_e: DragCancelEvent) => {
    setActiveId(null);
  }, []);

  const removeId = useCallback(
    (id: string) => {
      setCampaignMediaIds((prev) => prev.filter((x) => x !== id));
    },
    [setCampaignMediaIds],
  );

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: BASKET_DROP_ID,
  });

  const dragPreview = useMemo(() => {
    if (!activeId?.startsWith("catalog-")) return null;
    const id = activeId.replace("catalog-", "");
    return byId.get(id) ?? null;
  }, [activeId, byId]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
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
                listFiltered.map((m) => (
                  <DraggableCatalogRow
                    key={m.id}
                    m={m}
                    isKo={isKo}
                    regionLabel={regionLabel}
                    inBasket={campaignMediaIds.includes(m.id)}
                    onAdd={() => addId(m.id)}
                    t={t}
                  />
                ))
              )}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("dragHint")}</p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "border-navy/10 shadow-lg transition-colors",
            isOver && "border-gold/50 bg-gold/5 ring-1 ring-gold/30",
          )}
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
              ref={setDropRef}
              className={cn(
                "min-h-[min(52vh,28rem)] rounded-2xl border-2 border-dashed p-3 transition-colors",
                isOver
                  ? "border-gold/60 bg-gold/5"
                  : "border-navy/15 bg-slate-50/50",
              )}
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
                <SortableContext
                  items={campaignMediaIds}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-2" role="list">
                    {basketItems.map((m) => (
                      <SortableBasketRow
                        key={m.id}
                        m={m}
                        isKo={isKo}
                        regionLabel={regionLabel}
                        onRemove={() => removeId(m.id)}
                        t={t}
                      />
                    ))}
                  </ul>
                </SortableContext>
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {t("campaignReorderHint")}
            </p>
          </CardContent>
        </Card>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragPreview ? (
          <div className="max-w-sm rounded-xl border border-gold/40 bg-white p-3 shadow-xl">
            <p className="line-clamp-2 text-sm font-semibold text-navy">
              {isKo ? dragPreview.name : (dragPreview.nameEn || dragPreview.name) || dragPreview.name}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
