"use client";

import { useTranslations } from "next-intl";
import { MapPinned } from "lucide-react";

const SECTION_KEYS = [
  "metro",
  "gyeonggi",
  "gangwon",
  "chungbuk",
  "chungnam",
  "jeonbuk",
  "jeonnam",
  "gyeongbuk",
  "gyeongnam",
  "jeju",
] as const;

export default function MediaRegionReference() {
  const t = useTranslations("media.regionReference");

  return (
    <details className="group rounded-lg border border-navy/10 bg-slate-50/90 text-left shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 tkad-type-title text-navy transition-colors hover:bg-slate-100/80 [&::-webkit-details-marker]:hidden">
        <MapPinned className="h-3.5 w-3.5 shrink-0 text-gold-dark" aria-hidden />
        <span className="flex-1">{t("toggle")}</span>
        <span className="tkad-type-note font-normal text-muted-foreground group-open:hidden">
          {t("expandHint")}
        </span>
        <span className="hidden tkad-type-note font-normal text-muted-foreground group-open:inline">
          {t("collapseHint")}
        </span>
      </summary>
      <div className="space-y-3 border-t border-navy/8 px-3 pb-3 pt-2">
        <p className="tkad-type-note leading-relaxed text-muted-foreground">
          {t("intro")}
        </p>
        <div className="max-h-[min(55vh,22rem)] space-y-2.5 overflow-y-auto pr-1 tkad-type-note leading-relaxed">
          {SECTION_KEYS.map((key) => (
            <div key={key}>
              <h4 className="font-semibold text-navy">{t(`sections.${key}.title`)}</h4>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                {t(`sections.${key}.body`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
