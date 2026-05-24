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
        <span className="ui-section-label tkad-neon-border inline-flex max-w-full shrink-0 items-center whitespace-nowrap rounded-xl bg-gray-50 px-3 py-1.5 font-semibold backdrop-blur dark:bg-white/5">
          <span className="tkad-home-accent-text">[{number}]</span>
          {kicker ? (
            <span className="text-gray-500 dark:text-white/55"> / {kicker}</span>
          ) : null}
        </span>
        {meta ? (
          <span className="min-w-0 max-w-full font-display text-xs font-medium uppercase tracking-[0.22em] text-gray-500 dark:text-white/55 sm:truncate">
            {"// "}
            {meta}
          </span>
        ) : null}
      </div>

      <h2 className="ui-section-headline mt-4 text-balance sm:mt-5 md:mt-7 dark:[text-shadow:0_24px_120px_rgba(0,0,0,0.88)]">
        {title}
      </h2>
    </header>
  );
}
