"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import {
  Filter,
  Image as ImageIcon,
  Film,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { CreativeCard } from "@/components/creatives/creative-card";
import { cn } from "@/lib/utils";
import type { CreativeListItem } from "@/lib/creatives/types";

export function CreativeLibraryClient() {
  const router = useRouter();
  const [items, setItems] = useState<CreativeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">("all");
  const [usedFilter, setUsedFilter] = useState<"all" | "used" | "unused">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("type", typeFilter);
    params.set("used", usedFilter);
    if (search.trim()) params.set("q", search.trim());
    fetch(`/api/my/creatives?${params.toString()}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (cancelled) return;
        if (r.status === 401) {
          router.replace("/login?redirect=/creatives");
          return;
        }
        if (!d?.ok) {
          setError(d?.error?.message ?? "라이브러리를 불러오지 못했습니다.");
          return;
        }
        setItems(d.data.items as CreativeListItem[]);
      })
      .catch(() => {
        if (!cancelled) setError("네트워크 오류가 발생했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [typeFilter, usedFilter, search, router]);

  const stats = useMemo(() => {
    const total = items.length;
    const images = items.filter((i) => i.type === "image").length;
    const videos = items.filter((i) => i.type === "video").length;
    const used = items.filter((i) => i.usageCount > 0).length;
    return { total, images, videos, used };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* 통계 헤더 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat label="전체" value={stats.total} />
        <Stat label="이미지" value={stats.images} icon={ImageIcon} />
        <Stat label="영상" value={stats.videos} icon={Film} />
        <Stat label="사용 중" value={stats.used} accent />
      </div>

      {/* 필터 행 */}
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
        <div className="flex flex-1 items-center gap-2 rounded-md border-2 border-border bg-card px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름·파일명·태그 검색"
            className="h-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground"
              aria-label="검색 지우기"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <FilterPill
          icon={Filter}
          label="유형"
          options={[
            { value: "all", label: "전체" },
            { value: "image", label: "이미지" },
            { value: "video", label: "영상" },
          ]}
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as typeof typeFilter)}
        />
        <FilterPill
          label="사용"
          options={[
            { value: "all", label: "전체" },
            { value: "used", label: "사용 중" },
            { value: "unused", label: "미사용" },
          ]}
          value={usedFilter}
          onChange={(v) => setUsedFilter(v as typeof usedFilter)}
        />
        <BtnBlock
          href="/creatives/upload"
          variant="accent"
          size="md"
          className="shrink-0"
        >
          <Plus className="h-4 w-4" /> 업로드
        </BtnBlock>
      </div>

      {/* 그리드 */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-xl border-2 border-destructive bg-destructive/10 p-6 text-sm text-destructive">
          {error}
        </div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <CreativeCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Film className="h-7 w-7" />
      </div>
      <div>
        <p className="text-base font-bold text-foreground">
          아직 업로드한 소재가 없습니다
        </p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          이미지(JPG/PNG/GIF) 또는 영상(MP4/MOV) 을 업로드하면 즉시예약·플레이리스트 등에서 재사용할 수 있어요.
        </p>
      </div>
      <BtnBlock href="/creatives/upload" variant="accent" size="md">
        <Plus className="h-4 w-4" /> 첫 소재 업로드
      </BtnBlock>
      <Link
        href="/creatives/guide"
        className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
      >
        규격 가이드 보기 →
      </Link>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 px-3 py-3 sm:px-4 sm:py-4",
        accent
          ? "border-accent bg-accent/10"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("font-display text-xs font-medium uppercase tracking-[0.22em]", accent ? "text-accent" : "text-muted-foreground")}>
          {label}
        </span>
        {Icon ? <Icon className={cn("h-3.5 w-3.5", accent ? "text-accent" : "text-muted-foreground")} /> : null}
      </div>
      <p className={cn("mt-1.5 text-2xl font-black tabular-nums tracking-tight", accent ? "text-accent" : "text-foreground")}>
        {value}
      </p>
    </div>
  );
}

function FilterPill({
  icon: Icon,
  label,
  options,
  value,
  onChange,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="inline-flex h-10 items-center gap-1.5 rounded-md border-2 border-border bg-card px-2 font-display text-xs font-medium uppercase tracking-[0.16em] text-foreground">
      {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground" /> : null}
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-l-2 border-border bg-transparent px-1 pl-2 outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
