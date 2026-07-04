"use client";

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { CompositePreview } from "@/components/planner/composite-preview";
import type { CompositeLogoPlacement } from "@/components/planner/composite-preview";

type SlideCard = {
  id: string;
  url: string;
  name: string;
};

type Props = {
  current: SlideCard | null;
  slideDir: 0 | 1 | -1;
  editing: boolean;
  creativeUploadedUrl: string | null;
  creativeObjectUrl: string | null;
  mediaPlacements: Record<string, CompositeLogoPlacement>;
  defaultPlacement: CompositeLogoPlacement;
  onSlideDragEnd: (_: unknown, info: PanInfo) => void;
  onPlacementChange: (mediaId: string, next: CompositeLogoPlacement) => void;
  missingLabel: string;
  badgeLabel: string;
};

export function PlannerSimulationSlideDeck({
  current,
  slideDir,
  editing,
  creativeUploadedUrl,
  creativeObjectUrl,
  mediaPlacements,
  defaultPlacement,
  onSlideDragEnd,
  onPlacementChange,
  missingLabel,
  badgeLabel,
}: Props) {
  return (
    <AnimatePresence initial={false} custom={slideDir === 0 ? 1 : slideDir} mode="wait">
      {current ? (
        <motion.div
          key={current.id}
          custom={slideDir === 0 ? 1 : slideDir}
          variants={{
            enter: (dir: number) => ({
              x: dir > 0 ? 56 : -56,
              opacity: 0,
            }),
            center: { x: 0, opacity: 1 },
            exit: (dir: number) => ({
              x: dir < 0 ? 56 : -56,
              opacity: 0,
            }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            duration: 0.28,
            ease: [0.22, 1, 0.36, 1],
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.85}
          onDragEnd={onSlideDragEnd}
          className="touch-pan-y"
        >
          <CompositePreview
            mediaImageUrl={current.url}
            mediaName={current.name}
            logoUrl={creativeUploadedUrl || creativeObjectUrl}
            placement={mediaPlacements[current.id] ?? defaultPlacement}
            editable={editing}
            onPlacementChange={(next) => onPlacementChange(current.id, next)}
            missingLabel={missingLabel}
            badgeLabel={badgeLabel}
            className="rounded-none"
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
