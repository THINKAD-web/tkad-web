import { cn } from "@/lib/utils";

const sizeClass = {
  xs: "text-[10px] leading-tight",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
} as const;

const iconSize = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
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
        "flex h-full min-h-0 w-full flex-col items-center justify-center bg-gradient-to-br from-navy/[0.08] via-slate-100 to-gold/[0.08] px-2 text-center",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={cn("mb-2 text-navy/20", iconSize[size])}
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
      <span
        className={cn(
          "font-medium tracking-tight text-navy/40",
          sizeClass[size],
        )}
      >
        {label}
      </span>
    </div>
  );
}
