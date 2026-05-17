"use client";

import { CONTACT_EMAIL } from "@/lib/constants";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import ScrollAnimate from "@/components/scroll-animate";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import ContactInquiryForm from "@/components/contact-inquiry-form";
import { ContactFeedbackSurvey } from "@/components/contact-feedback-survey";

const OFFICE_MAP_LAT = 37.5407427;
const OFFICE_MAP_LNG = 127.0595201;

function officeMapEmbedSrc(hl: string) {
  return `https://maps.google.com/maps?q=${OFFICE_MAP_LAT}%2C${OFFICE_MAP_LNG}&z=18&hl=${encodeURIComponent(hl)}&output=embed`;
}

type MainTab = "inquiry" | "feedback";

export function ContactNeonClient() {
  const t = useTranslations("contact");
  const locale = useLocale();
  const isKo = locale === "ko";
  const mapHl = locale === "en" ? "en" : "ko";

  const [mainTab, setMainTab] = useState<MainTab>("inquiry");

  const tabBase =
    "inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold backdrop-blur transition-all";

  const tabActive =
    "border-violet-500/40 bg-gradient-to-r from-violet-500/25 to-cyan-400/20 text-white shadow-[0_8px_32px_rgba(139,92,246,0.25)]";
  const tabIdle = "text-white/70 hover:border-white/20 hover:bg-white/10";

  const infoItems = useMemo(
    () => [
      { label: "PHONE", value: t("phoneNumber") },
      { label: "EMAIL", value: CONTACT_EMAIL },
      { label: "ADDRESS", value: t("address") },
      { label: "HOURS", value: t("hours") },
    ],
    [t],
  );

  return (
    <>
      <NeonSection>
        <ScrollAnimate>
          <NeonSectionHead
            number="01"
            kicker={isKo ? "Contact" : "Contact"}
            title={
              isKo ? (
                <>
                  30초 상담 신청,{" "}
                  <span className="tkad-home-accent-text">24시간 내</span> 연락
                </>
              ) : (
                <>
                  Apply in 30s, hear back{" "}
                  <span className="tkad-home-accent-text">within 24h</span>
                </>
              )
            }
            meta={isKo ? "free consultation · verified inventory" : "free consultation · verified inventory"}
          />
        </ScrollAnimate>

        <div className="mt-10 grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
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
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                  [ {mainTab === "inquiry" ? "INQUIRY" : "FEEDBACK"} ]
                </p>
                <h2 className="text-xl font-black tracking-tight text-white">
                  {mainTab === "inquiry" ? t("formTitle") : t("formTitleFeedback")}
                </h2>
              </div>

              <div className="mt-6">
                {mainTab === "feedback" ? <ContactFeedbackSurvey /> : <ContactInquiryForm />}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                [ INFO ]
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-white">
                {t("infoTitle")}
              </h3>
              <div className="mt-6 space-y-4">
                {infoItems.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white/85">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                  {t("directionsTitle")}
                </p>
                <div className="mt-2 space-y-2 text-sm text-white/80">
                  <p>
                    <span className="font-semibold text-white">{t("subway")}</span>{" "}
                    <span className="text-white/70">{t("subwayDesc")}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-white">{t("busTitle")}</span>{" "}
                    <span className="text-white/70">{t("busDesc")}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-white">{t("parkingTitle")}</span>{" "}
                    <span className="text-white/70">{t("parkingDesc")}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </NeonSection>

      <NeonSection className="pt-0">
        <ScrollAnimate>
          <NeonSectionHead
            number="02"
            kicker={isKo ? "Location" : "Location"}
            title={isKo ? "오시는 길" : "Directions"}
            meta={isKo ? "Seoul · Seongsu" : "Seoul · Seongsu"}
          />
        </ScrollAnimate>

        <div className="mt-10 overflow-hidden rounded-[28px] bg-white/5 backdrop-blur tkad-neon-border tkad-neon-glow">
          <div className="aspect-video w-full border-b border-white/10">
            <iframe
              title={isKo ? "THINKAD 오피스 위치" : "THINKAD office location"}
              src={officeMapEmbedSrc(mapHl)}
              className="h-full w-full border-0 grayscale"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="grid gap-0 sm:grid-cols-3">
            <div className="border-b border-white/10 p-5 sm:border-b-0 sm:border-r sm:border-white/10">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                [ {t("subway")} ]
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">{t("subwayDesc")}</p>
            </div>
            <div className="border-b border-white/10 p-5 sm:border-b-0 sm:border-r sm:border-white/10">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                [ {t("busTitle")} ]
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">{t("busDesc")}</p>
            </div>
            <div className="p-5">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                [ {t("parkingTitle")} ]
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">{t("parkingDesc")}</p>
            </div>
          </div>
        </div>
      </NeonSection>
    </>
  );
}

