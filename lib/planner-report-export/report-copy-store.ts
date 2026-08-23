"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  EMPTY_PLANNER_REPORT_COPY,
  parsePlannerReportCopyState,
  type PlannerReportCopyState,
} from "@/lib/planner-report-export/report-copy-state";

export type ReportCopyStoreState = PlannerReportCopyState & {
  setClientName: (name: string) => void;
  setDocumentTitle: (title: string) => void;
  setCoverLogoUrl: (url: string | null) => void;
  setGreeting: (text: string) => void;
  setExecutiveSummary: (text: string) => void;
  setProductionCostWon: (won: number | null) => void;
  applyDraft: (draft: {
    greeting: string;
    executiveSummary: string;
    fingerprint: string;
  }) => void;
  acknowledgeFingerprint: (fingerprint: string) => void;
  hydrateFromSnapshot: (snapshot: PlannerReportCopyState | null | undefined) => void;
  reset: () => void;
};

export const useReportCopyStore = create<ReportCopyStoreState>()(
  persist(
    (set) => ({
      ...EMPTY_PLANNER_REPORT_COPY,

      setClientName: (name) => set({ clientName: name.slice(0, 80) }),

      setDocumentTitle: (title) =>
        set({ documentTitle: title.slice(0, 120) }),

      setCoverLogoUrl: (url) =>
        set({
          coverLogoUrl:
            url && url.trim().length > 0 ? url.trim().slice(0, 2048) : null,
        }),

      setGreeting: (text) =>
        set({
          greeting: text.slice(0, 2000),
          greetingTouched: true,
        }),

      setExecutiveSummary: (text) =>
        set({
          executiveSummary: text.slice(0, 4000),
          executiveSummaryTouched: true,
        }),

      setProductionCostWon: (won) =>
        set({
          productionCostWon:
            won != null && Number.isFinite(won) && won >= 0
              ? Math.round(won)
              : null,
        }),

      applyDraft: (draft) =>
        set({
          greeting: draft.greeting.slice(0, 2000),
          executiveSummary: draft.executiveSummary.slice(0, 4000),
          copyFingerprint: draft.fingerprint,
          greetingTouched: false,
          executiveSummaryTouched: false,
        }),

      acknowledgeFingerprint: (fingerprint) =>
        set({ copyFingerprint: fingerprint }),

      hydrateFromSnapshot: (snapshot) => {
        if (!snapshot) return;
        set(parsePlannerReportCopyState(snapshot));
      },

      reset: () => set({ ...EMPTY_PLANNER_REPORT_COPY }),
    }),
    {
      name: "tkad-report-copy-v1",
      version: 2,
      partialize: (state) => ({
        clientName: state.clientName,
        documentTitle: state.documentTitle,
        coverLogoUrl: state.coverLogoUrl,
        greeting: state.greeting,
        executiveSummary: state.executiveSummary,
        greetingTouched: state.greetingTouched,
        executiveSummaryTouched: state.executiveSummaryTouched,
        copyFingerprint: state.copyFingerprint,
        productionCostWon: state.productionCostWon,
      }),
      migrate: (persisted, version) => {
        const parsed = parsePlannerReportCopyState(persisted);
        if (version < 2) {
          return { ...parsed, productionCostWon: parsed.productionCostWon ?? null };
        }
        return parsed;
      },
    },
  ),
);
