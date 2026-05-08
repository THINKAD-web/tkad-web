import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  number: string;
  kicker?: string;
  title: ReactNode;
  meta?: string;
  className?: string;
};

export function NeonSectionHead({ number, kicker, title, meta, className }: Props) {
  return (
    <header className={cn("tkad-neon-section-head mb-12 sm:mb-14", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="tkad-neon-border rounded-2xl bg-white/5 px-4 py-2 font-mono text-[11px] font-black uppercase tracking-[0.22em] text-white/78 backdrop-blur">
          <span className="tkad-home-accent-text">
            [{number}]
          </span>
          {kicker ? <span className="text-white/55"> / {kicker}</span> : null}
        </span>
        {meta ? (
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
            {"// "}
            {meta}
          </span>
        ) : null}
      </div>

      <h2 className="mt-7 text-balance text-[clamp(34px,3.8vw,56px)] font-black leading-[1.02] tracking-[-0.06em] text-white [text-shadow:0_24px_120px_rgba(0,0,0,0.88)]">
        {title}
      </h2>
    </header>
  );
}

