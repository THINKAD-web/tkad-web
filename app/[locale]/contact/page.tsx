"use client";

import dynamic from "next/dynamic";
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
import { Mail, MapPin, Phone, Clock, CheckCircle, Train, Bus, ParkingCircle, MessageCircle, MessageSquare, ClipboardList } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import Spinner from "@/components/spinner";
import { useToast } from "@/components/toast-provider";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import { getMediaById, type MediaItem } from "@/lib/media-data";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

const ScrollAnimate = dynamic(() => import("@/components/scroll-animate"));
const ScrollStagger = dynamic(() =>
  import("@/components/scroll-stagger").then((m) => ({
    default: m.ScrollStagger,
  })),
);
const ContactFeedbackSurvey = dynamic(() =>
  import("@/components/contact-feedback-survey").then((m) => ({
    default: m.ContactFeedbackSurvey,
  })),
);

type ContactMainTab = "inquiry" | "feedback";

type FormFields = {
  company: string;
  name: string;
  phone: string;
  email: string;
  budget: string;
  message: string;
  website: string; // honeypot
};

type FormErrors = Partial<Record<keyof FormFields, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\-+() ]{8,}$/;
const CASE_CUID_RE = /^c[a-z0-9]{24,}$/i;

function validate(form: FormFields): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "이름을 입력해 주세요.";
  if (!form.phone.trim()) {
    errors.phone = "연락처를 입력해 주세요.";
  } else if (!PHONE_RE.test(form.phone)) {
    errors.phone = "올바른 연락처 형식이 아닙니다.";
  }
  if (!form.email.trim()) {
    errors.email = "이메일을 입력해 주세요.";
  } else if (!EMAIL_RE.test(form.email)) {
    errors.email = "올바른 이메일 형식이 아닙니다.";
  }
  if (!form.message.trim()) errors.message = "문의 내용을 입력해 주세요.";
  return errors;
}

export default function ContactPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isKo = locale === "ko";
  const searchParams = useSearchParams();
  const caseSlug = searchParams.get("case");
  const [publishedCaseRef, setPublishedCaseRef] = useState<{
    id: string;
    titleKo: string;
    titleEn: string | null;
  } | null>(null);
  const casePrefillDone = useRef<string | null>(null);
  const academyTopic = searchParams.get("topic") === "academy";
  const academyPrefillDone = useRef(false);
  const mediaIdParam = searchParams.get("media");
  const mediaPrefillDone = useRef(false);

  const [form, setForm] = useState<FormFields>({
    company: "",
    name: "",
    phone: "",
    email: "",
    budget: "",
    message: "",
    website: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormFields, boolean>>>({});
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState<ContactMainTab>("inquiry");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    casePrefillDone.current = null;
  }, [caseSlug]);

  useEffect(() => {
    academyPrefillDone.current = false;
  }, [academyTopic]);

  useEffect(() => {
    mediaPrefillDone.current = false;
  }, [mediaIdParam]);

  useEffect(() => {
    if (!mediaIdParam || mediaPrefillDone.current) return;
    const idKey = mediaIdParam.trim();
    if (!idKey) return;

    const applySnippet = (refMedia: MediaItem) => {
      mediaPrefillDone.current = true;
      const title = isKo ? refMedia.name : refMedia.nameEn;
      const snippet = isKo
        ? `매체 "${title}" (ID ${refMedia.id}) 관련 문의드립니다.\n`
        : `Inquiry regarding media "${title}" (ID ${refMedia.id}).\n`;
      setForm((prev) => {
        if (prev.message.trim() !== "") return prev;
        return { ...prev, message: snippet };
      });
    };

    const fromStatic = getMediaById(idKey);
    if (fromStatic) {
      applySnippet(fromStatic);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/public/media-catalog");
        if (!res.ok || cancelled) return;
        const catalog = (await res.json()) as MediaItem[];
        const refMedia = catalog.find((m) => m.id === idKey);
        if (!refMedia || cancelled) return;
        applySnippet(refMedia);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mediaIdParam, isKo]);

  useEffect(() => {
    if (!caseSlug || !CASE_CUID_RE.test(caseSlug)) {
      setPublishedCaseRef(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/public/success-cases/${caseSlug}`);
        if (!res.ok || cancelled) {
          if (!cancelled) setPublishedCaseRef(null);
          return;
        }
        const j = (await res.json()) as {
          id: string;
          titleKo: string;
          titleEn: string | null;
        };
        if (!cancelled) setPublishedCaseRef(j);
      } catch {
        if (!cancelled) setPublishedCaseRef(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseSlug]);

  useEffect(() => {
    if (!caseSlug) casePrefillDone.current = null;
  }, [caseSlug]);

  useEffect(() => {
    if (!publishedCaseRef) return;
    if (casePrefillDone.current === publishedCaseRef.id) return;
    casePrefillDone.current = publishedCaseRef.id;
    const title = isKo
      ? publishedCaseRef.titleKo
      : publishedCaseRef.titleEn ?? publishedCaseRef.titleKo;
    const snippet = t("contact.caseRefMessageTemplate", { title });
    setForm((prev) => {
      if (prev.message.trim() !== "") return prev;
      return { ...prev, message: snippet };
    });
  }, [publishedCaseRef, isKo, t]);

  useEffect(() => {
    if (caseSlug || !academyTopic || academyPrefillDone.current) return;
    academyPrefillDone.current = true;
    const snippet = t("contact.academyRefMessageTemplate");
    setForm((prev) => {
      if (prev.message.trim() !== "") return prev;
      return { ...prev, message: snippet };
    });
  }, [caseSlug, academyTopic, t]);

  const updateField = useCallback((field: keyof FormFields, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      setErrors((prevErrors) => {
        const fieldErrors = validate(next);
        return { ...prevErrors, [field]: fieldErrors[field] };
      });
      return next;
    });
  }, []);

  const handleBlur = useCallback((field: keyof FormFields) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const fieldErrors = validate(form);
    setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allTouched: typeof touched = {};
    for (const key of Object.keys(form) as (keyof FormFields)[]) {
      allTouched[key] = true;
    }
    setTouched(allTouched);

    const validationErrors = validate(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      toast("warning", "필수 항목을 모두 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok && !form.website) {
        throw new Error("submit failed");
      }
      setSubmitted(true);
      toast("success", "문의가 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.");
    } catch {
      toast("error", "일시적 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (field: keyof FormFields) =>
    touched[field] && errors[field] ? (
      <p className="mt-1 text-xs font-medium text-red-500">{errors[field]}</p>
    ) : null;

  const inputErrorClass = (field: keyof FormFields) =>
    touched[field] && errors[field] ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "";

  return (
    <>
      <section className="bg-navy py-28">
        <ScrollAnimate className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {t("contact.title")}
          </h1>
          <p className="mt-2 text-slate-300">{t("contact.subtitle")}</p>
        </ScrollAnimate>
      </section>

      <section className="py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollStagger className="grid gap-12 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <Card className="shadow-md">
                <CardHeader className="space-y-4">
                  <div className="flex flex-wrap gap-2 rounded-xl bg-slate-100/80 p-1">
                    <button
                      type="button"
                      onClick={() => setMainTab("inquiry")}
                      className={cn(
                        "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors min-w-[140px]",
                        mainTab === "inquiry"
                          ? "bg-white text-navy shadow-sm"
                          : "text-muted-foreground hover:text-navy",
                      )}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0 text-gold" />
                      {t("contact.tabInquiry")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMainTab("feedback")}
                      className={cn(
                        "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors min-w-[140px]",
                        mainTab === "feedback"
                          ? "bg-white text-navy shadow-sm"
                          : "text-muted-foreground hover:text-navy",
                      )}
                    >
                      <ClipboardList className="h-4 w-4 shrink-0 text-gold" />
                      {t("contact.tabFeedback")}
                    </button>
                  </div>
                  <CardTitle className="text-xl text-navy">
                    {mainTab === "inquiry"
                      ? t("contact.formTitle")
                      : t("contact.formTitleFeedback")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mainTab === "feedback" ? (
                    <ContactFeedbackSurvey />
                  ) : submitted ? (
                    <div className="flex flex-col items-center gap-4 py-12 text-center">
                      <CheckCircle className="h-12 w-12 text-green-500" />
                      <p className="text-lg font-semibold text-navy">
                        문의가 접수되었습니다.
                      </p>
                      <p className="text-muted-foreground">
                        빠른 시일 내에 연락드리겠습니다.
                      </p>

                      <div className="mt-4 w-full max-w-sm rounded-xl border border-yellow-200 bg-[#FEE500]/10 p-5">
                        <div className="flex items-center justify-center gap-2 text-sm font-bold text-yellow-800">
                          <MessageCircle className="h-5 w-5" />
                          카카오톡 채널 추가하면 빠른 답변!
                        </div>
                        <p className="mt-2 text-xs text-yellow-700/70">
                          카카오톡 채널을 추가하시면 문의 진행 상황을 실시간으로 받아보실 수 있습니다.
                        </p>
                        <a
                          href={KAKAO_CHANNEL_PUBLIC_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-neutral-800 transition-colors hover:brightness-95"
                          style={{ backgroundColor: "#FEE500" }}
                        >
                          <MessageCircle className="h-4 w-4" />
                          카카오톡 채널 추가
                        </a>
                      </div>
                    </div>
                  ) : (
                    <form className="relative space-y-5" onSubmit={handleSubmit} noValidate>
                      {publishedCaseRef ? (
                        <div className="rounded-xl border border-gold/35 bg-gradient-to-br from-gold/15 to-amber-50/80 p-4 text-sm text-navy">
                          <p className="font-medium leading-relaxed">
                            {t("contact.caseRefBanner")}
                          </p>
                          <p className="mt-1 text-xs text-navy/65">
                            {isKo
                              ? publishedCaseRef.titleKo
                              : publishedCaseRef.titleEn ??
                                publishedCaseRef.titleKo}
                          </p>
                          <Link
                            href={`/cases/${publishedCaseRef.id}`}
                            className="mt-3 inline-flex text-xs font-bold text-gold-dark underline-offset-4 hover:underline"
                          >
                            {t("contact.caseRefViewCase")}
                          </Link>
                        </div>
                      ) : academyTopic ? (
                        <div className="rounded-xl border border-navy/15 bg-gradient-to-br from-navy/[0.06] to-gold/10 p-4 text-sm text-navy">
                          <p className="font-medium leading-relaxed">
                            {t("contact.academyRefBanner")}
                          </p>
                          <Link
                            href="/academy"
                            className="mt-3 inline-flex text-xs font-bold text-gold-dark underline-offset-4 hover:underline"
                          >
                            {t("contact.academyRefBack")}
                          </Link>
                        </div>
                      ) : null}
                      <div className="absolute -left-[9999px]" aria-hidden="true" tabIndex={-1}>
                        <label htmlFor="website">Website</label>
                        <input
                          type="text"
                          id="website"
                          name="website"
                          value={form.website}
                          onChange={(e) => updateField("website", e.target.value)}
                          tabIndex={-1}
                          autoComplete="off"
                        />
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-navy">
                            {t("contact.company")}
                          </label>
                          <Input
                            placeholder={t("contact.companyPlaceholder")}
                            value={form.company}
                            onChange={(e) => updateField("company", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-navy">
                            {t("contact.name")} <span className="text-red-500">*</span>
                          </label>
                          <Input
                            placeholder={t("contact.namePlaceholder")}
                            value={form.name}
                            onChange={(e) => updateField("name", e.target.value)}
                            onBlur={() => handleBlur("name")}
                            className={inputErrorClass("name")}
                          />
                          {fieldError("name")}
                        </div>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-navy">
                            {t("contact.phone")} <span className="text-red-500">*</span>
                          </label>
                          <Input
                            placeholder={t("contact.phonePlaceholder")}
                            value={form.phone}
                            onChange={(e) => updateField("phone", e.target.value)}
                            onBlur={() => handleBlur("phone")}
                            className={inputErrorClass("phone")}
                          />
                          {fieldError("phone")}
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-navy">
                            {t("contact.email")} <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="email"
                            placeholder={t("contact.emailPlaceholder")}
                            value={form.email}
                            onChange={(e) => updateField("email", e.target.value)}
                            onBlur={() => handleBlur("email")}
                            className={inputErrorClass("email")}
                          />
                          {fieldError("email")}
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-navy">
                          {t("contact.budget")}
                        </label>
                        <select
                          className="w-full rounded-md border px-3 py-2 text-sm"
                          value={form.budget}
                          onChange={(e) => updateField("budget", e.target.value)}
                        >
                          <option value="">{t("contact.budgetPlaceholder")}</option>
                          <option value="under1000">1,000만원 이하</option>
                          <option value="1000to3000">1,000~3,000만원</option>
                          <option value="3000to5000">3,000~5,000만원</option>
                          <option value="over5000">5,000만원 이상</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-navy">
                          {t("contact.message")} <span className="text-red-500">*</span>
                        </label>
                        <Textarea
                          rows={5}
                          placeholder={t("contact.messagePlaceholder")}
                          value={form.message}
                          onChange={(e) => updateField("message", e.target.value)}
                          onBlur={() => handleBlur("message")}
                          className={inputErrorClass("message")}
                        />
                        {fieldError("message")}
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-gold text-navy hover:bg-gold-dark font-semibold"
                        size="lg"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Spinner className="mr-2" />
                            전송 중...
                          </>
                        ) : (
                          t("contact.submitButton")
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>

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
                      <div className="text-sm font-medium text-navy">Address</div>
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
                      <div className="text-sm font-medium text-navy">Phone</div>
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
                      <div className="text-sm font-medium text-navy">Email</div>
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
          </ScrollStagger>
        </div>
      </section>

      <section className="bg-slate-50 py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-bold text-navy sm:text-3xl">
            {t("contact.directionsTitle")}
          </h2>

          <Card className="overflow-hidden shadow-md">
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

            <CardContent className="grid gap-6 p-6 sm:grid-cols-3">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5">
                  <Train className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-navy">
                    {t("contact.subway")}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("contact.subwayDesc")}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5">
                  <Bus className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-navy">
                    {t("contact.busTitle")}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("contact.busDesc")}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5">
                  <ParkingCircle className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-navy">
                    {t("contact.parkingTitle")}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("contact.parkingDesc")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
