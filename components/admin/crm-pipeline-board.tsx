"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { SalesPipelineStage } from "@prisma/client";
import { PIPELINE_STAGE_LABEL } from "@/lib/crm-pipeline";

type PipelineCard = {
  id: string;
  userId: string | null;
  crmAccountId?: string | null;
  sourceType?: string;
  company: string;
  contactName: string;
  email: string;
  assignedTo: string | null;
  expectedAmountWon: number;
  daysSinceContact: number;
  tags: string[];
};

type Column = {
  stage: SalesPipelineStage;
  cards: PipelineCard[];
  totalAmount: number;
  count: number;
};

function formatKrw(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${Math.round(n / 10_000)}만`;
  return n.toLocaleString("ko-KR");
}

function PipelineCardView({
  card,
  locale,
  dragging,
}: {
  card: PipelineCard;
  locale: string;
  dragging?: boolean;
}) {
  const href = card.userId
    ? `/${locale}/admin/customers/${card.userId}`
    : `/${locale}/admin/crm-records`;

  return (
    <div
      className={cn(
        "border-2 border-border bg-card p-3 text-sm shadow-sm",
        dragging && "opacity-60 ring-2 ring-primary",
      )}
    >
      <p className="font-semibold leading-tight">{card.company}</p>
      <p className="text-muted-foreground text-xs">
        {card.contactName}
        {card.sourceType ? ` · ${card.sourceType}` : ""}
      </p>
      <p className="mt-2 text-xs">
        예상 {formatKrw(card.expectedAmountWon)}원
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <span>D+{card.daysSinceContact}</span>
        {card.assignedTo ? (
          <span className="truncate">· {card.assignedTo}</span>
        ) : null}
      </div>
      {card.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {card.tags.slice(0, 3).map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px]">
              {t}
            </Badge>
          ))}
        </div>
      ) : null}
      <Link
        href={href}
        className="mt-2 inline-block text-xs text-primary underline-offset-2 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        프로필
      </Link>
    </div>
  );
}

function DraggableCard({
  card,
  locale,
}: {
  card: PipelineCard;
  locale: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.id, data: { card } });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} className={cn("mb-2", isDragging && "opacity-40")}>
      <div className="flex gap-1">
        <button
          type="button"
          className="mt-1 shrink-0 touch-none text-muted-foreground"
          {...listeners}
          {...attributes}
          aria-label="드래그"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <PipelineCardView card={card} locale={locale} />
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({
  column,
  locale,
}: {
  column: Column;
  locale: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.stage });
  const label = PIPELINE_STAGE_LABEL[column.stage].ko;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[220px] max-w-[260px] shrink-0 flex-col border-2 border-border bg-muted/30",
        isOver && "ring-2 ring-primary",
      )}
    >
      <div className="border-b border-border bg-card px-3 py-2">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">
          {column.count}건 · 합계 {formatKrw(column.totalAmount)}원
        </p>
      </div>
      <div className="max-h-[calc(100vh-220px)] flex-1 overflow-y-auto p-2">
        {column.cards.map((c) => (
          <DraggableCard key={c.id} card={c} locale={locale} />
        ))}
      </div>
    </div>
  );
}

export function CrmPipelineBoard() {
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "ko";
  const [columns, setColumns] = useState<Column[]>([]);
  const [activeCard, setActiveCard] = useState<PipelineCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/crm/pipeline");
      const data = (await res.json()) as {
        columns?: Column[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "load failed");
      setColumns(data.columns ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onDragStart = (e: DragStartEvent) => {
    const card = e.active.data.current?.card as PipelineCard | undefined;
    setActiveCard(card ?? null);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveCard(null);
    const cardId = String(e.active.id);
    const overId = e.over?.id;
    if (!overId || overId === e.active.id) return;
    const newStage = String(overId) as SalesPipelineStage;

    setColumns((prev) => {
      const next = prev.map((col) => ({
        ...col,
        cards: [...col.cards],
      }));
      let moved: PipelineCard | undefined;
      for (const col of next) {
        const idx = col.cards.findIndex((c) => c.id === cardId);
        if (idx >= 0) {
          moved = col.cards.splice(idx, 1)[0];
          col.count = col.cards.length;
          col.totalAmount = col.cards.reduce(
            (s, c) => s + c.expectedAmountWon,
            0,
          );
        }
      }
      if (!moved) return prev;
      const target = next.find((c) => c.stage === newStage);
      if (target) {
        target.cards.unshift(moved);
        target.count = target.cards.length;
        target.totalAmount = target.cards.reduce(
          (s, c) => s + c.expectedAmountWon,
          0,
        );
      }
      return next;
    });

    try {
      await fetch(`/api/admin/crm/pipeline/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: newStage }),
      });
    } catch {
      load();
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">파이프라인 로딩…</p>;
  }
  if (err) {
    return <p className="text-sm text-destructive">{err}</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((col) => (
          <DroppableColumn key={col.stage} column={col} locale={locale} />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? (
          <PipelineCardView card={activeCard} locale={locale} dragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
