"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bolt, Check, GitCompareArrows, Send, Sparkles } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { useToast } from "@/components/toast-provider";
import { useCartCompareMax } from "@/hooks/use-cart-compare-max";
import {
  cartCompareLimitToastMessage,
  isCartCompareUnlimited,
} from "@/lib/entitlements/limits";
import {
  COMPARE_CART_CHANGE_EVENT,
  getCompareCartEntries,
  setCompareCartEntries,
  subscribeCompareCart,
  type CompareCartEntry,
} from "@/lib/compare-cart-client";

type Props = {
  mediaId: string;
  mediaName: string;
  mediaNameEn: string;
  isKo: boolean;
  instantBookEligible?: boolean;
};

/**
 * Hero 우측 패널 (desktop only) CTA.
 * 모바일 sticky bar 는 별도 `MediaDetailStickyCta` 컴포넌트가 처리.
 */
export function MediaStickyCta({
  mediaId,
  mediaName,
  mediaNameEn,
  isKo,
  instantBookEligible = false,
}: Props) {
  const t = useTranslations("mediaDetail.cta");
  const { toast } = useToast();
  const { maxItems: compareMax } = useCartCompareMax();
  const [entries, setEntries] = useState<CompareCartEntry[]>([]);

  useEffect(
    () =>
      subscribeCompareCart(() =>
        setEntries(getCompareCartEntries(compareMax)),
      ),
    [compareMax],
  );
  const [hydrated, setHydrated] = useState(false);
  if (!hydrated) {
    setHydrated(true);
    if (typeof window !== "undefined") {
      const initial = getCompareCartEntries(compareMax);
      if (initial.length !== entries.length) setEntries(initial);
    }
  }

  const inCart = entries.some((e) => e.id === mediaId);
  const isFull = entries.length >= compareMax && !inCart;

  const toggleCompare = () => {
    if (inCart) {
      setCompareCartEntries(
        entries.filter((e) => e.id !== mediaId),
        compareMax,
      );
      toast("success", t("compareRemoved"));
      return;
    }
    if (isFull) {
      toast("error", cartCompareLimitToastMessage(isKo));
      return;
    }
    const next: CompareCartEntry = {
      id: mediaId,
      name: mediaName,
      nameEn: mediaNameEn || mediaName,
    };
    setCompareCartEntries([...entries, next], compareMax);
    toast("success", t("compareAdded"));
    window.dispatchEvent(new Event(COMPARE_CART_CHANGE_EVENT));
  };

  const countSuffix = isCartCompareUnlimited(compareMax)
    ? String(entries.length)
    : `${entries.length}/${compareMax}`;

  return (
    <div className="hidden flex-col gap-2 md:flex">
      {instantBookEligible ? (
        <BtnBlock
          href={`/media/${encodeURIComponent(mediaId)}/book`}
          variant="primary"
          size="lg"
          className="w-full rounded-[22px] border-0 shadow-[0_0_24px_rgba(var(--primary-rgb),0.35)]"
        >
          <Bolt className="h-4 w-4" aria-hidden />
          {t("instantBook")}
        </BtnBlock>
      ) : null}
      <BtnBlock
        href={`/planner?addMedia=${encodeURIComponent(mediaId)}`}
        variant="accent"
        size="lg"
        className="w-full tkad-neon-cta-clean rounded-[22px] border-0"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        {t("planner")}
      </BtnBlock>
      <BtnBlock
        onClick={toggleCompare}
        variant={inCart ? "primary" : "secondary"}
        size="md"
        className={
          inCart
            ? "w-full"
            : "tkad-media-detail-cta-secondary w-full rounded-[18px] border dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 dark:text-white text-gray-900 backdrop-blur hover:bg-white/12"
        }
      >
        {inCart ? (
          <Check className="h-4 w-4" aria-hidden />
        ) : (
          <GitCompareArrows className="h-4 w-4" aria-hidden />
        )}
        {inCart
          ? t("compareIn", { count: entries.length })
          : t("compare")}
      </BtnBlock>
      <BtnBlock
        href={`/quote?media=${encodeURIComponent(mediaId)}`}
        variant="secondary"
        size="md"
        className="tkad-media-detail-cta-secondary w-full rounded-[18px] border dark:border-white/14 border-gray-200 dark:bg-white/6 bg-gray-50 dark:text-white text-gray-900 backdrop-blur hover:dark:bg-white/10 bg-gray-100"
      >
        <Send className="h-4 w-4" aria-hidden />
        {t("quote")}
      </BtnBlock>
      {entries.length > 0 ? (
        <p className="text-center font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {isKo ? `// 비교함 ${countSuffix}` : `// Compare ${countSuffix}`}
        </p>
      ) : null}
    </div>
  );
}
