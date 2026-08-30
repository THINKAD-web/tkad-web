"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import ContactInquiryForm from "@/components/contact-inquiry-form";
import { ContactFeedbackSurvey } from "@/components/contact-feedback-survey";

type MainTab = "inquiry" | "feedback";

export function ContactFormPanel() {
  const t = useTranslations("contact");
  const [mainTab, setMainTab] = useState<MainTab>("inquiry");

  const tabBase =
    "inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold backdrop-blur transition-ui dark:border-white/10 dark:bg-white/5";

  const tabActive =
    "border-[color:var(--qp-accent)]/40 bg-[color:var(--qp-accent-soft)] text-gray-900 shadow-sm dark:text-white";
  const tabIdle =
    "text-gray-600 hover:border-gray-300 hover:bg-gray-100 dark:text-white dark:hover:border-white/20 dark:hover:bg-white/10";

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 backdrop-blur dark:border-white/10 dark:bg-white/5 sm:p-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setMainTab("inquiry")}
            className={cn(tabBase, mainTab === "inquiry" ? tabActive : tabIdle)}
          >
            {t("tabInquiry")}
          </button>
          <button
            type="button"
            onClick={() => setMainTab("feedback")}
            className={cn(tabBase, mainTab === "feedback" ? tabActive : tabIdle)}
          >
            {t("tabFeedback")}
          </button>
        </div>
        <h2 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
          {mainTab === "inquiry" ? t("formTitle") : t("formTitleFeedback")}
        </h2>
      </div>

      <div className="mt-6">
        {mainTab === "feedback" ? (
          <ContactFeedbackSurvey />
        ) : (
          <ContactInquiryForm />
        )}
      </div>
    </div>
  );
}
