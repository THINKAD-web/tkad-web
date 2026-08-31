"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BriefCustomLine } from "@/lib/planner/brief/custom-lines";

export type BriefCustomLineFormValues = {
  name: string;
  quantity: number;
  unitPriceWon: number;
  notes: string;
};

export function BriefCustomLineForm({
  isKo,
  mode,
  initial,
  onSubmit,
  onCancel,
}: {
  isKo: boolean;
  mode: "add" | "edit";
  initial?: Partial<BriefCustomLineFormValues>;
  onSubmit: (values: BriefCustomLineFormValues) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? 1));
  const [unitPriceWon, setUnitPriceWon] = useState(
    String(initial?.unitPriceWon ?? 0),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const qty = Math.floor(Number(quantity));
    const unit = Math.round(Number(unitPriceWon));
    if (!trimmedName) {
      setError(isKo ? "항목명을 입력하세요." : "Enter a name.");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setError(isKo ? "수량은 1 이상이어야 합니다." : "Quantity must be at least 1.");
      return;
    }
    if (!Number.isFinite(unit) || unit < 0) {
      setError(isKo ? "단가를 입력하세요." : "Enter a valid unit price.");
      return;
    }
    setError(null);
    onSubmit({
      name: trimmedName,
      quantity: qty,
      unitPriceWon: unit,
      notes: notes.trim(),
    });
  };

  return (
    <div
      className="rounded-xl border border-dashed border-violet-400/50 bg-violet-500/5 p-3"
      data-testid="brief-custom-line-form"
    >
      <p className="mb-2 text-xs font-semibold text-violet-800 dark:text-violet-300">
        {mode === "add"
          ? isKo
            ? "커스텀 항목 추가"
            : "Add custom line"
          : isKo
            ? "커스텀 항목 수정"
            : "Edit custom line"}
      </p>
      <div className="space-y-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isKo ? "항목명 (예: 특수 협의 매체)" : "Name"}
          data-testid="brief-custom-line-name"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={isKo ? "수량" : "Qty"}
            data-testid="brief-custom-line-quantity"
          />
          <Input
            type="number"
            min={0}
            step={1000}
            value={unitPriceWon}
            onChange={(e) => setUnitPriceWon(e.target.value)}
            placeholder={isKo ? "단가(원)" : "Unit price (₩)"}
            data-testid="brief-custom-line-unit-price"
          />
        </div>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={isKo ? "메모 (선택)" : "Notes (optional)"}
          data-testid="brief-custom-line-notes"
        />
      </div>
      {error ? (
        <p className="mt-2 text-[11px] text-destructive">{error}</p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          size="sm"
          className="flex-1"
          onClick={handleSubmit}
          data-testid="brief-custom-line-submit"
        >
          {mode === "add"
            ? isKo
              ? "추가"
              : "Add"
            : isKo
              ? "저장"
              : "Save"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          data-testid="brief-custom-line-cancel"
        >
          {isKo ? "취소" : "Cancel"}
        </Button>
      </div>
    </div>
  );
}
