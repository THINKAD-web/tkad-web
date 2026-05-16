"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Loader2, Plus } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { CreativeCard } from "@/components/creatives/creative-card";
import type { CreativeListItem } from "@/lib/creatives/types";

/**
 * 즉시예약·플레이리스트 편집기 등에서 사용하는 라이브러리 인라인 픽커.
 * 그리드로 펼쳐서 클릭 1번에 단일 선택. 비로그인/빈 라이브러리일 때 친절한 안내.
 */
export function CreativeLibraryPicker({
  selectedId,
  onSelect,
  typeFilter,
  /** 비로그인 시 안내 메시지를 보여줄지(true) 또는 빈 그리드로 표시할지(false). 기본 true */
  showLoginHint = true,
}: {
  selectedId: string | null;
  onSelect: (item: CreativeListItem) => void;
  typeFilter?: "all" | "image" | "video";
  showLoginHint?: boolean;
}) {
  const [items, setItems] = useState<CreativeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("type", typeFilter ?? "all");
    fetch(`/api/my/creatives?${params.toString()}`, { cache: "no-store" })
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 401) {
          setNeedsLogin(true);
          return;
        }
        const d = await r.json();
        if (d?.ok) setItems(d.data.items as CreativeListItem[]);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [typeFilter]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (needsLogin && showLoginHint) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        로그인하면 업로드한 소재를 바로 불러올 수 있어요.
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          업로드한 소재가 없습니다. 먼저 라이브러리에 소재를 추가해주세요.
        </p>
        <BtnBlock href="/creatives/upload" variant="accent" size="sm">
          <Plus className="h-4 w-4" /> 소재 업로드
        </BtnBlock>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="grid max-h-[28rem] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <CreativeCard
            key={item.id}
            item={item}
            selectable
            selected={selectedId === item.id}
            onToggle={() => onSelect(item)}
            hrefOverride="#"
          />
        ))}
      </div>
      <Link
        href="/creatives"
        className="block text-right font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
      >
        라이브러리 전체 보기 →
      </Link>
    </div>
  );
}
