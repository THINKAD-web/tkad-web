import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
};

export function NeonSection({ children, className, innerClassName }: Props) {
  return (
    <section
      className={cn(
        "tkad-neon-surface relative overflow-hidden bg-[#05050a] py-40 text-white sm:py-48",
        className,
      )}
    >
      <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
      <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid" />
      <div aria-hidden className="absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay" />
      <div className={cn("relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", innerClassName)}>
        {children}
      </div>
    </section>
  );
}

