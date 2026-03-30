"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { MediaItem } from "@/lib/media-data";

const MediaBrowseMap = dynamic(() => import("@/components/media-browse-map"), {
  ssr: false,
});

type Props = {
  locale: string;
  items: readonly MediaItem[];
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  /** TOP 3 등 강조용 */
  pinMetaById?: Record<
    string,
    { tone?: "blue" | "green"; nowBadge?: boolean; popular?: boolean }
  >;
  className?: string;
  fixedMapHeightPx?: number;
};

export default function MediaAiRecommendMap({
  locale,
  items,
  selectedId,
  onSelectId,
  pinMetaById,
  className,
  fixedMapHeightPx = 380,
}: Props) {
  const tr = useTranslations("recommend");

  return (
    <div className="overflow-hidden rounded-2xl border border-gold/20 bg-navy/30 shadow-inner">
      <p className="border-b border-gold/15 bg-navy/50 px-4 py-2 text-center text-[11px] text-slate-400">
        {tr("resultMapHint")}
      </p>
      <MediaBrowseMap
        items={[...items]}
        locale={locale}
        selectedId={selectedId}
        onSelectId={onSelectId}
        className={className}
        fixedMapHeightPx={fixedMapHeightPx}
        showFooterCaption={false}
        pinMetaById={pinMetaById}
      />
    </div>
  );
}
