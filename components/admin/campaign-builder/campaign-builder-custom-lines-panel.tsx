"use client";

import { useState } from "react";
import type {
  CampaignBuilderPayload,
  CustomExecutionLine,
} from "@/lib/admin-campaign-builder/schemas";
import {
  parseCustomLineFromText,
  validateCustomLineDraft,
  type CustomLineDraft,
} from "@/lib/admin-campaign-builder/parse-custom-line";
import { PriceDisplay } from "@/components/admin/campaign-builder/price-display";
import { Button } from "@/components/ui/button";

type Props = {
  isKo: boolean;
  payload: CampaignBuilderPayload;
  onChange: (next: CampaignBuilderPayload) => void;
};

const emptyDraft = (): CustomLineDraft => ({});

export function CampaignBuilderCustomLinesPanel({
  isKo,
  payload,
  onChange,
}: Props) {
  const [draft, setDraft] = useState<CustomLineDraft>(emptyDraft);
  const [briefText, setBriefText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  function applyBrief() {
    const parsed = parseCustomLineFromText(briefText);
    setDraft((prev) => ({ ...prev, ...parsed }));
    setErrors([]);
  }

  function addLine() {
    const validation = validateCustomLineDraft(draft);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors([]);
    const line: CustomExecutionLine = {
      id: crypto.randomUUID(),
      mediaName: draft.mediaName!.trim(),
      targeting: draft.targeting?.trim() || undefined,
      startDate: draft.startDate?.trim(),
      endDate: draft.endDate?.trim(),
      budgetWon: draft.budgetWon!,
      actualReach: draft.actualReach ?? null,
      actualClicks: draft.actualClicks ?? null,
      notes: draft.notes?.trim() || undefined,
    };
    onChange({
      ...payload,
      customLines: [...payload.customLines, line],
    });
    setDraft(emptyDraft());
    setBriefText("");
  }

  function removeLine(id: string) {
    onChange({
      ...payload,
      customLines: payload.customLines.filter((l) => l.id !== id),
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4">
      <h2 className="font-bold">
        {isKo ? "커스텀 집행 라인" : "Custom execution lines"}
      </h2>

      <div className="space-y-2 rounded-lg border border-dashed border-border/60 p-3">
        <label className="text-sm font-medium">
          {isKo ? "브리프에서 채우기 (선택)" : "Fill from brief (optional)"}
        </label>
        <textarea
          value={briefText}
          onChange={(e) => setBriefText(e.target.value)}
          rows={2}
          placeholder={
            isKo
              ? "예: 네이버 GFA — 3월 1일~3월 31일, 500만원 (20대 여성)"
              : "Paste a one-line brief…"
          }
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <Button type="button" size="sm" variant="secondary" onClick={applyBrief}>
          {isKo ? "폼에 반영" : "Apply to form"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          {isKo ? "매체명" : "Media name"} *
          <input
            value={draft.mediaName ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, mediaName: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          {isKo ? "타게팅" : "Targeting"}
          <input
            value={draft.targeting ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, targeting: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          {isKo ? "시작일" : "Start date"} *
          <input
            type="date"
            value={draft.startDate ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          {isKo ? "종료일" : "End date"} *
          <input
            type="date"
            value={draft.endDate ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          {isKo ? "집행 예산 (원)" : "Budget (KRW)"} *
          <input
            type="number"
            min={0}
            step={100_000}
            value={draft.budgetWon ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                budgetWon: Number(e.target.value) || undefined,
              }))
            }
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          {isKo ? "실측 도달" : "Actual reach"}
          <input
            type="number"
            min={0}
            value={draft.actualReach ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                actualReach: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          {isKo ? "실측 클릭" : "Actual clicks"}
          <input
            type="number"
            min={0}
            value={draft.actualClicks ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                actualClicks: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          {isKo ? "메모" : "Notes"}
          <input
            value={draft.notes ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>

      {errors.length > 0 ? (
        <ul className="text-sm text-destructive">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      ) : null}

      <Button type="button" onClick={addLine}>
        {isKo ? "라인 추가" : "Add line"}
      </Button>

      {payload.customLines.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-2">{isKo ? "매체" : "Media"}</th>
              <th className="py-2 pr-2">{isKo ? "기간" : "Period"}</th>
              <th className="py-2 pr-2">{isKo ? "예산" : "Budget"}</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {payload.customLines.map((line) => (
              <tr key={line.id} className="border-b border-border/40">
                <td className="py-2 pr-2">{line.mediaName}</td>
                <td className="py-2 pr-2">
                  {line.startDate} ~ {line.endDate}
                </td>
                <td className="py-2 pr-2">
                  <PriceDisplay won={line.budgetWon} />
                </td>
                <td className="py-2 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeLine(line.id)}
                  >
                    {isKo ? "삭제" : "Remove"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
