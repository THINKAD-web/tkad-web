"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { buildPublicNavGroups } from "@/lib/navigation/build-public-nav";

export function usePublicNavGroups() {
  const t = useTranslations();
  return useMemo(() => buildPublicNavGroups(t), [t]);
}
