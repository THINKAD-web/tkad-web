"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
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

type MainTab = "inquiry" | "feedback";

export default function ContactPageContent() {
  const t = useTranslations("contact");
  const [mainTab, setMainTab] = useState<MainTab>("inquiry");

  return (
    <>
      <section className="py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div className="rounded-xl border border-slate-200 bg-white shadow-md">
                <div className="space-y-4 border-b border-slate-100 p-6">
                  <div className="flex flex-wrap gap-2 rounded-xl bg-slate-100/80 p-1">
                    <button
                      type="button"
                      onClick={() => setMainTab("inquiry")}
                      className={cn(
                        "inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                        mainTab === "inquiry"
                          ? "bg-white text-navy shadow-sm"
                          : "text-slate-500 hover:text-navy",
                      )}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0 text-gold" />
                      {t("tabInquiry")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMainTab("feedback")}
                      className={cn(
                        "inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                        mainTab === "feedback"
                          ? "bg-white text-navy shadow-sm"
                          : "text-slate-500 hover:text-navy",
                      )}
                    >
                      <ClipboardList className="h-4 w-4 shrink-0 text-gold" />
                      {t("tabFeedback")}
                    </button>
                  </div>
                  <h2 className="text-xl font-semibold text-navy">
                    {mainTab === "inquiry"
                      ? t("formTitle")
                      : t("formTitleFeedback")}
                  </h2>
                </div>
                <div className="p-6 pt-2">
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

            <div className="lg:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-white shadow-md">
                <div className="border-b border-slate-100 p-6">
                  <h2 className="text-xl font-semibold text-navy">
                    {t("infoTitle")}
                  </h2>
                </div>
                <div className="space-y-6 p-6">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5">
                      <MapPin className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-navy">Address</div>
                      <div className="text-sm text-muted-foreground">
                        {t("address")}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5">
                      <Phone className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-navy">Phone</div>
                      <div className="text-sm text-muted-foreground">
                        {t("phoneNumber")}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5">
                      <Mail className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-navy">Email</div>
                      <div className="text-sm text-muted-foreground">
                        {t("emailAddress")}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5">
                      <Clock className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-navy">Hours</div>
                      <div className="text-sm text-muted-foreground">
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

      <section className="bg-slate-50 py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-bold text-navy sm:text-3xl">
            {t("directionsTitle")}
          </h2>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
            <div className="aspect-video w-full">
              <iframe
                title="THINKAD Office Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3163.5!2d127.056!3d37.5445!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357ca4e3db3e19fb%3A0x1c5a6d1ef2a1c0d0!2z7ISx7IiY7JeQ7J207JuQ7KeA7Iud7IKw7JeF7IS87YSw!5e0!3m2!1sko!2skr!4v1700000000000"
                className="h-full w-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="grid gap-6 p-6 sm:grid-cols-3">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5">
                  <Train className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-navy">
                    {t("subway")}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("subwayDesc")}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5">
                  <Bus className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-navy">
                    {t("busTitle")}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("busDesc")}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5">
                  <ParkingCircle className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-navy">
                    {t("parkingTitle")}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
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
