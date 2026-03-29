"use client";

import { Link } from "@/i18n/navigation";
import type { AiChatbotMediaCard } from "@/lib/ai-chatbot-tools";
import { typeLabels } from "@/lib/media-data";

export function AiChatbotMediaCards({
  items,
  isKo,
}: {
  items: AiChatbotMediaCard[];
  isKo: boolean;
}) {
  if (!items.length) return null;
  return (
    <div className="mt-2 flex w-full max-w-[min(100%,22rem)] gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((m) => (
        <Link
          key={m.id}
          href={`/media/${m.id}`}
          className="min-w-[9.75rem] max-w-[11rem] shrink-0 rounded-xl border border-navy/10 bg-slate-50/90 px-3 py-2 text-left shadow-sm transition hover:border-gold/45 hover:bg-white"
        >
          <p className="line-clamp-2 text-xs font-semibold leading-snug text-navy">
            {isKo ? m.name : m.nameEn}
          </p>
          <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">
            {m.location}
          </p>
          <p className="mt-1 text-[11px] font-bold tabular-nums text-gold">
            ₩{m.price.toLocaleString()}
            {isKo ? "만/월" : "M/mo"}
          </p>
          <p className="text-[10px] text-navy/55">
            {isKo ? typeLabels[m.type]?.ko : typeLabels[m.type]?.en}
          </p>
        </Link>
      ))}
    </div>
  );
}
