"use client";

import { useMemo } from "react";
import { useToast as useBaseToast } from "@/components/toast-provider";

type Variant = "success" | "error" | "warning";

type ToastInput =
  | string
  | {
      title?: string;
      description?: string;
      variant?: Variant;
    };

function format(input: ToastInput): { type: Variant; message: string } {
  if (typeof input === "string") return { type: "success", message: input };
  const { title, description, variant = "success" } = input;
  const message = [title, description].filter(Boolean).join(" — ");
  return { type: variant, message: message || "알림" };
}

export function useAppToast() {
  const { toast } = useBaseToast();
  return useMemo(
    () => ({
      show: (input: ToastInput) => {
        const { type, message } = format(input);
        toast(type, message);
      },
      success: (msg: string) => toast("success", msg),
      error: (msg: string) => toast("error", msg),
      warning: (msg: string) => toast("warning", msg),
    }),
    [toast],
  );
}
