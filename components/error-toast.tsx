"use client";

import { AlertTriangle, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorToastProps = {
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
};

export default function ErrorToast({
  message = "일시적 오류가 발생했습니다. 다시 시도해 주세요.",
  onRetry,
  onDismiss,
}: ErrorToastProps) {
  return (
    <div className="animate-fade-in-up rounded-xl border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800">{message}</p>
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              다시 시도
            </Button>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-full p-1 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
