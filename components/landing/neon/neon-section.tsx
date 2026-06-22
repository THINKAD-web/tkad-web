import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/layout/page-container";

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
        "tkad-neon-surface ui-section-y relative overflow-hidden border-t border-gray-100 bg-white text-gray-900 even:bg-gray-50 dark:border-white/5 dark:bg-[#05050a] dark:text-white dark:even:bg-[#05050a]",
        className,
      )}
    >
      <div aria-hidden className="absolute inset-0 hidden dark:block tkad-neon-depth" />
      <div aria-hidden className="absolute inset-0 hidden opacity-20 dark:block tkad-neon-grid" />
      <div
        aria-hidden
        className="absolute inset-0 hidden tkad-hero-noise opacity-[0.07] mix-blend-overlay dark:block"
      />
      <PageContainer className={cn("relative", innerClassName)}>
        {children}
      </PageContainer>
    </section>
  );
}
