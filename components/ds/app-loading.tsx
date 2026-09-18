"use client";

import { Loader2 } from "lucide-react";
import { NeonFullPageSpinner } from "@/components/ui/neon-page-spinner";
import { cn } from "@/lib/utils";

export type AppLoadingProps =
  | {
      mode: "inline";
      label?: string;
      className?: string;
    }
  | {
      mode: "section";
      label?: string;
      className?: string;
    }
  | {
      mode: "page";
      label?: string;
      className?: string;
      portal?: boolean;
    };

export function AppLoading(props: AppLoadingProps) {
  if (props.mode === "page") {
    return (
      <NeonFullPageSpinner
        label={props.label ?? "불러오는 중…"}
        className={props.className}
        portal={props.portal}
      />
    );
  }

  const label = props.label ?? "불러오는 중…";
  const isSection = props.mode === "section";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center text-gray-500 dark:text-white/55",
        isSection ? "py-12" : "py-2",
        props.className,
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      {label ? (
        <span className="sr-only">{label}</span>
      ) : null}
    </div>
  );
}
