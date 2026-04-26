"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, GitCompareArrows, Send, Sparkles } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { useToast } from "@/components/toast-provider";
import {
  COMPARE_CART_CHANGE_EVENT,
  getCompareCartEntries,
  setCompareCartEntries,
  subscribeCompareCart,
  type CompareCartEntry,
} from "@/lib/compare-cart-client";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
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
      <BtnBlock
        href={`/planner?addMedia=${encodeURIComponent(mediaId)}`}
        variant="accent"
        size="md"
        className="w-full"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        {t("planner")}
      </BtnBlock>
      <BtnBlock
        onClick={toggleCompare}
        variant={inCart ? "primary" : "secondary"}
        size="md"
        className="w-full"
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
        className="w-full"
      >
        <Send className="h-4 w-4" aria-hidden />
        {t("quote")}
      </BtnBlock>
      {entries.length > 0 ? (
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-bx-gray-dim">
          {isKo
            ? `// 비교함 ${entries.length}/${COMPARE_MAX_ITEMS}`
            : `// Compare ${entries.length}/${COMPARE_MAX_ITEMS}`}
        </p>
      ) : null}
    </div>
  );
}
