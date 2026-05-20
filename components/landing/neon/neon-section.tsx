import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  id?: string;
};

export function NeonSection({ children, className, innerClassName, id }: Props) {
  return (
    <section
      id={id}
      className={cn(
        "tkad-neon-surface relative overflow-hidden bg-[#05050a] py-12 text-white sm:py-16 md:py-24 lg:py-32 xl:py-40 2xl:py-48",
        className,
      )}
    >
      <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
      <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid" />
      <div
        aria-hidden
        className="absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay"
      />
      <div
        className={cn(
          "relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
          innerClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
