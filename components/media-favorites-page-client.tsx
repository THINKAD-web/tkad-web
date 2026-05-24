"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Heart } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { MediaCard, type MediaCardItem } from "@/components/my/media-card";
import { BtnBlock } from "@/components/brutalist";
import { EmptyState, Spinner } from "@/components/ui/spinner";
import { useAppToast } from "@/lib/use-toast";
import {
  getGuestFavoriteEntries,
  removeGuestFavorite,
  subscribeFavorites,
} from "@/lib/favorites-client";
import { FAVORITES_CHANGE_EVENT } from "@/lib/favorites-constants";
import { buildPlannerHrefWithMediaIds } from "@/lib/planner-media-href";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";

type FavoriteRow = MediaCardItem & { visibilityScore?: number };

function entriesToRows(
  entries: { id: string; name: string; nameEn: string }[],
  catalog: MediaItem[],
): FavoriteRow[] {
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const rows: FavoriteRow[] = [];
  for (const e of entries) {
    const m = byId.get(e.id);
    if (!m) continue;
    rows.push({
      id: m.id,
      name: m.name,
      region: m.region,
      type: m.type,
      price: catalogPriceFieldToWon(m.price ?? 0),
      image: m.sampleImages?.[0] ?? null,
    });
  }
  return rows;
}

export function MediaFavoritesPageClient({
  catalog,
}: {
  catalog: MediaItem[];
}) {
  const t = useTranslations("media.favorites");
  const locale = useLocale();
  const isKo = locale === "ko";
  const toast = useAppToast();
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [items, setItems] = useState<FavoriteRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetch("/api/auth/session", { cache: "no-store" });
      const sd = await s.json();
      if (sd?.ok && sd.data) {
        setLoggedIn(true);
        const r = await fetch("/api/my/favorites", { cache: "no-store" });
        const rd = await r.json();
        if (rd?.ok && Array.isArray(rd.data?.items)) {
          setItems(
            rd.data.items.map(
              (m: {
                id: string;
                name: string;
                region: string;
                type: string;
                price: number;
                image: string | null;
              }) => ({
                id: m.id,
                name: m.name,
                region: m.region,
                type: m.type,
                price: m.price,
                image: m.image,
              }),
            ),
          );
        } else {
          setItems([]);
        }
      } else {
        setLoggedIn(false);
        setItems(entriesToRows(getGuestFavoriteEntries(), catalog));
      }
    } finally {
      setLoading(false);
    }
  }, [catalog]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const unsub = subscribeFavorites(() => {
      if (!loggedIn) {
        setItems(entriesToRows(getGuestFavoriteEntries(), catalog));
      }
    });
    const onServer = () => {
      void load();
    };
    window.addEventListener(FAVORITES_CHANGE_EVENT, onServer);
    return () => {
      unsub();
      window.removeEventListener(FAVORITES_CHANGE_EVENT, onServer);
    };
  }, [catalog, loggedIn, load]);

  async function removeFavorite(mediaId: string) {
    const target = items.find((f) => f.id === mediaId);
    if (loggedIn) {
      const res = await fetch("/api/my/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, action: "remove" }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((f) => f.id !== mediaId));
        toast.warning(
          target
            ? t("removedNamed", { name: target.name })
            : t("removed"),
        );
        window.dispatchEvent(new Event(FAVORITES_CHANGE_EVENT));
      } else {
        toast.error(t("error"));
      }
      return;
    }
    removeGuestFavorite(mediaId);
    setItems((prev) => prev.filter((f) => f.id !== mediaId));
    toast.warning(
      target ? t("removedNamed", { name: target.name }) : t("removed"),
    );
  }

  const plannerHref = buildPlannerHrefWithMediaIds(items.map((m) => m.id));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <header className="mb-8 border-b-2 border-border pb-6">
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          <Heart className="h-7 w-7 text-accent" aria-hidden />
          {t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {t("subtitle")}
        </p>
        {!loggedIn ? (
          <p className="mt-3 font-display text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {t("guestHint")}
          </p>
        ) : null}
      </header>

      {loading ? (
        <div className="py-16 text-center">
          <Spinner size="md" label={t("loading")} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="♡"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Link
              href="/media"
              className="inline-flex items-center gap-2 border-2 border-border bg-card px-6 py-3 font-display text-xs font-medium uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              {t("browseCta")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          }
        />
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {items.map((m) => (
              <MediaCard key={m.id} item={m} onRemove={removeFavorite} />
            ))}
          </ul>
          <div className="mt-10 flex flex-col items-stretch gap-3 border-t-2 border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{t("plannerLead")}</p>
            <BtnBlock href={plannerHref} variant="accent" size="md">
              {t("plannerCta")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </BtnBlock>
          </div>
        </>
      )}

      {items.length > 0 ? (
        <p className="mt-6 text-center font-display text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {isKo
            ? `선택 ${items.length}개 · 비교는 매체 목록에서 진행`
            : `${items.length} saved · compare from media browse`}
        </p>
      ) : null}
    </div>
  );
}
