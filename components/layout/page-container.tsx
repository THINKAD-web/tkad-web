import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  pageContainerClass,
  type PageContainerVariant,
} from "@/lib/layout/container-classes";

type Props = {
  children: ReactNode;
  /** @default "wide" — max-w-7xl centered */
  variant?: PageContainerVariant;
  className?: string;
  as?: ElementType;
};

/**
 * Standard page content width + horizontal padding.
 * `wide` delegates to `.ui-container` for backward-compatible styling.
 */
export function PageContainer({
  children,
  variant = "wide",
  className,
  as: Tag = "div",
}: Props) {
  return (
    <Tag className={cn(pageContainerClass[variant], className)}>{children}</Tag>
  );
}
