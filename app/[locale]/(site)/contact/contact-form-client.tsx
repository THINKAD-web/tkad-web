"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import ScrollAnimate from "@/components/scroll-animate";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import ContactInquiryForm from "@/components/contact-inquiry-form";
import { ContactFeedbackSurvey } from "@/components/contact-feedback-survey";
import { ContactOfficeMap } from "@/components/contact/contact-office-map";

type MainTab = "inquiry" | "feedback";

export function ContactFormClient() {
  const t = useTranslations("contact");
  const locale = useLocale();
  const isKo = locale === "ko";
  const mapHl = locale === "en" ? "en" : "ko";
  const [mainTab, setMainTab] = useState<MainTab>("inquiry");

  const tabBase =
    "inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 px-4 py-3 text-sm font-semibold backdrop-blur transition-ui";

  const tabActive =
    "border-[color:var(--qp-accent)]/40 bg-[color:var(--qp-accent-soft)] dark:text-white text-gray-900 shadow-sm";
  const tabIdle = "dark:text-white text-gray-600 hover:dark:border-white/20 border-gray-300 hover:dark:bg-white/10 bg-gray-100";

  const extraInfoItems = useMemo(
    () => [{ label: "HOURS", value: t("hours") }],
    [t],
  );

  return (
    <>
      <NeonSection tone="qp" className="pt-0">
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 p-6 backdrop-blur sm:p-8">
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
                <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-500">
                  [ {mainTab === "inquiry" ? "INQUIRY" : "FEEDBACK"} ]
                </p>
                <h2 className="text-xl font-black tracking-tight dark:text-white text-gray-900">
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
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 p-6 backdrop-blur sm:p-8">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-500">
                [ INFO ]
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight dark:text-white text-gray-900">
                {t("infoTitle")}
              </h3>
              <div className="mt-6 space-y-4">
                {extraInfoItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/6 bg-gray-50 px-4 py-3"
                  >
                    <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-500">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold dark:text-white text-gray-800">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 px-4 py-3">
                <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-500">
                  {t("directionsTitle")}
                </p>
                <div className="mt-2 space-y-2 text-sm dark:text-white text-gray-700">
                  <p>
                    <span className="font-semibold dark:text-white text-gray-900">{t("subway")}</span>{" "}
                    <span className="dark:text-white text-gray-600">{t("subwayDesc")}</span>
                  </p>
                  <p>
                    <span className="font-semibold dark:text-white text-gray-900">{t("busTitle")}</span>{" "}
                    <span className="dark:text-white text-gray-600">{t("busDesc")}</span>
                  </p>
                  <p>
                    <span className="font-semibold dark:text-white text-gray-900">{t("parkingTitle")}</span>{" "}
                    <span className="dark:text-white text-gray-600">{t("parkingDesc")}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </NeonSection>

      <NeonSection tone="qp" className="pt-0">
        <ScrollAnimate>
          <NeonSectionHead
            number="02"
            kicker={isKo ? "Location" : "Location"}
            title={isKo ? "오시는 길" : "Directions"}
            meta={isKo ? "Seoul · Seongsu" : "Seoul · Seongsu"}
          />
        </ScrollAnimate>

        <div className="mt-10 overflow-hidden rounded-[28px] border border-gray-200 dark:border-white/10 dark:bg-white/5 bg-gray-50 backdrop-blur">
          <div className="aspect-video w-full border-b dark:border-white/10 border-gray-200">
            <ContactOfficeMap
              mapHl={mapHl}
              title={isKo ? "THINKAD 오피스 위치" : "THINKAD office location"}
            />
          </div>
          <div className="grid gap-0 sm:grid-cols-3">
            <div className="border-b dark:border-white/10 border-gray-200 p-5 sm:border-b-0 sm:border-r sm:dark:border-white/10">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-500">
                [ {t("subway")} ]
              </p>
              <p className="mt-2 text-sm leading-relaxed dark:text-white text-gray-700">{t("subwayDesc")}</p>
            </div>
            <div className="border-b dark:border-white/10 border-gray-200 p-5 sm:border-b-0 sm:border-r sm:dark:border-white/10">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-500">
                [ {t("busTitle")} ]
              </p>
              <p className="mt-2 text-sm leading-relaxed dark:text-white text-gray-700">{t("busDesc")}</p>
            </div>
            <div className="p-5">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-500">
                [ {t("parkingTitle")} ]
              </p>
              <p className="mt-2 text-sm leading-relaxed dark:text-white text-gray-700">{t("parkingDesc")}</p>
            </div>
          </div>
        </div>
      </NeonSection>
    </>
  );
}
