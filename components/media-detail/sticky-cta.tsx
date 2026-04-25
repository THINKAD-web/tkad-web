"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, GitCompareArrows, Send, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
import {
  COMPARE_CART_CHANGE_EVENT,
  getCompareCartEntries,
  setCompareCartEntries,
  subscribeCompareCart,
  type CompareCartEntry,
} from "@/lib/compare-cart-client";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import { cn } from "@/lib/utils";

type Props = {
  mediaId: string;
  mediaName: string;
  mediaNameEn: string;
  isKo: boolean;
};

/**
 * Hero 우측 패널 (desktop only) CTA 3종.
 * 모바일 sticky bar 는 별도 `MediaDetailStickyCta` 컴포넌트가 처리.
 */
export function MediaStickyCta({
  mediaId,
  mediaName,
  mediaNameEn,
  isKo,
}: Props) {
  const t = useTranslations("mediaDetail.cta");
  const { toast } = useToast();
  const [entries, setEntries] = useState<CompareCartEntry[]>([]);

  useEffect(() => subscribeCompareCart(() => setEntries(getCompareCartEntries())), []);
  // 마운트 시점 1회 동기 hydrate — render 단에서 비교
  const [hydrated, setHydrated] = useState(false);
  if (!hydrated) {
    setHydrated(true);
    if (typeof window !== "undefined") {
      const initial = getCompareCartEntries();
      // setEntries 직접 호출 (effect 내부 아님 — render 단 단발 실행)
      if (initial.length !== entries.length) setEntries(initial);
    }
  }

  const inCart = entries.some((e) => e.id === mediaId);
  const isFull = entries.length >= COMPARE_MAX_ITEMS && !inCart;

  const toggleCompare = () => {
    if (inCart) {
      setCompareCartEntries(entries.filter((e) => e.id !== mediaId));
      toast("success", t("compareRemoved"));
      return;
    }
    if (isFull) {
      toast("error", t("compareFull", { max: COMPARE_MAX_ITEMS }));
      return;
    }
    const next: CompareCartEntry = {
      id: mediaId,
      name: mediaName,
      nameEn: mediaNameEn || mediaName,
    };
    setCompareCartEntries([...entries, next]);
    toast("success", t("compareAdded"));
    // dispatch 명시 (compare bar 즉시 갱신)
    window.dispatchEvent(new Event(COMPARE_CART_CHANGE_EVENT));
  };

  return (
    <div className="hidden flex-col gap-2 md:flex">
      <Button
        asChild
        size="lg"
        className="btn-gold w-full rounded-full font-semibold"
      >
        <Link href={`/planner?addMedia=${encodeURIComponent(mediaId)}`}>
          <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />
          {t("planner")}
        </Link>
      </Button>
      <Button
        type="button"
        variant={inCart ? "default" : "outline"}
        size="lg"
        onClick={toggleCompare}
        aria-pressed={inCart}
        aria-label={inCart ? t("compareRemove") : t("compare")}
        className={cn(
          "w-full rounded-full border-navy/20",
          inCart && "bg-navy text-white hover:bg-navy/90",
        )}
      >
        {inCart ? (
          <Check className="mr-1.5 h-4 w-4" aria-hidden />
        ) : (
          <GitCompareArrows className="mr-1.5 h-4 w-4" aria-hidden />
        )}
        {inCart
          ? t("compareIn", { count: entries.length })
          : t("compare")}
      </Button>
      <Button
        asChild
        variant="ghost"
        size="lg"
        className="w-full rounded-full font-semibold text-navy hover:bg-navy/5"
      >
        <Link href={`/quote?media=${encodeURIComponent(mediaId)}`}>
          <Send className="mr-1.5 h-4 w-4" aria-hidden />
          {t("quote")}
        </Link>
      </Button>
      {entries.length > 0 ? (
        <p className="text-center text-[11px] text-muted-foreground">
          {isKo
            ? `비교함 ${entries.length}/${COMPARE_MAX_ITEMS}`
            : `Compare ${entries.length}/${COMPARE_MAX_ITEMS}`}
        </p>
      ) : null}
    </div>
  );
}
