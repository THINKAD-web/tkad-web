"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useAppToast } from "@/lib/use-toast";
import {
  addGuestFavorite,
  isGuestFavorited,
  readGuestFavorites,
  removeGuestFavorite,
} from "@/lib/guest-favorites";

type Props = {
  mediaId: string;
  mediaName?: string;
};

export function MediaFavoriteButton({ mediaId, mediaName }: Props) {
  const [favorited, setFavorited] = useState<boolean | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const toast = useAppToast();

  // 세션 + 현재 상태 로드(로그인: DB, 비로그인: localStorage)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await fetch("/api/auth/session", { cache: "no-store" });
        const sd = await s.json();
        if (cancelled) return;
        if (!sd?.ok || !sd.data) {
          setLoggedIn(false);
          setFavorited(isGuestFavorited(mediaId));
          return;
        }
        setLoggedIn(true);
        const r = await fetch("/api/my/favorites", { cache: "no-store" });
        const rd = await r.json();
        if (cancelled) return;
        if (rd?.ok && rd.data && Array.isArray(rd.data.ids)) {
          setFavorited(rd.data.ids.includes(mediaId));
        }
      } catch {
        if (!cancelled) {
          setLoggedIn(false);
          setFavorited(isGuestFavorited(mediaId));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mediaId]);

  // 다른 컴포넌트가 guest 큐를 비웠을 때 상태 동기화
  useEffect(() => {
    if (loggedIn) return;
    function onChange() {
      setFavorited(isGuestFavorited(mediaId));
    }
    window.addEventListener("tkad-guest-favorites-change", onChange);
    return () => window.removeEventListener("tkad-guest-favorites-change", onChange);
  }, [loggedIn, mediaId]);

  const toggle = useCallback(async () => {
    // 비로그인: localStorage 큐로 임시 저장 + 토스트로 안내 (페이지 이탈 X)
    if (loggedIn === false) {
      const wasFavorited = isGuestFavorited(mediaId);
      if (wasFavorited) {
        removeGuestFavorite(mediaId);
        setFavorited(false);
        toast.warning("관심 매체에서 제거했습니다.");
      } else {
        addGuestFavorite(mediaId);
        setFavorited(true);
        const queued = readGuestFavorites().length;
        toast.success(
          mediaName
            ? `${mediaName}을(를) 관심 매체에 담았습니다. 로그인하면 ${queued}개가 동기화돼요.`
            : `관심 매체에 담았습니다. 로그인하면 ${queued}개가 동기화돼요.`,
        );
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
          toast.success(
            mediaName
              ? `${mediaName}을(를) 관심 매체에 담았습니다.`
              : "관심 매체에 담았습니다.",
          );
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
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border border-border transition-colors disabled:opacity-50 ${
        favorited
          ? "bg-accent text-accent-foreground"
          : "bg-card text-foreground hover:bg-secondary/60"
      }`}
      aria-label={favorited ? "관심 매체에서 제거" : "관심 매체에 담기"}
      aria-pressed={favorited ?? false}
    >
      <Heart className="h-4 w-4" fill={favorited ? "currentColor" : "none"} />
    </button>
  );
}
