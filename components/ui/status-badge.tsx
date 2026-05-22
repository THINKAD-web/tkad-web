import { cn } from "@/lib/utils";
import { ui } from "@/lib/ui-classes";

const VARIANT_CLASS = {
  beta: ui.badgeBeta,
  new: ui.badgeNew,
  active: ui.badgeActive,
  pending: ui.badgePending,
  error: ui.badgeError,
} as const;

export type StatusBadgeVariant = keyof typeof VARIANT_CLASS;

type Props = {
  variant: StatusBadgeVariant;
  children: React.ReactNode;
  className?: string;
};

export function StatusBadge({ variant, children, className }: Props) {
  return (
    <span className={cn("inline-flex items-center font-medium", VARIANT_CLASS[variant], className)}>
      {children}
    </span>
  );
}
