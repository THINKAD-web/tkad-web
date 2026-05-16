"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { useToast } from "@/components/toast-provider";
import { CreativeLibraryPicker } from "@/components/creatives/library-picker";
import { cn } from "@/lib/utils";
import {
  DAY_LABELS_KO,
  type CreativeListItem,
  type PlaylistDetail,
  type PlaylistSchedule,
  type PlaylistScheduleRule,
} from "@/lib/creatives/types";

type EditorItem = {
  /** local id for keying; matches server id if persisted */
  key: string;
  creativeId: string;
  durationSec: number;
  creative: PlaylistDetail["items"][0]["creative"];
};

export function PlaylistEditor({ initial }: { initial?: PlaylistDetail }) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [items, setItems] = useState<EditorItem[]>(() =>
    initial
      ? initial.items.map((it) => ({
          key: it.id,
          creativeId: it.creativeId,
          durationSec: it.durationSec,
          creative: it.creative,
        }))
      : [],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rules, setRules] = useState<PlaylistScheduleRule[]>(
    initial?.schedule?.rules ?? [],
  );
  const [saving, setSaving] = useState(false);

  const totalDuration = useMemo(
    () => items.reduce((sum, it) => sum + it.durationSec, 0),
    [items],
  );

  const addCreative = (c: CreativeListItem) => {
    if (items.some((it) => it.creativeId === c.id)) {
      toast("warning", "이미 추가된 소재입니다.");
      return;
    }
    setItems((cur) => [
      ...cur,
      {
        key: `local-${Date.now()}-${cur.length}`,
        creativeId: c.id,
        durationSec: c.type === "video" && c.duration ? Math.min(60, Math.max(5, c.duration)) : 15,
        creative: {
          id: c.id,
          name: c.name,
          type: c.type,
          url: c.url,
          thumbnailUrl: c.thumbnailUrl,
          duration: c.duration,
        },
      },
    ]);
    setPickerOpen(false);
  };

  const move = (idx: number, dir: -1 | 1) => {
    setItems((cur) => {
      const next = cur.slice();
      const target = idx + dir;
      if (target < 0 || target >= next.length) return cur;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const removeItem = (key: string) =>
    setItems((cur) => cur.filter((it) => it.key !== key));

  const setItemDuration = (key: string, sec: number) =>
    setItems((cur) =>
      cur.map((it) => (it.key === key ? { ...it, durationSec: Math.max(1, Math.min(3600, sec)) } : it)),
    );

  const addRule = () => {
    if (items.length === 0) {
      toast("warning", "스케줄 규칙을 만들려면 먼저 소재를 추가해주세요.");
      return;
    }
    setRules((cur) => [
      ...cur,
      {
        id: `rule-${Date.now()}-${cur.length}`,
        creativeId: items[0].creativeId,
        days: [1, 2, 3, 4, 5],
        startTime: "09:00",
        endTime: "18:00",
      },
    ]);
  };

  const updateRule = (id: string, patch: Partial<PlaylistScheduleRule>) =>
    setRules((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRule = (id: string) =>
    setRules((cur) => cur.filter((r) => r.id !== id));

  const handleSave = async () => {
    if (!name.trim()) {
      toast("warning", "플레이리스트 이름을 입력해주세요.");
      return;
    }
    if (items.length === 0) {
      toast("warning", "최소 1개 이상의 소재가 필요합니다.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        items: items.map((it) => ({
          creativeId: it.creativeId,
          durationSec: it.durationSec,
        })),
        schedule:
          rules.length > 0 ? ({ rules } satisfies PlaylistSchedule) : null,
      };
      const url = initial
        ? `/api/my/playlists/${initial.id}`
        : "/api/my/playlists";
      const method = initial ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok || !d?.ok) {
        toast("error", d?.error?.message ?? "저장에 실패했습니다.");
        return;
      }
      toast("success", initial ? "플레이리스트를 저장했습니다." : "플레이리스트를 만들었습니다.");
      if (!initial) {
        router.push(`/creatives/playlists/${d.data.id}`);
      } else {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initial) return;
    if (!confirm("이 플레이리스트를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/my/playlists/${initial.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast("success", "삭제했습니다.");
      router.push("/creatives/playlists");
    } else {
      toast("error", "삭제에 실패했습니다.");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr,1fr]">
      <div className="space-y-5">
        {/* 헤더 입력 */}
        <div className="space-y-3 rounded-2xl border-2 border-border bg-card p-4 sm:p-5">
          <div>
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              [ 이름 ]
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 평일 매장 모니터 (오전/오후)"
              maxLength={100}
              className="h-11 w-full rounded-md border-2 border-border bg-card px-3 font-mono text-sm font-bold text-foreground focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              [ 설명 ]
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="이 플레이리스트의 노출 의도 메모"
              className="w-full resize-y rounded-md border-2 border-border bg-card px-3 py-2 font-mono text-sm text-foreground focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {/* 소재 아이템 */}
        <div className="rounded-2xl border-2 border-border bg-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                [ 소재 ({items.length}) ]
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                총 길이 {totalDuration}초
              </p>
            </div>
            <BtnBlock
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPickerOpen((v) => !v)}
            >
              <Plus className="h-4 w-4" /> 소재 추가
            </BtnBlock>
          </div>

          {pickerOpen ? (
            <div className="mb-3 rounded-xl border-2 border-dashed border-accent bg-accent/5 p-3">
              <CreativeLibraryPicker
                selectedId={null}
                onSelect={(c) => addCreative(c)}
              />
            </div>
          ) : null}

          {items.length === 0 ? (
            <p className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              아직 소재가 없습니다. 위의 “소재 추가” 버튼으로 시작하세요.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((it, idx) => (
                <li
                  key={it.key}
                  className="flex items-center gap-3 rounded-lg border-2 border-border bg-muted/30 p-2 sm:p-3"
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-[10px] font-black text-accent-foreground">
                    {idx + 1}
                  </span>
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                    {it.creative.thumbnailUrl || it.creative.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.creative.thumbnailUrl ?? it.creative.url}
                        alt={it.creative.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-bold text-foreground">
                      {it.creative.name}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {it.creative.type}
                    </p>
                  </div>
                  <label className="inline-flex h-8 items-center gap-1 rounded-md border-2 border-border bg-card px-2 font-mono text-[11px] text-foreground">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <input
                      type="number"
                      value={it.durationSec}
                      onChange={(e) =>
                        setItemDuration(it.key, parseInt(e.target.value, 10) || 1)
                      }
                      min={1}
                      max={3600}
                      className="w-12 bg-transparent text-right tabular-nums outline-none"
                    />
                    초
                  </label>
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="위로"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(idx, 1)}
                      disabled={idx === items.length - 1}
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="아래로"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(it.key)}
                    className="rounded-md border-2 border-border bg-card p-1.5 text-muted-foreground hover:border-destructive hover:text-destructive"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 스케줄 규칙 */}
        <div className="rounded-2xl border-2 border-border bg-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              [ DOOH 스케줄 규칙 (선택) ]
            </p>
            <BtnBlock type="button" variant="secondary" size="sm" onClick={addRule}>
              <Plus className="h-4 w-4" /> 규칙 추가
            </BtnBlock>
          </div>
          {rules.length === 0 ? (
            <p className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
              규칙을 추가하지 않으면 소재 순서대로 반복 재생됩니다. <br />
              요일·시간대별로 다른 소재를 노출하려면 규칙을 추가하세요.
            </p>
          ) : (
            <ul className="space-y-3">
              {rules.map((r) => (
                <RuleRow
                  key={r.id}
                  rule={r}
                  items={items}
                  onChange={(patch) => updateRule(r.id, patch)}
                  onRemove={() => removeRule(r.id)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <BtnBlock variant="accent" size="md" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {initial ? "변경 저장" : "플레이리스트 만들기"}
          </BtnBlock>
          {initial ? (
            <BtnBlock variant="secondary" size="md" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" /> 삭제
            </BtnBlock>
          ) : null}
        </div>
      </div>

      {/* 사이드 — 요약 */}
      <aside className="space-y-3">
        <div className="rounded-2xl border-2 border-accent bg-accent/10 p-4 sm:p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            [ 요약 ]
          </p>
          <dl className="mt-3 space-y-2 font-mono text-[12px] text-foreground/85">
            <Row label="소재 수" value={`${items.length} 개`} />
            <Row label="총 길이" value={`${totalDuration} 초`} />
            <Row label="규칙 수" value={`${rules.length} 개`} />
          </dl>
          <p className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
            <CheckCircle2 className="h-3 w-3" />
            {initial ? "변경 사항이 곧 반영됩니다" : "저장 후 즉시 사용 가능"}
          </p>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 p-4 sm:p-5 text-sm text-muted-foreground">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            [ 도움말 ]
          </p>
          <ul className="mt-2 space-y-1.5 leading-relaxed">
            <li>· 즉시예약에서 플레이리스트를 통째로 전송하면 매체사에 단일 소재 대신 묶음이 전달됩니다.</li>
            <li>· 규칙이 여러 개일 때는 위에서부터 매치되는 첫 규칙이 우선합니다.</li>
            <li>· 규칙에서 시간을 비우면 종일 적용입니다.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function RuleRow({
  rule,
  items,
  onChange,
  onRemove,
}: {
  rule: PlaylistScheduleRule;
  items: EditorItem[];
  onChange: (patch: Partial<PlaylistScheduleRule>) => void;
  onRemove: () => void;
}) {
  return (
    <li className="space-y-2 rounded-lg border-2 border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-accent" />
        <select
          value={rule.creativeId}
          onChange={(e) => onChange({ creativeId: e.target.value })}
          className="h-9 flex-1 rounded-md border-2 border-border bg-card px-2 font-mono text-[12px] font-bold text-foreground focus:border-accent focus:outline-none"
        >
          {items.map((it, idx) => (
            <option key={it.creativeId} value={it.creativeId}>
              {idx + 1}. {it.creative.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md border-2 border-border bg-card p-1.5 text-muted-foreground hover:border-destructive hover:text-destructive"
          aria-label="규칙 삭제"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {DAY_LABELS_KO.map((label, dayIdx) => {
          const isOn = rule.days.includes(dayIdx);
          return (
            <button
              key={dayIdx}
              type="button"
              onClick={() => {
                if (isOn) {
                  onChange({ days: rule.days.filter((d) => d !== dayIdx) });
                } else {
                  onChange({ days: [...rule.days, dayIdx].sort() });
                }
              }}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-full border-2 font-mono text-[11px] font-bold transition-colors",
                isOn
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-accent/50",
              )}
            >
              {label}
            </button>
          );
        })}
        <span className="ml-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <input
            type="time"
            value={rule.startTime ?? ""}
            onChange={(e) => onChange({ startTime: e.target.value || undefined })}
            className="h-7 rounded-md border-2 border-border bg-card px-1.5 font-mono text-[11px] text-foreground focus:border-accent focus:outline-none"
          />
          <span>~</span>
          <input
            type="time"
            value={rule.endTime ?? ""}
            onChange={(e) => onChange({ endTime: e.target.value || undefined })}
            className="h-7 rounded-md border-2 border-border bg-card px-1.5 font-mono text-[11px] text-foreground focus:border-accent focus:outline-none"
          />
        </span>
      </div>
    </li>
  );
}
