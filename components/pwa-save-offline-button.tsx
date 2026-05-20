"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Check, Trash2 } from "lucide-react";
import { useLocale } from "next-intl";
import { useAppToast } from "@/lib/use-toast";
import {
  isMediaSavedOffline,
  listSavedMedia,
  removeSavedMedia,
  saveMediaOffline,
  PWA_SAVED_MEDIA_MAX,
  type SavedMediaRecord,
} from "@/lib/pwa-saved-media";
import { cn } from "@/lib/utils";

type Props = {
  media: {
    id: string;
    name: string;
    location: string;
    type: string;
    price: number;
    imageUrl?: string;
  };
  className?: string;
};

export function PwaSaveOfflineButton({ media, className }: Props) {
  const locale = useLocale();
  const toast = useAppToast();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setSaved(await isMediaSavedOffline(media.id));
  }, [media.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSave = async () => {
    setBusy(true);
    try {
      if (saved) {
        await removeSavedMedia(media.id);
        setSaved(false);
        toast.success(locale === "ko" ? "오프라인 저장 해제" : "Removed offline save");
        return;
      }
      const record: SavedMediaRecord = {
        id: media.id,
        locale,
        savedAt: new Date().toISOString(),
        name: media.name,
        location: media.location,
        type: media.type,
        price: media.price,
        imageUrl: media.imageUrl,
        pagePath: `/${locale}/media/${media.id}`,
      };
      const result = await saveMediaOffline(record);
      if (!result.ok) {
        if (result.reason === "max") {
          toast.warning(
            locale === "ko"
              ? `오프라인 저장은 최대 ${PWA_SAVED_MEDIA_MAX}개까지 가능합니다.`
              : `Offline save limit is ${PWA_SAVED_MEDIA_MAX}.`,
          );
        } else {
          toast.error(locale === "ko" ? "저장 실패" : "Save failed");
        }
        return;
      }
      setSaved(true);
      toast.success(
        locale === "ko"
          ? "오프라인에서 볼 수 있도록 저장했습니다."
          : "Saved for offline viewing.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void handleSave()}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wider transition",
        saved
          ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
          : "border-white/18 bg-white/8 text-white/90 hover:bg-white/12",
        className,
      )}
    >
      {saved ? (
        <>
          <Check className="h-3.5 w-3.5" />
          {locale === "ko" ? "저장됨" : "Saved"}
          <Trash2 className="h-3 w-3 opacity-60" aria-hidden />
        </>
      ) : (
        <>
          <Download className="h-3.5 w-3.5" />
          {locale === "ko" ? "오프라인 저장" : "Save offline"}
        </>
      )}
    </button>
  );
}

/** 오프라인 페이지·설정용 저장 목록 */
export function useSavedMediaList() {
  const [items, setItems] = useState<SavedMediaRecord[]>([]);
  const reload = useCallback(() => {
    void listSavedMedia().then(setItems);
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { items, reload };
}
