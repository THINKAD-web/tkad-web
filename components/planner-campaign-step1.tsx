"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { MonitorPlay, Sparkles } from "lucide-react";
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
      <div className="border-2 border-border bg-card">
        <div className="border-b-2 border-border p-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            [ STEP 1 / GOAL ]
          </p>
          <h2 className="mt-2 flex items-center gap-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("step1Title")}
          </h2>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            {t("step1Desc")}
          </p>
        </div>
        <div className="p-6">
          <motion.div
            className="grid grid-cols-1 gap-0 sm:grid-cols-2"
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
                    "-mt-[2px] -ml-[2px] h-full w-full border-2 p-5 text-left transition-colors",
                    campaignGoal === key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-muted",
                  )}
                >
                  <p
                    className={cn(
                      "font-bold tracking-tight",
                      campaignGoal === key ? "text-primary-foreground" : "text-foreground",
                    )}
                  >
                    {t(titleKey)}
                  </p>
                  <p
                    className={cn(
                      "mt-2 font-mono text-[11px] tracking-tight",
                      campaignGoal === key
                        ? "text-primary-foreground/85"
                        : "text-muted-foreground",
                    )}
                  >
                    {t(descKey)}
                  </p>
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <motion.aside
        className="border-2 border-border bg-hero-void p-5 text-hero-fg"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="space-y-4">
          <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            <MonitorPlay className="h-3.5 w-3.5" aria-hidden />
            [ {t("step1VisualTitle")} ]
          </p>
          <motion.div
            className={cn(
              "relative overflow-hidden border-2 bg-hero-void",
              campaignGoal ? "border-primary" : "border-hero-fg/30",
            )}
            animate={
              campaignGoal
                ? { scale: [1, 1.01, 1], transition: { duration: 0.6 } }
                : {}
            }
          >
            <div className="aspect-[2.35/1] w-full bg-hero-void">
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-6 sm:py-8">
                <div className="border-2 border-primary bg-primary px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary-foreground">
                  OOH
                </div>
                <p className="text-center text-sm font-bold text-hero-fg sm:text-base">
                  {t("step1VisualFrameLabel")}
                </p>
                <p className="max-w-[14rem] text-center font-mono text-[10px] leading-snug tracking-tight text-hero-fg/65 sm:text-xs">
                  {t("step1VisualHint")}
                </p>
              </div>
            </div>
          </motion.div>
          <p className="font-mono text-[11px] leading-relaxed tracking-tight text-hero-fg/70">
            {`// `}{t("step1VisualDesc")}
          </p>
        </div>
      </motion.aside>
    </div>
  );
}
