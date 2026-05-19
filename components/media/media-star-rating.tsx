"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
};

const sizeClass = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function MediaStarRating({
  value,
  max = 5,
  size = "md",
  showValue = false,
  className,
}: Props) {
  const rounded = Math.round(value * 10) / 10;
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      aria-label={`${rounded} out of ${max} stars`}
    >
      <span className="inline-flex">
        {Array.from({ length: max }, (_, i) => {
          const filled = value >= i + 1;
          const half = !filled && value > i && value < i + 1;
          return (
            <Star
              key={i}
              className={cn(
                sizeClass[size],
                filled || half
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/35",
              )}
            />
          );
        })}
      </span>
      {showValue ? (
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {rounded.toFixed(1)}
        </span>
      ) : null}
    </span>
  );
}

type InputProps = {
  value: number;
  onChange: (value: number) => void;
  size?: "md" | "lg";
  className?: string;
};

export function MediaStarRatingInput({
  value,
  onChange,
  size = "lg",
  className,
}: InputProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Rating"
      className={cn("inline-flex gap-1", className)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Star
            className={cn(
              size === "lg" ? "h-8 w-8" : "h-6 w-6",
              n <= value
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}
