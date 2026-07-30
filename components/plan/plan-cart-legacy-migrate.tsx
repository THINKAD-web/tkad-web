"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useIsPro } from "@/hooks/use-is-pro";
import { planCartMaxItems } from "@/lib/plan-cart-limits";
import { migrateLegacyCartToPlanCart } from "@/lib/plan-cart-legacy-migrate";
import { useAppToast } from "@/lib/use-toast";

/** One-shot legacy quote cart → plan cart migration on first client load. */
export function PlanCartLegacyMigrate() {
  const { isPro, loading } = useIsPro();
  const toast = useAppToast();
  const t = useTranslations("planNav");
  const startedRef = useRef(false);

  useEffect(() => {
    if (loading || startedRef.current) return;
    startedRef.current = true;

    void migrateLegacyCartToPlanCart(planCartMaxItems(isPro)).then((result) => {
      if (result.status !== "done") return;

      if (result.skippedMax > 0) {
        toast.warning(
          t("legacyMigratePartial", {
            migrated: result.migrated,
            skipped: result.skippedMax,
            max: planCartMaxItems(false),
          }),
        );
        return;
      }

      if (result.migrated > 0) {
        toast.success(t("legacyMigrateSuccess", { count: result.migrated }));
      }
    });
  }, [isPro, loading, t, toast]);

  return null;
}
