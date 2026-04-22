"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useAppToast } from "@/lib/use-toast";

type Props = {
  mediaId: string;
  mediaName?: string;
};

export function MediaFavoriteButton({ mediaId, mediaName }: Props) {
  const [favorited, setFavorited] = useState<boolean | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const toast = useAppToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await fetch("/api/auth/session", { cache: "no-store" });
        const sd = await s.json();
        if (cancelled) return;
        if (!sd?.ok || !sd.data) {
          setLoggedIn(false);
          return;
        }
        setLoggedIn(true);
        const r = await fetch("/api/my/favorites", { cache: "no-store" });
        const rd = await r.json();
        if (cancelled) return;
        if (rd?.ok) {
          setFavorited((rd.data.ids as string[]).includes(mediaId));
        }
      } catch {
        if (!cancelled) setLoggedIn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mediaId]);

  const toggle = useCallback(async () => {
    if (loggedIn === false) {
      window.location.href = `/login?redirect=/media/${mediaId}`;
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
          toast.success(mediaName ? `${mediaName}을(를) 관심 매체에 담았습니다.` : "관심 매체에 담았습니다.");
        } else {
          toast.warning("관심 매체에서 제거했습니다.");
        }
      } else {
        toast.error("요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  }, [loggedIn, mediaId, mediaName, toast]);

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending || loggedIn === null}
      className={`inline-flex items-center justify-center w-11 h-11 rounded-lg border transition-all hover:-translate-y-px active:translate-y-0 active:scale-95 ${
        favorited
          ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
          : "bg-card border-border text-muted-foreground hover:text-rose-500 hover:border-rose-200"
      }`}
      aria-label={favorited ? "관심 매체에서 제거" : "관심 매체에 담기"}
      aria-pressed={favorited ?? false}
    >
      <Heart className="w-4 h-4" fill={favorited ? "currentColor" : "none"} />
    </button>
  );
}
