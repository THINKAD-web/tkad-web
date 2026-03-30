"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import MediaAiTop3Results from "@/components/media-ai-top3-results";
import type { ScoredMedia } from "@/lib/ai-media-recommend";

type Props = {
  locale: string;
  top3: ScoredMedia[];
  quoteLabel: string;
  onRestartQuiz: () => void;
  onViewFullList: () => void;
  onRecommendAgain: () => void;
};

export default function RecommendResult({
  locale,
  top3,
  quoteLabel,
  onRestartQuiz,
  onViewFullList,
  onRecommendAgain,
}: Props) {
  const tr = useTranslations("recommend");

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <MediaAiTop3Results
        locale={locale}
        items={top3}
        onRestartQuiz={onRestartQuiz}
        onViewFullList={onViewFullList}
        quoteLabel={quoteLabel}
      />
      <motion.div
        className="flex justify-center border-t border-navy/10 pt-8"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <Button
          type="button"
          className="btn-gold h-12 rounded-full px-10 text-base font-bold shadow-lg"
          onClick={onRecommendAgain}
        >
          {tr("recommendAgain")}
        </Button>
      </motion.div>
    </motion.div>
  );
}
