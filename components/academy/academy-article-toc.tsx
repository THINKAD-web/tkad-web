"use client";

import type { AcademyTocItem } from "@/lib/academy-markdown";
import { cn } from "@/lib/utils";

type Props = {
  items: AcademyTocItem[];
  isKo: boolean;
};

export function AcademyArticleToc({ items, isKo }: Props) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label={isKo ? "목차" : "Table of contents"}
      className="border-2 border-black bg-card p-4 shadow-[4px_4px_0_0_rgb(0,0,0)]"
    >
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF6600]">
        [ {isKo ? "목차" : "Contents"} ]
      </p>
      <ol className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "block text-sm leading-snug text-foreground transition-colors hover:text-[#FF6600]",
                item.level === 3 && "pl-3 text-muted-foreground",
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
