"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, MapPin, Phone, Clock } from "lucide-react";

export default function ContactPage() {
  const t = useTranslations();

  return (
    <>
      <section className="bg-navy py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {t("contact.title")}
          </h1>
          <p className="mt-2 text-slate-300">{t("contact.subtitle")}</p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-5">
            {/* Form */}
            <div className="lg:col-span-3">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl text-navy">
                    {t("contact.formTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    className="space-y-5"
                    onSubmit={(e) => e.preventDefault()}
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-navy">
                          {t("contact.company")}
                        </label>
                        <Input placeholder={t("contact.companyPlaceholder")} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-navy">
                          {t("contact.name")}
                        </label>
                        <Input placeholder={t("contact.namePlaceholder")} />
                      </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-navy">
                          {t("contact.phone")}
                        </label>
                        <Input placeholder={t("contact.phonePlaceholder")} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-navy">
                          {t("contact.email")}
                        </label>
                        <Input
                          type="email"
                          placeholder={t("contact.emailPlaceholder")}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-navy">
                        {t("contact.budget")}
                      </label>
                      <select className="w-full rounded-md border px-3 py-2 text-sm">
                        <option value="">{t("contact.budgetPlaceholder")}</option>
                        <option value="under1000">1,000만원 이하</option>
                        <option value="1000to3000">1,000~3,000만원</option>
                        <option value="3000to5000">3,000~5,000만원</option>
                        <option value="over5000">5,000만원 이상</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-navy">
                        {t("contact.message")}
                      </label>
                      <Textarea
                        rows={5}
                        placeholder={t("contact.messagePlaceholder")}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gold text-navy hover:bg-gold-dark font-semibold"
                      size="lg"
                    >
                      {t("contact.submitButton")}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Info */}
            <div className="lg:col-span-2">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl text-navy">
                    {t("contact.infoTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5">
                      <MapPin className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-navy">
                        Address
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("contact.address")}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5">
                      <Phone className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-navy">
                        Phone
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("contact.phoneNumber")}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5">
                      <Mail className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-navy">
                        Email
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("contact.emailAddress")}
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
                        {t("contact.hours")}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
