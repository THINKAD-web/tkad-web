"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Clock, ListMusic, Loader2, Plus } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import type { PlaylistListItem } from "@/lib/creatives/types";

export function PlaylistListClient() {
  const router = useRouter();
  const [items, setItems] = useState<PlaylistListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetch("/api/my/playlists", { cache: "no-store" });
      if (cancelled) return;
      if (r.status === 401) {
        router.replace("/login?redirect=/creatives/playlists");
        return;
      }
      const d = await r.json();
      if (d?.ok) setItems(d.data.items as PlaylistListItem[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
          <ListMusic className="h-7 w-7" />
        </div>
        <div>
          <p className="text-base font-bold text-foreground">
            아직 플레이리스트가 없습니다
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            여러 소재를 묶어서 DOOH 매체에 시간대별로 다른 광고를 송출할 수 있어요.
          </p>
        </div>
        <BtnBlock href="/creatives/playlists/new" variant="accent" size="md">
          <Plus className="h-4 w-4" /> 첫 플레이리스트 만들기
        </BtnBlock>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <BtnBlock href="/creatives/playlists/new" variant="accent" size="md">
          <Plus className="h-4 w-4" /> 새 플레이리스트
        </BtnBlock>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <Link
            key={p.id}
            href={`/creatives/playlists/${p.id}`}
            className="group block rounded-2xl border-2 border-border bg-card p-4 transition-ui hover:-translate-y-0.5 hover:shadow-[0_18px_60px_rgba(15,23,42,0.10)] sm:p-5"
          >
            <div className="mb-2 inline-flex items-center gap-1 rounded-md border-2 border-accent bg-accent/10 px-2 py-0.5 tkad-type-label text-accent">
              <ListMusic className="h-3 w-3" /> 플레이리스트
            </div>
            <p className="line-clamp-2 text-base font-bold leading-snug text-foreground">
              {p.name}
            </p>
            {p.description ? (
              <p className="mt-1 line-clamp-2 tkad-type-body text-muted-foreground">
                {p.description}
              </p>
            ) : null}
            <div className="mt-3 flex items-center gap-3 tkad-type-label text-muted-foreground">
              <span>{p.itemCount} 개 소재</span>
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-3 w-3" /> {Math.max(1, Math.round(p.totalDurationSec / 60))} 분
              </span>
              <span className="ml-auto">
                {new Date(p.updatedAt).toLocaleDateString("ko-KR")}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
