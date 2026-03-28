"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Link } from "@/i18n/navigation";

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
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gold/10">
          <AlertTriangle className="h-10 w-10 text-gold" />
        </div>
        <h1 className="text-6xl font-extrabold text-gold">500</h1>
        <h2 className="mt-4 text-2xl font-bold text-navy">
          일시적 오류가 발생했습니다
        </h2>
        <p className="mt-3 text-muted-foreground">
          서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={reset}
            className="bg-gold text-navy hover:bg-gold-dark font-semibold rounded-full px-8"
            size="lg"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            다시 시도
          </Button>
          <Link href="/">
            <Button
              variant="outline"
              className="border-navy/20 text-navy rounded-full px-8 font-semibold hover:bg-navy hover:text-white"
              size="lg"
            >
              <Home className="mr-2 h-4 w-4" />
              홈으로
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
