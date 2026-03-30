import { cn } from "@/lib/utils";

const sizeClass = {
  xs: "text-[10px] leading-tight",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
} as const;

export function MediaImagePlaceholder({
  label,
  className,
  size = "md",
}: {
  label: string;
  className?: string;
  size?: keyof typeof sizeClass;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-navy/[0.06] to-amber-50/35 px-2 text-center",
        className,
      )}
    >
      <span
        className={cn(
          "font-medium tracking-tight text-navy/50",
          sizeClass[size],
        )}
      >
        {label}
      </span>
    </div>
  );
}
