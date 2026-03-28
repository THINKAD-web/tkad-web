"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-navy">일시적 오류가 발생했습니다</h2>
        <p className="mt-3 text-muted-foreground">
          서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <Button
          onClick={reset}
          className="mt-8 bg-gold text-navy hover:bg-gold-dark font-semibold rounded-full px-8"
          size="lg"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          다시 시도
        </Button>
      </div>
    </div>
  );
}
