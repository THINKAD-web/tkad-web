"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import MediaAdvancedFiltersPanel from "@/components/media-advanced-filters-panel";
import MediaRegionReference from "@/components/media-region-reference";
import type { Dispatch, SetStateAction } from "react";
import type { MediaItem } from "@/lib/media-data";
import type {
  CatalogBounds,
  MediaAdvancedFilterState,
} from "@/lib/media-filter-advanced";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mdUp: boolean;
  catalog: MediaItem[];
  bounds: CatalogBounds;
  effectiveAdvanced: MediaAdvancedFilterState;
  setAdvanced: Dispatch<SetStateAction<MediaAdvancedFilterState | null>>;
};

export default function MediaAdvancedFiltersOverlay({
  open,
  onOpenChange,
  mdUp,
  catalog,
  bounds,
  effectiveAdvanced,
  setAdvanced,
}: Props) {
  const tMedia = useTranslations("media");

  return (
    <>
      <Modal
        open={open && mdUp}
        onClose={() => onOpenChange(false)}
        ariaLabelledBy="media-advanced-filters-heading"
        className="max-w-lg overflow-hidden p-0 sm:max-w-xl"
      >
        <div className="flex max-h-[min(88vh,820px)] flex-col">
          <div className="shrink-0 border-b border-navy/10 px-6 pt-6 pb-4 pr-14">
            <h2
              id="media-advanced-filters-heading"
              className="text-lg font-bold text-navy"
            >
              {tMedia("advanced.title")}
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              {tMedia("advanced.modalHint")}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <MediaAdvancedFiltersPanel
              catalog={catalog}
              bounds={bounds}
              value={effectiveAdvanced}
              onChange={(next) => setAdvanced(next)}
            />
            <div className="mt-6 border-t border-navy/10 pt-4">
              <MediaRegionReference />
            </div>
          </div>
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-navy/10 bg-white px-4 py-4 sm:flex-row sm:justify-stretch">
            <Button
              type="button"
              variant="floatingSecondary"
              className="h-11 w-full rounded-xl sm:flex-1"
              onClick={() => {
                setAdvanced(null);
                onOpenChange(false);
              }}
            >
              {tMedia("advanced.modalResetDefaults")}
            </Button>
            <Button
              type="button"
              variant="floatingPrimary"
              className="h-11 w-full rounded-xl sm:flex-1"
              onClick={() => onOpenChange(false)}
            >
              {tMedia("advanced.modalClose")}
            </Button>
          </div>
        </div>
      </Modal>

      <Sheet open={open && !mdUp} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="z-[65] flex h-[min(92dvh,920px)] max-h-[92dvh] flex-col gap-0 rounded-t-2xl border-t border-navy/10 p-0 [&>button]:z-30"
        >
          <SheetHeader className="shrink-0 space-y-2 border-b border-navy/10 px-6 pb-4 pt-4 text-left">
            <SheetTitle
              id="media-advanced-filters-heading-mobile"
              className="pr-10 text-lg font-bold text-navy"
            >
              {tMedia("advanced.title")}
            </SheetTitle>
            <SheetDescription className="text-left text-xs text-muted-foreground">
              {tMedia("advanced.modalHint")}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <MediaAdvancedFiltersPanel
              catalog={catalog}
              bounds={bounds}
              value={effectiveAdvanced}
              onChange={(next) => setAdvanced(next)}
            />
            <div className="mt-6 border-t border-navy/10 pt-4">
              <MediaRegionReference />
            </div>
          </div>
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-navy/10 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            <Button
              type="button"
              variant="floatingSecondary"
              className="h-11 w-full rounded-xl"
              onClick={() => {
                setAdvanced(null);
                onOpenChange(false);
              }}
            >
              {tMedia("advanced.modalResetDefaults")}
            </Button>
            <Button
              type="button"
              variant="floatingPrimary"
              className="h-11 w-full rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              {tMedia("advanced.modalClose")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
