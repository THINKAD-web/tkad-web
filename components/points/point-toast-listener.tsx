"use client";

import { useEffect } from "react";
import { useAppToast } from "@/lib/use-toast";
import { drainPointToasts, formatPointToast } from "@/lib/points-toast";

export function PointToastListener() {
  const toast = useAppToast();

  useEffect(() => {
    function flush() {
      for (const item of drainPointToasts()) {
        toast.success(formatPointToast(item));
      }
    }
    flush();
    window.addEventListener("tkad-point-toast", flush);
    return () => window.removeEventListener("tkad-point-toast", flush);
  }, [toast]);

  return null;
}
