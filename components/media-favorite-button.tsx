"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuthSession } from "@/components/auth/auth-session-provider";
import { useAppToast } from "@/lib/use-toast";
import { buildFavoritesGuestLimitMessage } from "@/lib/entitlements/gate-messages";
import { FAVORITES_CHANGE_EVENT } from "@/lib/favorites-constants";
import {
  isGuestFavorite,
  toggleGuestFavorite,
} from "@/lib/favorites-client";
import { hapticMedium } from "@/lib/haptic";
import { cn } from "@/lib/utils";

type Props = {
  mediaId: string;
  mediaName?: string;
  mediaNameEn?: string;
  /** 카탈로그 카드 등 작은 하트 */
  compact?: boolean;
  className?: string;
};

export function MediaFavoriteButton({
  mediaId,
  mediaName,
  mediaNameEn,
  compact = false,
  className,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("media.favorites");
  const { user, loading: sessionLoading } = useAuthSession();
  const loggedIn = user?.id ? true : sessionLoading ? null : false;
  const [favorited, setFavorited] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const toast = useAppToast();

  const refreshState = useCallback(async () => {
    if (sessionLoading) return;
    try {
      if (!user?.id) {
        setFavorited(isGuestFavorite(mediaId));
        return;
      }
      const r = await fetch("/api/my/favorites", { cache: "no-store" });
      const rd = await r.json();
      if (rd?.ok && rd.data && Array.isArray(rd.data.ids)) {
        setFavorited(rd.data.ids.includes(mediaId));
      } else {
        setFavorited(false);
      }
    } catch {
      setFavorited(isGuestFavorite(mediaId));
    }
  }, [mediaId, sessionLoading, user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshState();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshState]);

  useEffect(() => {
    const onChange = () => {
      if (loggedIn === false) {
        setFavorited(isGuestFavorite(mediaId));
      }
    };
    window.addEventListener(FAVORITES_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(FAVORITES_CHANGE_EVENT, onChange);
  }, [loggedIn, mediaId]);

  const toggle = useCallback(async () => {
    const displayName = mediaName ?? mediaId;

    if (loggedIn === false) {
      setPending(true);
      try {
        const result = toggleGuestFavorite({
          id: mediaId,
          name: mediaName ?? mediaId,
          nameEn: mediaNameEn ?? mediaName ?? mediaId,
        });
        if (!result.ok) {
          toast.show({
            variant: "warning",
            title: locale === "ko" ? "찜 저장 한도" : "Favorites limit",
            description: buildFavoritesGuestLimitMessage(locale === "ko"),
          });
          return;
        }
        setFavorited(result.favorited);
        if (result.favorited) {
          hapticMedium();
          toast.success(t("added", { name: displayName }));
        } else {
          toast.warning(t("removed"));
        }
      } finally {
        setPending(false);
      }
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/my/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, action: "toggle" }),
      });
      const data = await res.json();
      if (data?.ok) {
        const next = data.data.favorited as boolean;
        setFavorited(next);
        if (next) {
          hapticMedium();
          toast.success(t("added", { name: displayName }));
        } else {
          toast.warning(t("removed"));
        }
        window.dispatchEvent(new Event(FAVORITES_CHANGE_EVENT));
      } else {
        toast.error(t("error"));
      }
    } catch {
      toast.error(t("networkError"));
    } finally {
      setPending(false);
    }
  }, [loggedIn, mediaId, mediaName, mediaNameEn, t, toast]);

  const shellClass = compact
    ? "h-8 w-8 sm:h-9 sm:w-9"
    : "h-9 w-9";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
      }}
      disabled={pending || favorited === null}
      data-media-favorite-id={mediaId}
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-border transition-colors disabled:opacity-50",
        shellClass,
        favorited
          ? "bg-accent text-accent-foreground"
          : "bg-card text-foreground hover:bg-secondary/60",
        className,
      )}
      aria-label={favorited ? t("removeAria") : t("addAria")}
      aria-pressed={favorited ?? false}
    >
      <Heart
        className={compact ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-4 w-4"}
        fill={favorited ? "currentColor" : "none"}
        aria-hidden
      />
    </button>
  );
}
