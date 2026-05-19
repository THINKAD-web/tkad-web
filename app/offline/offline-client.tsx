"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import {
  readOfflineRecentMediaCards,
  type OfflineRecentMediaCard,
} from "@/lib/recently-viewed-offline";
import { formatMediaPriceWonWithSymbol } from "@/lib/media-price-format";

export function OfflineClient() {
  const [items, setItems] = useState<OfflineRecentMediaCard[]>([]);

  useEffect(() => {
    setItems(readOfflineRecentMediaCards());
  }, []);

  return (
    <div className="tkad-landing-neon tkad-planner-neon relative min-h-screen overflow-hidden bg-[#020202] px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] text-white">
      <OfflineGlow />
      <div className="relative z-10 mx-auto max-w-lg">
        <header className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_32px_rgba(34,211,238,0.2)]">
            <WifiOff className="h-8 w-8 text-cyan-300" aria-hidden />
          </div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300">
            [ OFFLINE ]
          </p>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight">
            인터넷 연결을 확인해주세요
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            연결이 복구되면 최신 매체 정보를 다시 불러옵니다.
          </p>
        </header>

        <OfflineRetry />

        <section className="mt-10">
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
            마지막으로 본 매체
          </h2>
          {items.length === 0 ? (
            <p className="mt-4 text-sm text-white/50">
              저장된 매체가 없습니다. 온라인에서 매체 상세를 한 번 열어두면
              오프라인에서도 카드로 볼 수 있습니다.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {items.map((m) => (
                <OfflineMediaCard key={m.id} media={m} />
              ))}
            </ul>
          )}
        </section>

        <p className="mt-12 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
          THINKAD · 싱커드
        </p>
      </div>
    </div>
  );
}

function OfflineGlow() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-20%] top-[-10%] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-80 w-80 rounded-full bg-fuchsia-500/15 blur-3xl"
      />
    </>
  );
}

function OfflineRetry() {
  return (
    <div className="mt-8 flex justify-center">
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-full border border-cyan-400/40 bg-cyan-400/15 px-6 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400/25"
      >
        다시 시도
      </button>
    </div>
  );
}


function OfflineMediaCard({ media }: { media: OfflineRecentMediaCard }) {
  const src = media.imageUrl || "/media-placeholder/01.svg";
  return (
    <li>
      <Link
        href={`/ko/media/${media.id}`}
        className="group flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.06]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 오프라인 폴백 */}
        <img
          src={src}
          alt=""
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white group-hover:text-cyan-100">
            {media.name}
          </p>
          <p className="mt-1 text-xs text-white/55">
            {[media.location, media.type].filter(Boolean).join(" · ")}
            {media.price != null && media.price > 0
              ? ` · ${formatMediaPriceWonWithSymbol(media.price)}`
              : ""}
          </p>
        </div>
      </Link>
    </li>
  );
}
