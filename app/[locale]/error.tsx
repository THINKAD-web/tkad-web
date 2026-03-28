"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("error");

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gold/10">
          <AlertTriangle className="h-10 w-10 text-gold" />
        </div>
        <h1 className="text-6xl font-extrabold text-gold">500</h1>
        <h2 className="mt-4 text-2xl font-bold text-navy">{t("title")}</h2>
        <p className="mt-3 text-muted-foreground">{t("description")}</p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={reset}
            className="bg-gold text-navy hover:bg-gold-dark font-semibold rounded-full px-8"
            size="lg"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("retry")}
          </Button>
          <Link href="/">
            <Button
              variant="outline"
              className="border-navy/20 text-navy rounded-full px-8 font-semibold hover:bg-navy hover:text-white"
              size="lg"
            >
              <Home className="mr-2 h-4 w-4" />
              {t("home")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
