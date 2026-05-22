"use client";

import { CONTACT_EMAIL } from "@/lib/constants";
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

  const tabBase =
    "-mt-[2px] -ml-[2px] inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 border-2 px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors";

  return (
    <>
      <section className="bg-muted/40 py-20 sm:py-24">
        <div className="ui-container">
          <div className="grid gap-0 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div className="border-2 border-border bg-card shadow-sm">
                <div className="space-y-4 border-b-2 border-border p-5">
                  <div className="flex flex-wrap gap-0">
                    <button
                      type="button"
                      onClick={() => setMainTab("inquiry")}
                      className={cn(
                        tabBase,
                        mainTab === "inquiry"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-muted",
                      )}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      {t("tabInquiry")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMainTab("feedback")}
                      className={cn(
                        tabBase,
                        mainTab === "feedback"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-muted",
                      )}
                    >
                      <ClipboardList className="h-4 w-4 shrink-0" />
                      {t("tabFeedback")}
                    </button>
                  </div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                    [ {mainTab === "inquiry" ? "INQUIRY" : "FEEDBACK"} ]
                  </p>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
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
              <div className="border-2 border-border bg-card shadow-sm">
                <div className="border-b-2 border-border p-5">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                    [ INFO ]
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground">
                    {t("infoTitle")}
                  </h2>
                </div>
                <div className="space-y-0 p-0">
                  <div className="flex gap-3 border-b-2 border-border p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-primary text-primary-foreground">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                        ADDRESS
                      </div>
                      <div className="mt-1 text-sm text-foreground">
                        {t("address")}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 border-b-2 border-border p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-primary text-primary-foreground">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                        PHONE
                      </div>
                      <div className="mt-1 font-mono tabular-nums text-sm text-foreground">
                        {t("phoneNumber")}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 border-b-2 border-border p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-primary text-primary-foreground">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                        EMAIL
                      </div>
                      <div className="mt-1 font-mono text-sm text-foreground">
                        {CONTACT_EMAIL}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-primary text-primary-foreground">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                        HOURS
                      </div>
                      <div className="mt-1 text-sm text-foreground">
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

      <section className="bg-background py-20 sm:py-24">
        <div className="ui-container">
          <p className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            [ DIRECTIONS ]
          </p>
          <h2 className="mt-3 mb-10 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("directionsTitle")}
          </h2>

          <div className="overflow-hidden border-2 border-border bg-card shadow-sm">
            <div className="aspect-video w-full border-b-2 border-border">
              <iframe
                title="THINKAD — 서울특별시 성동구 뚝섬로17가길 48 성수에이원지식산업센터 1102호"
                src={officeMapEmbedSrc(mapHl)}
                className="h-full w-full border-0 grayscale"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="grid gap-0 sm:grid-cols-3">
              <div className="flex gap-3 border-r-0 border-border p-5 sm:border-r-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-primary text-primary-foreground">
                  <Train className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                    [ {t("subway")} ]
                  </div>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed tracking-tight text-muted-foreground">
                    {t("subwayDesc")}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 border-y-2 border-border p-5 sm:border-x-0 sm:border-y-0 sm:border-r-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-primary text-primary-foreground">
                  <Bus className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                    [ {t("busTitle")} ]
                  </div>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed tracking-tight text-muted-foreground">
                    {t("busDesc")}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-primary text-primary-foreground">
                  <ParkingCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                    [ {t("parkingTitle")} ]
                  </div>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed tracking-tight text-muted-foreground">
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
