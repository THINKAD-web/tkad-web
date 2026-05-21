import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  number: string;
  kicker?: string;
  title: ReactNode;
  meta?: string;
  className?: string;
};

export function NeonSectionHead({
  number,
  kicker,
  title,
  meta,
  className,
}: Props) {
  return (
    <header
      className={cn(
        "tkad-neon-section-head mb-6 sm:mb-8 md:mb-11 lg:mb-14",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="tkad-neon-border inline-flex max-w-full shrink-0 items-center whitespace-nowrap rounded-2xl bg-gray-50 px-4 py-2 font-mono text-[11px] font-black uppercase tracking-[0.22em] text-gray-700 backdrop-blur dark:bg-white/5 dark:text-white/78">
          <span className="tkad-home-accent-text">[{number}]</span>
          {kicker ? (
            <span className="text-gray-500 dark:text-white/55"> / {kicker}</span>
          ) : null}
        </span>
        {meta ? (
          <span className="min-w-0 max-w-full font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-gray-500 dark:text-white/55 sm:truncate">
            {"// "}
            {meta}
          </span>
        ) : null}
      </div>

      <h2 className="mt-4 text-balance text-[clamp(34px,3.8vw,56px)] font-black leading-[1.02] tracking-[-0.06em] text-foreground dark:text-white dark:[text-shadow:0_24px_120px_rgba(0,0,0,0.88)] sm:mt-5 md:mt-7">
        {title}
      </h2>
    </header>
  );
}
