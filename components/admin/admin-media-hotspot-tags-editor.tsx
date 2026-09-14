"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HOTSPOT_TYPES,
  JEJU_ZONES,
  type HotspotType,
  type MediaHotspotTag,
} from "@/lib/matching/region-hotspot";
import { Plus, Trash2 } from "lucide-react";

export type HotspotTagDraft = {
  zoneId: string;
  type: HotspotType;
  weight: number;
};

type Props = {
  tags: HotspotTagDraft[];
  onChange: (tags: HotspotTagDraft[]) => void;
};

const TYPE_LABEL: Record<HotspotType, string> = {
  residential: "주거·생활권",
  commercial: "상권·시내",
  airport: "공항",
  tourist: "관광",
  transit_corridor: "이동 동선",
};

function zoneLabel(zoneId: string): string {
  return JEJU_ZONES.find((z) => z.zoneId === zoneId)?.label ?? zoneId;
}

export function adminHotspotDraftsFromTags(
  tags: MediaHotspotTag[] | undefined,
): HotspotTagDraft[] {
  return (tags ?? []).map((t) => ({
    zoneId: t.zoneId ?? JEJU_ZONES[0]!.zoneId,
    type: t.type,
    weight: t.weight,
  }));
}

export function adminHotspotDraftsToTags(
  drafts: HotspotTagDraft[],
): MediaHotspotTag[] {
  return drafts.map((d) => ({
    regionId: "jeju",
    zoneId: d.zoneId,
    type: d.type,
    weight: Math.max(0.5, Math.min(2, d.weight || 1)),
  }));
}

export function AdminMediaHotspotTagsEditor({ tags, onChange }: Props) {
  const addTag = () => {
    const zone = JEJU_ZONES[0]!;
    onChange([
      ...tags,
      { zoneId: zone.zoneId, type: zone.types[0]!, weight: 1 },
    ]);
  };

  const update = (index: number, patch: Partial<HotspotTagDraft>) => {
    onChange(tags.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const remove = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="rounded-xl border border-border/80 bg-muted/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-foreground">생활권 태그</p>
          <p className="text-xs text-muted-foreground">
            제주 매체 전용 — zone × type 조합, weight 0.5~2.0
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addTag}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          태그 추가
        </Button>
      </div>

      {tags.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          태그 없음 — hotspot 스코어링 미적용 (기존과 동일)
        </p>
      ) : (
        <ul className="space-y-3">
          {tags.map((tag, index) => {
            const zone = JEJU_ZONES.find((z) => z.zoneId === tag.zoneId);
            const allowedTypes = zone?.types ?? HOTSPOT_TYPES;
            return (
              <li
                key={`${tag.zoneId}-${tag.type}-${index}`}
                className="grid gap-2 rounded-lg border border-border/60 bg-background p-3 sm:grid-cols-[1fr_1fr_120px_auto]"
              >
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                    Zone
                  </label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={tag.zoneId}
                    onChange={(e) => {
                      const nextZone = JEJU_ZONES.find(
                        (z) => z.zoneId === e.target.value,
                      );
                      update(index, {
                        zoneId: e.target.value,
                        type: nextZone?.types[0] ?? tag.type,
                      });
                    }}
                  >
                    {JEJU_ZONES.map((z) => (
                      <option key={z.zoneId} value={z.zoneId}>
                        {z.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                    Type
                  </label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={tag.type}
                    onChange={(e) =>
                      update(index, { type: e.target.value as HotspotType })
                    }
                  >
                    {allowedTypes.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                    Weight {tag.weight.toFixed(1)}
                  </label>
                  <Input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={tag.weight}
                    onChange={(e) =>
                      update(index, { weight: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => remove(index)}
                    aria-label={`${zoneLabel(tag.zoneId)} 태그 삭제`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
