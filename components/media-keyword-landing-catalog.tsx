"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CompareBar from "@/components/compare-bar";
import { MediaDiscoveryGridCard } from "@/components/media/media-discovery-grid-card";
import {
  entriesToCompareMediaItems,
  getCompareCartEntries,
  setCompareCartEntries,
  subscribeCompareCart,
  type CompareCartEntry,
} from "@/lib/compare-cart-client";
import { mapMediaItemToHomeCatalog } from "@/lib/media-catalog-map";
import { regionLabel } from "@/lib/media-keyword-landing";
import { type MediaItem, typeLabels } from "@/lib/media-data";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { isInstantBookingEligible } from "@/lib/instant-booking-eligibility";
import { planCartItemFromMediaItem } from "@/lib/plan-cart-item-builders";
import {
  formatMediaPriceWithPeriodSuffix,
  normalizeMediaPricePeriod,
  resolveMediaDisplayPrice,
} from "@/lib/media-price-format";
import { useCart } from "@/lib/cart";
import { useAppToast } from "@/lib/use-toast";

type Props = {
  items: MediaItem[];
  locale: string;
};

function renderPriceLabel(item: MediaItem, locale: string): string | null {
  const display = resolveMediaDisplayPrice(item);
  if (display.priceWon <= 0) return null;
  return formatMediaPriceWithPeriodSuffix(
    display.priceWon,
    normalizeMediaPricePeriod(display.period),
    locale,
  );
}

/**
 * 지역·유형·로컬 SEO 랜딩용 매체 그리드 — `/media` 카드 뷰와 동일 UI.
 */
export function MediaKeywordLandingCatalog({ items, locale }: Props) {
  const isKo = locale === "ko" || locale.startsWith("ko");
  const toast = useAppToast();
  const { ids: cartIds, toggle: toggleCartId } = useCart();
  const [compareEntries, setCompareEntriesState] = useState<CompareCartEntry[]>(
    [],
  );

  useEffect(() => {
    setCompareEntriesState(getCompareCartEntries());
    return subscribeCompareCart(() => {
      setCompareEntriesState(getCompareCartEntries());
    });
  }, []);

  const isInCompare = useCallback(
    (id: string) => compareEntries.some((e) => e.id === id),
    [compareEntries],
  );

  const toggleCompare = useCallback((item: MediaItem) => {
    const prev = getCompareCartEntries();
    const exists = prev.some((e) => e.id === item.id);
    const next = exists
      ? prev.filter((e) => e.id !== item.id)
      : [
          ...prev,
          {
            id: item.id,
            name: item.name,
            nameEn: item.nameEn || item.name,
          },
        ];
    setCompareCartEntries(next);
  }, []);

  const toggleCart = useCallback(
    (item: MediaItem) => {
      const inCart = cartIds.includes(item.id);
      toggleCartId(item.id, "keyword_landing");
      if (inCart) {
        toast.warning(
          item.name
            ? `${item.name}이(가) 장바구니에서 제거되었습니다.`
            : "장바구니에서 제거되었습니다.",
        );
      } else {
        toast.success(
          item.name
            ? `${item.name}이(가) 장바구니에 담겼습니다.`
            : "매체가 장바구니에 담겼습니다.",
        );
      }
    },
    [cartIds, toggleCartId, toast],
  );

  const isInCart = useCallback(
    (id: string) => cartIds.includes(id),
    [cartIds],
  );

  const compareItems = useMemo(
    () => entriesToCompareMediaItems(compareEntries, items),
    [compareEntries, items],
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3">
        {items.map((m, index) => {
          const name = isKo ? m.name : m.nameEn || m.name;
          const typeLabel =
            typeLabels[m.type]?.[isKo ? "ko" : "en"] ?? m.type;
          const metaLine = [regionLabel(m.region, locale), typeLabel]
            .filter(Boolean)
            .join(" · ");
          const instant = isInstantBookingEligible({
            instantBookingEnabled: m.instantBookingEnabled ?? false,
            availability: m.availability,
            catalogSource: m.catalogSource,
          }).eligible;

          return (
            <MediaDiscoveryGridCard
              key={m.id}
              href={mediaItemDetailPath(m)}
              name={name}
              metaLine={metaLine}
              priceLabel={renderPriceLabel(m, locale)}
              imageUrl={mapMediaItemToHomeCatalog(m).thumbnailUrl ?? null}
              isKo={isKo}
              planItem={planCartItemFromMediaItem(m, "search")}
              inCompare={isInCompare(m.id)}
              inCart={isInCart(m.id)}
              onToggleCompare={() => toggleCompare(m)}
              onToggleCart={() => toggleCart(m)}
              isVerified={m.isVerified === true}
              isInstantBooking={instant}
              imagePriority={index < 6}
            />
          );
        })}
      </div>

      <CompareBar
        variant="light"
        items={compareItems}
        locale={locale}
        onClear={() => setCompareCartEntries([])}
      />
    </>
  );
}
