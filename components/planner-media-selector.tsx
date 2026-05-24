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
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/media-data";
import {
  formatCatalogPriceFieldWon,
  formatCatalogPricesSumWon,
} from "@/lib/media-price-format";
import {
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";

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
          "flex cursor-grab items-start gap-2 rounded-xl border p-3 text-left transition-colors active:cursor-grabbing",
          inBasket
            ? "border-violet-400/50 dark:bg-violet-500/10 bg-violet-50"
            : "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white hover:border-violet-300/40",
        )}
      >
        <button
          type="button"
          className="mt-0.5 touch-none text-muted-foreground hover:text-foreground"
          aria-label={t("dragHint")}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-foreground">
            {isKo ? m.name : (m.nameEn || m.name) || m.name}
          </p>
          <p className="mt-1 line-clamp-1 font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {`// `}{regionLabel(m.region)} ·{" "}
            {(isKo ? m.location : (m.locationEn || m.location) || m.location).slice(0, 48)}
          </p>
          <p className="mt-1 font-display text-xs font-bold tabular-nums text-foreground">
            {formatCatalogPriceFieldWon(m.price, isKo ? "ko" : "en")}
            <span className="ml-1 text-[10px] font-normal uppercase tracking-[0.18em] text-muted-foreground">
              /{isKo ? "월" : "mo"}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={inBasket}
          aria-label={t("addToCampaign")}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-opacity disabled:opacity-50",
            inBasket
              ? "bg-gradient-to-r from-violet-500 to-cyan-400 text-white"
              : "bg-gradient-to-r from-violet-500 to-cyan-400 text-white hover:opacity-90",
          )}
        >
          <Plus className="h-4 w-4" />
        </button>
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
      <div className="flex items-start gap-2 rounded-xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white p-3">
        <button
          type="button"
          className="mt-0.5 touch-none text-muted-foreground hover:text-foreground"
          aria-label={t("campaignReorderHint")}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-foreground">
            {isKo ? m.name : (m.nameEn || m.name) || m.name}
          </p>
          <p className="mt-1 font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {`// `}{regionLabel(m.region)}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("removeFromCampaign")}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border dark:border-white/10 border-gray-200 text-foreground transition-colors hover:border-pink-400/50 hover:bg-pink-500/10 hover:text-pink-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
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

  const onDragCancel = useCallback(() => {
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
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,24rem)]">
        <div className={cn(plannerNeon.card, "overflow-hidden")}>
          <div className={plannerNeon.cardHeader}>
            <PlannerNeonLabel>Media List</PlannerNeonLabel>
            <h3 className={cn("mt-2 text-lg", plannerNeon.headline)}>
              {t("mediaListTitle")}
            </h3>
            <p className={cn("mt-1", plannerNeon.subtext)}>{t("mediaListDesc")}</p>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("mediaSearchPlaceholder")}
                aria-label={t("mediaSearchPlaceholder")}
                className={cn(
                  "h-10 w-full rounded-xl border pl-9 pr-3 text-sm",
                  "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white",
                  "dark:text-white text-gray-900 placeholder:dark:text-white/40 placeholder:text-gray-400",
                  "focus:border-violet-400/60 focus:outline-none",
                )}
              />
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <ul
              className="max-h-[min(52vh,28rem)] space-y-2 overflow-y-auto pr-1"
              role="list"
            >
              {listFiltered.length === 0 ? (
                <li
                  className={cn(
                    "rounded-xl border py-10 text-center text-sm",
                    "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50",
                    plannerNeon.subtext,
                  )}
                >
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
            <p className={cn("mt-3 text-xs", plannerNeon.subtext)}>{t("dragHint")}</p>
          </div>
        </div>

        <div
          className={cn(
            plannerNeon.card,
            "transition-colors lg:mt-0",
            isOver && "border-violet-400/50 dark:bg-violet-500/10",
          )}
        >
          <div className={plannerNeon.cardHeader}>
            <PlannerNeonLabel>Campaign Basket</PlannerNeonLabel>
            <div className="mt-2 flex items-start justify-between gap-3">
              <h3 className={cn("text-lg", plannerNeon.headline)}>
                {t("campaignPanelTitle")}
              </h3>
              <span className="text-right">
                <span className={cn("block text-xs", plannerNeon.kpiLabel)}>
                  {t("campaignMonthlyTotalLabel")}
                </span>
                <span className={cn("block text-base tabular-nums", plannerNeon.kpiValue)}>
                  {formatCatalogPricesSumWon(
                    basketItems.map((item) => item.price || 0),
                    isKo ? "ko" : "en",
                  )}
                  <span className={cn("ml-1 text-[10px] font-normal", plannerNeon.kpiLabel)}>
                    /{isKo ? "월" : "mo"}
                  </span>
                </span>
              </span>
            </div>
            <p className={cn("mt-1", plannerNeon.subtext)}>{t("campaignPanelDesc")}</p>
          </div>
          <div className="p-4 sm:p-5">
            <div
              ref={setDropRef}
              className={cn(
                "min-h-[min(52vh,28rem)] rounded-xl border p-3 transition-colors",
                isOver
                  ? "border-violet-400/50 dark:bg-violet-500/10 bg-violet-50"
                  : "dark:border-white/10 border-gray-200 dark:bg-white/[0.02] bg-gray-50",
              )}
            >
              {basketItems.length === 0 ? (
                <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 px-4 text-center">
                  <PlannerNeonLabel>Empty</PlannerNeonLabel>
                  <p className={cn("text-sm font-bold", plannerNeon.headline)}>
                    {t("emptyCampaign")}
                  </p>
                  <p className={cn("text-xs", plannerNeon.subtext)}>{t("dropHint")}</p>
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
            <p className="mt-3 font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {`// `}{t("campaignReorderHint")}
            </p>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragPreview ? (
          <div className="max-w-sm border-2 border-primary bg-card p-3">
            <p className="line-clamp-2 text-sm font-bold tracking-tight text-foreground">
              {isKo ? dragPreview.name : (dragPreview.nameEn || dragPreview.name) || dragPreview.name}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
