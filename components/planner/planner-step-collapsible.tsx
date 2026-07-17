"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { plannerNeon } from "@/components/planner/planner-neon-ui";

type Props = {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
};

export function PlannerStepCollapsible({
  title,
  summary,
  defaultOpen = false,
  children,
  className,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        plannerNeon.card,
        "overflow-hidden dark:bg-white/[0.03] bg-gray-50/80",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 p-4 text-left touch-manipulation sm:p-5"
      >
        <div className="min-w-0">
          <p className={cn("text-sm font-bold", plannerNeon.headline)}>{title}</p>
          {summary ? (
            <p className={cn("mt-1 text-xs leading-relaxed", plannerNeon.subtext)}>
              {summary}
            </p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-[color:var(--qp-accent)] transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? <div className="border-t dark:border-white/10 border-gray-200">{children}</div> : null}
    </div>
  );
}
