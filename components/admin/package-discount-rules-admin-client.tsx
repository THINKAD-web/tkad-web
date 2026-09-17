"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChevronDown, ChevronUp, Loader2, Plus, Sparkles } from "lucide-react";
import type { PackageDiscountRuleAdminRow } from "@/lib/package-discount-rule-map";

type DryRunResult = {
  mediaCount: number;
  linesSubtotalWon: number;
  matchedRule: { id: string; labelKo: string; discountPercent: number } | null;
  packageDiscountWon: number;
};

const emptyForm = () => ({
  labelKo: "",
  labelEn: "",
  discountPercent: "10",
  priority: "",
  minMediaCount: "",
  maxMediaCount: "",
  minSupplyWon: "",
  maxSupplyWon: "",
  validFrom: "",
  validTo: "",
  active: true,
});

function formatWon(n: number) {
  return `₩${n.toLocaleString("ko-KR")}`;
}

function rangeLabel(r: PackageDiscountRuleAdminRow): string {
  const parts: string[] = [];
  if (r.minMediaCount != null || r.maxMediaCount != null) {
    parts.push(
      `매체 ${r.minMediaCount ?? "·"}~${r.maxMediaCount ?? "·"}개`,
    );
  }
  if (r.minSupplyWon != null || r.maxSupplyWon != null) {
    parts.push(
      `소계 ${r.minSupplyWon != null ? formatWon(r.minSupplyWon) : "·"}~${r.maxSupplyWon != null ? formatWon(r.maxSupplyWon) : "·"}`,
    );
  }
  return parts.length ? parts.join(" · ") : "제한 없음";
}

export function PackageDiscountRulesAdminClient() {
  const [list, setList] = useState<PackageDiscountRuleAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [dryLineWons, setDryLineWons] = useState("5000000,5000000");
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
  const [dryLoading, setDryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/package-discount-rules");
      const data = (await res.json()) as { rules?: PackageDiscountRuleAdminRow[] };
      setList(data.rules ?? []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm());
    setSheetOpen(true);
  };

  const openEdit = (r: PackageDiscountRuleAdminRow) => {
    setEditId(r.id);
    setForm({
      labelKo: r.labelKo,
      labelEn: r.labelEn ?? "",
      discountPercent: String(r.discountPercent),
      priority: String(r.priority),
      minMediaCount: r.minMediaCount != null ? String(r.minMediaCount) : "",
      maxMediaCount: r.maxMediaCount != null ? String(r.maxMediaCount) : "",
      minSupplyWon: r.minSupplyWon != null ? String(r.minSupplyWon) : "",
      maxSupplyWon: r.maxSupplyWon != null ? String(r.maxSupplyWon) : "",
      validFrom: r.validFrom ? r.validFrom.slice(0, 10) : "",
      validTo: r.validTo ? r.validTo.slice(0, 10) : "",
      active: r.active,
    });
    setSheetOpen(true);
  };

  const payloadFromForm = () => ({
    labelKo: form.labelKo.trim(),
    labelEn: form.labelEn.trim() || null,
    discountPercent: parseFloat(form.discountPercent) || 0,
    priority: form.priority.trim() ? parseInt(form.priority, 10) : undefined,
    minMediaCount: form.minMediaCount.trim() || null,
    maxMediaCount: form.maxMediaCount.trim() || null,
    minSupplyWon: form.minSupplyWon.trim() || null,
    maxSupplyWon: form.maxSupplyWon.trim() || null,
    validFrom: form.validFrom.trim() || null,
    validTo: form.validTo.trim() || null,
    active: form.active,
  });

  const save = async () => {
    if (!form.labelKo.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await fetch(`/api/admin/package-discount-rules/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadFromForm()),
        });
      } else {
        await fetch("/api/admin/package-discount-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadFromForm()),
        });
      }
      setSheetOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const moveRow = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= list.length) return;
    const ordered = [...list];
    const [item] = ordered.splice(index, 1);
    ordered.splice(next, 0, item!);
    setList(ordered);
    await fetch("/api/admin/package-discount-rules/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((r) => r.id) }),
    });
    await load();
  };

  const runDry = async () => {
    setDryLoading(true);
    try {
      const lineSupplyWons = dryLineWons
        .split(/[,，\s]+/)
        .map((s) => Math.max(0, parseInt(s.replace(/[^\d]/g, ""), 10) || 0))
        .filter((n) => n > 0);
      const res = await fetch("/api/admin/package-discount-rules/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineSupplyWons, activeOnly: true }),
      });
      const data = (await res.json()) as { result?: DryRunResult };
      setDryRun(data.result ?? null);
    } catch {
      setDryRun(null);
    } finally {
      setDryLoading(false);
    }
  };

  const sortedHint = useMemo(
    () => "우선순위 숫자가 작을수록 먼저 매칭됩니다.",
    [],
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight">
            패키지 할인 규칙
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{sortedHint}</p>
        </div>
        <Button type="button" onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          규칙 추가
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">규칙 목록</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              불러오는 중…
            </div>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 규칙이 없습니다.</p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-2">순서</th>
                  <th className="py-2 pr-2">우선순위</th>
                  <th className="py-2 pr-2">활성</th>
                  <th className="py-2 pr-2">라벨</th>
                  <th className="py-2 pr-2">할인</th>
                  <th className="py-2 pr-2">구간</th>
                  <th className="py-2">편집</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r, i) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="py-2 pr-2">
                      <div className="flex gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={i === 0}
                          onClick={() => moveRow(i, -1)}
                          aria-label="위로"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={i === list.length - 1}
                          onClick={() => moveRow(i, 1)}
                          aria-label="아래로"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                    <td className="py-2 pr-2 tabular-nums">{r.priority}</td>
                    <td className="py-2 pr-2">{r.active ? "Y" : "N"}</td>
                    <td className="py-2 pr-2 font-medium">{r.labelKo}</td>
                    <td className="py-2 pr-2 tabular-nums">{r.discountPercent}%</td>
                    <td className="py-2 pr-2 text-xs text-muted-foreground">
                      {rangeLabel(r)}
                    </td>
                    <td className="py-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(r)}
                      >
                        편집
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            매칭 미리보기 (활성 규칙만)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-md"
              value={dryLineWons}
              onChange={(e) => setDryLineWons(e.target.value)}
              placeholder="라인 공급가(원), 쉼표 구분"
            />
            <Button type="button" variant="secondary" onClick={runDry} disabled={dryLoading}>
              {dryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "실행"}
            </Button>
          </div>
          {dryRun ? (
            <p className="text-sm">
              매체 {dryRun.mediaCount}개 · 소계 {formatWon(dryRun.linesSubtotalWon)}
              {dryRun.matchedRule ? (
                <>
                  {" "}
                  →{" "}
                  <strong>
                    {dryRun.matchedRule.labelKo} ({dryRun.matchedRule.discountPercent}
                    %, −{formatWon(dryRun.packageDiscountWon)})
                  </strong>
                </>
              ) : (
                " → 매칭 규칙 없음"
              )}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editId ? "규칙 수정" : "규칙 추가"}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            <label className="block text-xs font-medium">라벨 (KO) *</label>
            <Input
              value={form.labelKo}
              onChange={(e) => setForm((f) => ({ ...f, labelKo: e.target.value }))}
            />
            <label className="block text-xs font-medium">라벨 (EN)</label>
            <Input
              value={form.labelEn}
              onChange={(e) => setForm((f) => ({ ...f, labelEn: e.target.value }))}
            />
            <label className="block text-xs font-medium">할인율 (%)</label>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.discountPercent}
              onChange={(e) =>
                setForm((f) => ({ ...f, discountPercent: e.target.value }))
              }
            />
            <label className="block text-xs font-medium">우선순위 (비우면 자동)</label>
            <Input
              type="number"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium">최소 매체 수</label>
                <Input
                  value={form.minMediaCount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minMediaCount: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium">최대 매체 수</label>
                <Input
                  value={form.maxMediaCount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxMediaCount: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium">최소 소계(원)</label>
                <Input
                  value={form.minSupplyWon}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minSupplyWon: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium">최대 소계(원)</label>
                <Input
                  value={form.maxSupplyWon}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxSupplyWon: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium">validFrom</label>
                <Input
                  type="date"
                  value={form.validFrom}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, validFrom: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium">validTo</label>
                <Input
                  type="date"
                  value={form.validTo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, validTo: e.target.value }))
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
              />
              활성
            </label>
            <Button type="button" className="w-full" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
