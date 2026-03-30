"use client";

import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { Sparkles } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import MediaAiRecommendPanel from "@/components/media-ai-recommend-panel";
import SolutionCtaButton from "@/components/solution-cta-button";
import type { MediaItem } from "@/lib/media-data";

const RecommendCartBar = dynamic(
  () => import("@/components/recommend-cart-bar"),
  { ssr: false },
);

const CART_MAX = 12;

export default function RecommendPageClient({
  catalog,
}: {
  catalog: MediaItem[];
}) {
  const t = useTranslations();
  const tr = useTranslations("recommend");
  const locale = useLocale();
  const isKo = locale === "ko";

  const [cartItems, setCartItems] = useState<MediaItem[]>([]);

  const regionOptions = useMemo(
    () => [
      { value: "all", label: t("media.allRegions") },
      { value: "seoul", label: t("media.regions.seoul") },
      { value: "seoul_gangnam", label: isKo ? "강남/서초" : "Gangnam/Seocho" },
      { value: "seoul_hongdae", label: isKo ? "홍대/마포" : "Hongdae/Mapo" },
      { value: "seoul_myeongdong", label: isKo ? "명동/중구" : "Myeongdong/Junggu" },
      { value: "seoul_yeouido", label: isKo ? "여의도/영등포" : "Yeouido/Yeongdeungpo" },
      { value: "seoul_gangbuk", label: isKo ? "강북/종로" : "Jongno/Gangbuk" },
      { value: "seoul_etc", label: isKo ? "기타 서울" : "Other Seoul" },
      { value: "busan", label: t("media.regions.busan") },
      { value: "jeju", label: t("media.regions.jeju") },
      { value: "national", label: t("media.regions.national") },
    ],
    [t, isKo],
  );

  const toggleCart = useCallback((media: MediaItem) => {
    setCartItems((prev) => {
      const exists = prev.find((m) => m.id === media.id);
      if (exists) return prev.filter((m) => m.id !== media.id);
      if (prev.length >= CART_MAX) return prev;
      return [...prev, media];
    });
  }, []);

  const addManyToCart = useCallback((items: MediaItem[]) => {
    setCartItems((prev) => {
      const next = [...prev];
      for (const m of items) {
        if (next.length >= CART_MAX) break;
        if (!next.some((x) => x.id === m.id)) next.push(m);
      }
      return next;
    });
  }, []);

  const isInCart = useCallback(
    (id: string) => cartItems.some((m) => m.id === id),
    [cartItems],
  );

  const labelOverrides = useMemo(
    () => ({
      addCompare: tr("cartAdd"),
      addTop3: tr("addTop3ToCart"),
      quotePicked: tr("quoteWithCart"),
      quoteTop3: tr("quoteWithTop3"),
      quoteSingle: tr("quote"),
    }),
    [tr],
  );

  return (
    <>
      <section className="bg-navy py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-gold">
            <Sparkles className="h-3.5 w-3.5" />
            AI
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {tr("heroTitle")}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">
            {tr("heroSubtitle")}
          </p>
          <div className="mt-6">
            <SolutionCtaButton
              label={
                isKo
                  ? "맞춤형 OOH 캠페인 제안 받기"
                  : "Get Custom OOH Campaign Proposal"
              }
              size="lg"
              className="h-12"
            />
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MediaAiRecommendPanel
            locale={locale}
            regionOptions={regionOptions}
            catalog={catalog}
            compareItems={cartItems}
            toggleCompare={toggleCart}
            isInCompare={isInCart}
            addManyToCompare={addManyToCart}
            maxSelectionItems={CART_MAX}
            labelOverrides={labelOverrides}
          />
        </div>
      </section>

      <RecommendCartBar
        items={cartItems}
        locale={locale}
        maxItems={CART_MAX}
        onRemove={(id) =>
          setCartItems((prev) => prev.filter((m) => m.id !== id))
        }
        onClear={() => setCartItems([])}
      />

      {cartItems.length > 0 && <div className="h-20" />}
    </>
  );
}
