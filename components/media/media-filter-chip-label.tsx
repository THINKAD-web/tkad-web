import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  icon?: LucideIcon;
};

export function MediaFilterChipLabel({ label, icon: Icon }: Props) {
  if (!Icon) return <>{label}</>;

  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
      {label}
    </span>
  );
}
