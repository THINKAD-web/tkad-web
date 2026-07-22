"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GalleryUrlsChange =
  | string[]
  | ((prev: string[]) => string[]);

type Props = {
  urls: string[];
  onChange: (urls: GalleryUrlsChange) => void;
  onUploadFiles: (files: File[]) => Promise<string[]>;
  onDeleteRemote?: (url: string) => Promise<void>;
  busy?: boolean;
};

function SortableThumb({
  id,
  url,
  isPrimary,
  onRemove,
}: {
  id: string;
  url: string;
  isPrimary: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative overflow-hidden rounded-lg border-2 bg-muted/30",
        isPrimary ? "border-[color:var(--qp-accent)]/60 ring-1 ring-[color:var(--qp-accent)]/30" : "border-border",
        isDragging && "z-10 opacity-60",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-24 w-full object-cover" />
      {isPrimary ? (
        <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded bg-[color:var(--qp-accent)]/90 px-1.5 py-0.5 font-display text-xs font-medium uppercase dark:text-white text-gray-900">
          <Star className="h-2.5 w-2.5 fill-current" />
          대표
        </span>
      ) : null}
      <button
        type="button"
        className="absolute right-1 top-1 flex h-6 w-6 cursor-grab items-center justify-center rounded dark:bg-black bg-white dark:bg-white/5 bg-gray-500 dark:text-white text-gray-900 touch-none"
        {...attributes}
        {...listeners}
        aria-label="순서 변경"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="absolute bottom-1 right-1 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs dark:text-white text-gray-900 group-hover:flex"
        onClick={onRemove}
        aria-label="삭제"
      >
        ✕
      </button>
    </div>
  );
}

function appendUploaded(prev: string[], uploaded: string[]): string[] {
  if (uploaded.length === 0) return prev;
  const seen = new Set(prev);
  const next = [...prev];
  for (const raw of uploaded) {
    const u = raw.trim();
    if (!u || seen.has(u)) continue;
    seen.add(u);
    next.push(u);
  }
  return next;
}

export function MediaGalleryEditor({
  urls,
  onChange,
  onUploadFiles,
  onDeleteRemote,
  busy = false,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);
  /** Serialize overlapping pickFiles so concurrent uploads cannot drop earlier URLs. */
  const uploadChainRef = useRef<Promise<void>>(Promise.resolve());
  const uploadPendingRef = useRef(0);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const ids = useMemo(() => urls.map((u, i) => `${i}-${u}`), [urls]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      onChange((prev) => arrayMove(prev, oldIndex, newIndex));
    },
    [ids, onChange],
  );

  const pickFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (list.length === 0) return;

      uploadPendingRef.current += 1;
      setLocalBusy(true);
      const run = async () => {
        try {
          const uploaded = await onUploadFiles(list);
          // Functional update: always append onto the latest gallery, not a stale closure.
          onChange((prev) => appendUploaded(prev, uploaded));
        } finally {
          uploadPendingRef.current = Math.max(0, uploadPendingRef.current - 1);
          if (uploadPendingRef.current === 0) setLocalBusy(false);
        }
      };

      uploadChainRef.current = uploadChainRef.current
        .then(run, run)
        .catch(() => {
          /* upload errors surface via onUploadFiles / parent saveError */
        });
    },
    [onChange, onUploadFiles],
  );

  const removeAt = useCallback(
    async (index: number) => {
      const url = urls[index];
      if (!url) return;
      if (onDeleteRemote) {
        try {
          await onDeleteRemote(url);
        } catch {
          // 목록에서는 제거, CDN 삭제 실패는 무시 가능
        }
      }
      onChange((prev) => {
        const i = prev.indexOf(url);
        if (i < 0) return prev;
        return prev.filter((_, idx) => idx !== i);
      });
    },
    [onChange, onDeleteRemote, urls],
  );

  const uploading = busy || localBusy;

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) {
            pickFiles(e.dataTransfer.files);
          }
        }}
        className={cn(
          "rounded-xl border-2 border-dashed p-4 text-center transition-colors",
          dragOver
            ? "border-[color:var(--qp-accent)]/50 bg-[color:var(--qp-accent)]/10"
            : "border-border bg-muted/20",
        )}
      >
        <p className="text-xs text-muted-foreground">
          이미지를 드래그하거나 아래 버튼으로 여러 장 업로드 · 첫 번째가 대표 이미지
        </p>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          id="media-gallery-file-input"
          onChange={(e) => {
            if (e.target.files) pickFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 gap-1.5"
          disabled={uploading}
          onClick={() =>
            document.getElementById("media-gallery-file-input")?.click()
          }
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          이미지 추가
        </Button>
      </div>

      {urls.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {urls.map((url, i) => (
                <SortableThumb
                  key={ids[i]}
                  id={ids[i]!}
                  url={url}
                  isPrimary={i === 0}
                  onRemove={() => void removeAt(i)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : null}
    </div>
  );
}
