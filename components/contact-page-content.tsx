"use client";

import { Suspense, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bus,
  ClipboardList,
  Clock,
  Mail,
  MapPin,
  MessageSquare,
  ParkingCircle,
  Phone,
  Train,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ContactInquiryForm from "@/components/contact-inquiry-form";
import { ContactFeedbackSurvey } from "@/components/contact-feedback-survey";

/** 뚝섬로17가길 48 (성수에이원지식산업센터) — 지도 핀은 도로 주소·건물 위치 기준 (OSM/Nominatim) */
const OFFICE_MAP_LAT = 37.5407427;
const OFFICE_MAP_LNG = 127.0595201;

function officeMapEmbedSrc(hl: string) {
  return `https://maps.google.com/maps?q=${OFFICE_MAP_LAT}%2C${OFFICE_MAP_LNG}&z=18&hl=${encodeURIComponent(hl)}&output=embed`;
}

type MainTab = "inquiry" | "feedback";

export default function ContactPageContent() {
  const t = useTranslations("contact");
  const locale = useLocale();
  const mapHl = locale === "en" ? "en" : "ko";
  const [mainTab, setMainTab] = useState<MainTab>("inquiry");

  return (
    <>
      <section className="bg-bx-off py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-0 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div className="border-2 border-bx-black bg-bx-white">
                <div className="space-y-4 border-b-2 border-bx-black p-5">
                  <div className="flex flex-wrap gap-0">
                    <button
                      type="button"
                      onClick={() => setMainTab("inquiry")}
                      className={cn(
                        "-mt-[2px] -ml-[2px] inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 border-2 px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                        mainTab === "inquiry"
                          ? "border-bx-accent bg-bx-accent text-bx-white"
                          : "border-bx-black bg-bx-white text-bx-black hover:bg-bx-off",
                      )}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      {t("tabInquiry")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMainTab("feedback")}
                      className={cn(
                        "-mt-[2px] -ml-[2px] inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 border-2 px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                        mainTab === "feedback"
                          ? "border-bx-accent bg-bx-accent text-bx-white"
                          : "border-bx-black bg-bx-white text-bx-black hover:bg-bx-off",
                      )}
                    >
                      <ClipboardList className="h-4 w-4 shrink-0" />
                      {t("tabFeedback")}
                    </button>
                  </div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                    [ {mainTab === "inquiry" ? "INQUIRY" : "FEEDBACK"} ]
                  </p>
                  <h2 className="text-xl font-bold tracking-tight text-bx-black">
                    {mainTab === "inquiry"
                      ? t("formTitle")
                      : t("formTitleFeedback")}
                  </h2>
                </div>
                <div className="p-5">
                  {mainTab === "feedback" ? (
                    <ContactFeedbackSurvey />
                  ) : (
                    <Suspense fallback={null}>
                      <ContactInquiryForm />
                    </Suspense>
                  )}
                </div>
              </div>
            </div>

            <div className="-ml-[2px] lg:col-span-2 lg:mt-0">
              <div className="border-2 border-bx-black bg-bx-white">
                <div className="border-b-2 border-bx-black p-5">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                    [ INFO ]
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-bx-black">
                    {t("infoTitle")}
                  </h2>
                </div>
                <div className="space-y-0 p-0">
                  <div className="flex gap-3 border-b-2 border-bx-black p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-bx-black bg-bx-accent text-bx-white">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                        ADDRESS
                      </div>
                      <div className="mt-1 text-sm text-bx-black">
                        {t("address")}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 border-b-2 border-bx-black p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-bx-black bg-bx-accent text-bx-white">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                        PHONE
                      </div>
                      <div className="mt-1 font-mono tabular-nums text-sm text-bx-black">
                        {t("phoneNumber")}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 border-b-2 border-bx-black p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-bx-black bg-bx-accent text-bx-white">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                        EMAIL
                      </div>
                      <div className="mt-1 font-mono text-sm text-bx-black">
                        {t("emailAddress")}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-bx-black bg-bx-accent text-bx-white">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                        HOURS
                      </div>
                      <div className="mt-1 text-sm text-bx-black">
                        {t("hours")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-bx-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ DIRECTIONS ]
          </p>
          <h2 className="mt-3 mb-10 text-center text-2xl font-bold tracking-tight text-bx-black sm:text-3xl">
            {t("directionsTitle")}
          </h2>

          <div className="overflow-hidden border-2 border-bx-black bg-bx-white">
            <div className="aspect-video w-full border-b-2 border-bx-black">
              <iframe
                title="THINKAD — 서울 성동구 뚝섬로17가길 48 성수에이원지식산업센터 1102호"
                src={officeMapEmbedSrc(mapHl)}
                className="h-full w-full border-0 grayscale"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="grid gap-0 sm:grid-cols-3">
              <div className="flex gap-3 border-r-0 border-bx-black p-5 sm:border-r-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-bx-black bg-bx-accent text-bx-white">
                  <Train className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                    [ {t("subway")} ]
                  </div>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed tracking-tight text-bx-gray-dim">
                    {t("subwayDesc")}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 border-y-2 border-bx-black p-5 sm:border-x-0 sm:border-y-0 sm:border-r-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-bx-black bg-bx-accent text-bx-white">
                  <Bus className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                    [ {t("busTitle")} ]
                  </div>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed tracking-tight text-bx-gray-dim">
                    {t("busDesc")}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-bx-black bg-bx-accent text-bx-white">
                  <ParkingCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                    [ {t("parkingTitle")} ]
                  </div>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed tracking-tight text-bx-gray-dim">
                    {t("parkingDesc")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
