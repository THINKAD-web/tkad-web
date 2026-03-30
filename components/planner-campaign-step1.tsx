"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { MonitorPlay, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";

type GoalDef = {
  key: PlannerCampaignGoal;
  titleKey: string;
  descKey: string;
};

type Props = {
  campaignGoal: PlannerCampaignGoal | null;
  goals: readonly GoalDef[];
  onSelectGoal: (key: PlannerCampaignGoal) => void;
};

const list = {
  visible: { transition: { staggerChildren: 0.05 } },
  hidden: {},
};

const item = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function PlannerCampaignStep1({
  campaignGoal,
  goals,
  onSelectGoal,
}: Props) {
  const t = useTranslations("planner");

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
      <Card className="border-navy/10 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy">
            <Sparkles className="h-5 w-5 text-gold" />
            {t("step1Title")}
          </CardTitle>
          <CardDescription className="text-base leading-relaxed">
            {t("step1Desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <motion.div
            className="grid gap-3 sm:grid-cols-2"
            variants={list}
            initial="hidden"
            animate="visible"
          >
            {goals.map(({ key, titleKey, descKey }) => (
              <motion.div key={key} variants={item}>
                <button
                  type="button"
                  onClick={() => onSelectGoal(key)}
                  className={cn(
                    "h-full w-full rounded-2xl border-2 p-4 text-left transition-all",
                    campaignGoal === key
                      ? "border-gold bg-gold/10 shadow-md ring-1 ring-gold/30"
                      : "border-navy/10 bg-white hover:border-navy/25",
                  )}
                >
                  <p className="font-bold text-navy">{t(titleKey)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(descKey)}
                  </p>
                </button>
              </motion.div>
            ))}
          </motion.div>
        </CardContent>
      </Card>

      <motion.aside
        className="relative overflow-hidden rounded-2xl border border-navy/15 bg-gradient-to-br from-slate-950 via-navy to-slate-900 p-5 text-white shadow-xl"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(232,213,181,0.14),transparent_55%)]" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold/90">
            <MonitorPlay className="h-4 w-4" aria-hidden />
            {t("step1VisualTitle")}
          </div>
          <motion.div
            className={cn(
              "relative overflow-hidden rounded-xl border-2 bg-black/35",
              campaignGoal
                ? "border-gold/60 shadow-[0_0_32px_rgba(232,213,181,0.12)]"
                : "border-white/20",
            )}
            animate={
              campaignGoal
                ? { scale: [1, 1.01, 1], transition: { duration: 0.6 } }
                : {}
            }
          >
            <div className="aspect-[2.35/1] w-full bg-gradient-to-br from-slate-800/90 via-navy/80 to-slate-900/90">
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-6 sm:py-8">
                <div className="rounded border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/50">
                  OOH
                </div>
                <p className="text-center text-sm font-semibold text-white/90 sm:text-base">
                  {t("step1VisualFrameLabel")}
                </p>
                <p className="max-w-[14rem] text-center text-[11px] leading-snug text-white/55 sm:text-xs">
                  {t("step1VisualHint")}
                </p>
              </div>
            </div>
          </motion.div>
          <p className="text-xs leading-relaxed text-white/65">
            {t("step1VisualDesc")}
          </p>
        </div>
      </motion.aside>
    </div>
  );
}
