"use client";

import { Button } from "@/components/ui/button";
import {
  briefCustomLineTotalWon,
  type BriefCustomLine,
} from "@/lib/planner/brief/custom-lines";
import { BriefCustomLineForm } from "@/components/planner/brief/brief-custom-line-form";

function UnmeasurableBadge({ isKo }: { isKo: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded border border-zinc-400/50 bg-zinc-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
      {isKo ? "[산정 불가]" : "N/A"}
    </span>
  );
}

export function BriefCustomLineCard({
  line,
  isKo,
  isEditing,
  onEdit,
  onRemove,
  onSaveEdit,
  onCancelEdit,
}: {
  line: BriefCustomLine;
  isKo: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onSaveEdit: (patch: {
    name: string;
    quantity: number;
    unitPriceWon: number;
    notes: string;
  }) => void;
  onCancelEdit: () => void;
}) {
  if (isEditing) {
    return (
      <li data-testid="brief-custom-line-row" data-editing="true">
        <BriefCustomLineForm
          isKo={isKo}
          mode="edit"
          initial={{
            name: line.name,
            quantity: line.quantity,
            unitPriceWon: line.unitPriceWon,
            notes: line.notes ?? "",
          }}
          onSubmit={onSaveEdit}
          onCancel={onCancelEdit}
        />
      </li>
    );
  }

  const totalWon = briefCustomLineTotalWon(line);

  return (
    <li
      className="rounded-xl border border-dashed border-violet-400/40 bg-violet-500/5 p-3"
      data-testid="brief-custom-line-row"
      data-editing="false"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-violet-600/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
              {isKo ? "커스텀" : "Custom"}
            </span>
            <UnmeasurableBadge isKo={isKo} />
          </div>
          <p className="truncate text-sm font-semibold">{line.name}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            ×{line.quantity} · ₩{line.unitPriceWon.toLocaleString()}
            {isKo ? "/단위" : " each"}
          </p>
          {line.notes ? (
            <p className="mt-1 text-[11px] text-muted-foreground">{line.notes}</p>
          ) : null}
          <p className="mt-1 text-[10px] text-muted-foreground">
            {isKo
              ? "노출·CPM·도달 집계에서 제외"
              : "Excluded from impressions, CPM, and reach"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-sm font-semibold tabular-nums">
            ₩{totalWon.toLocaleString()}
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={onEdit}
              data-testid="brief-custom-line-edit"
            >
              {isKo ? "수정" : "Edit"}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onRemove}
              data-testid="brief-custom-line-remove"
            >
              {isKo ? "삭제" : "Remove"}
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}
