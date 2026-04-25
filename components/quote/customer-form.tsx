"use client";

import { useEffect, useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Spinner from "@/components/spinner";
import { cn } from "@/lib/utils";
import { useQuoteStore } from "@/lib/quote/store";
import {
  customerSchema,
  type QuoteCustomerErrorKey,
  type QuoteCustomerFormParsed,
  type QuoteCustomerFormValues,
} from "@/lib/quote/customer-schema";
import type { QuoteCustomerInfo } from "@/lib/quote/types";

type Props = {
  /** 검증 통과 후 부모로 정규화된 customer 페이로드 전달. 부모가 API 호출 담당. */
  onSubmit: (customer: QuoteCustomerInfo) => Promise<void> | void;
  /** 부모(API 호출 중) 가 disable 토글. */
  loading: boolean;
  /** 봇 차단용 honeypot 토글 — 부모는 별도 store/local state 로 관리. */
  honeypot: string;
  setHoneypot: (v: string) => void;
};

export function QuoteCustomerForm({
  onSubmit,
  loading,
  honeypot,
  setHoneypot,
}: Props) {
  const t = useTranslations("quote");
  const tErr = useTranslations("quote.customer.errors");
  const customer = useQuoteStore((s) => s.customer);
  const updateCustomer = useQuoteStore((s) => s.updateCustomer);

  // store 의 customer 를 RHF defaultValues 로 사용. 사용자 입력은 onChange 마다 store 에 동기화.
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<QuoteCustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: useMemo<QuoteCustomerFormValues>(
      () => ({
        company: customer.company,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        businessNumber: customer.businessNumber ?? "",
        address: customer.address ?? "",
        position: customer.position ?? "",
        message: customer.message ?? "",
      }),
      // 마운트 시점만 — 이후 store 갱신은 RHF reset 으로는 처리하지 않음(사용자 입력 우선)
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    ),
    mode: "onBlur",
  });

  // 입력 → store 양방향 동기화 (draftSavedAt 자동 갱신).
  useEffect(() => {
    const sub = watch((values) => {
      updateCustomer({
        company: values.company ?? "",
        name: values.name ?? "",
        email: values.email ?? "",
        phone: values.phone ?? "",
        businessNumber: values.businessNumber || undefined,
        address: values.address || undefined,
        position: values.position || undefined,
        message: values.message || undefined,
      });
    });
    return () => sub.unsubscribe();
  }, [watch, updateCustomer]);

  const submit: SubmitHandler<QuoteCustomerFormValues> = async (raw) => {
    const parsed = customerSchema.parse(raw) as QuoteCustomerFormParsed;
    const payload: QuoteCustomerInfo = {
      company: parsed.company,
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      businessNumber: parsed.businessNumber,
      address: parsed.address,
      position: parsed.position,
      message: parsed.message,
    };
    await onSubmit(payload);
  };

  function fieldError(
    key: keyof QuoteCustomerFormValues,
  ): string | null {
    const m = errors[key]?.message;
    if (!m) return null;
    return tErr(m as QuoteCustomerErrorKey);
  }

  function inputCls(key: keyof QuoteCustomerFormValues): string {
    return errors[key]
      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
      : "";
  }

  return (
    <form
      className="relative space-y-5"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      {/* honeypot — 화면에 안 보임. */}
      <div className="absolute -left-[9999px]" aria-hidden="true" tabIndex={-1}>
        <label htmlFor="quote-website">Website</label>
        <input
          type="text"
          id="quote-website"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="quote-company"
          label={t("company")}
          required
          error={fieldError("company")}
        >
          <Input
            id="quote-company"
            placeholder={t("companyPlaceholder")}
            className={inputCls("company")}
            {...register("company")}
          />
        </Field>
        <Field
          id="quote-name"
          label={t("name")}
          required
          error={fieldError("name")}
        >
          <Input
            id="quote-name"
            placeholder={t("namePlaceholder")}
            className={inputCls("name")}
            {...register("name")}
          />
        </Field>
        <Field
          id="quote-phone"
          label={t("phone")}
          required
          error={fieldError("phone")}
        >
          <Input
            id="quote-phone"
            placeholder={t("phonePlaceholder")}
            className={inputCls("phone")}
            {...register("phone")}
          />
        </Field>
        <Field
          id="quote-email"
          label={t("email")}
          required
          error={fieldError("email")}
        >
          <Input
            id="quote-email"
            type="email"
            placeholder={t("emailPlaceholder")}
            className={inputCls("email")}
            {...register("email")}
          />
        </Field>
        <Field
          id="quote-biz"
          label={t("customer.businessNumber")}
          hint={t("customer.businessNumberHint")}
          error={fieldError("businessNumber")}
        >
          <Input
            id="quote-biz"
            placeholder="123-45-67890"
            className={inputCls("businessNumber")}
            {...register("businessNumber")}
          />
        </Field>
        <Field
          id="quote-position"
          label={t("customer.position")}
          error={fieldError("position")}
        >
          <Input
            id="quote-position"
            className={inputCls("position")}
            {...register("position")}
          />
        </Field>
      </div>

      <Field
        id="quote-address"
        label={t("customer.address")}
        error={fieldError("address")}
      >
        <Input
          id="quote-address"
          className={inputCls("address")}
          {...register("address")}
        />
      </Field>

      <Field
        id="quote-message"
        label={t("message")}
        error={fieldError("message")}
      >
        <Textarea
          id="quote-message"
          rows={4}
          placeholder={t("messagePlaceholder")}
          className={cn(inputCls("message"))}
          {...register("message")}
        />
      </Field>

      <Button
        type="submit"
        className="w-full bg-gold font-semibold text-navy hover:bg-gold-dark"
        size="lg"
        disabled={loading}
      >
        {loading ? (
          <>
            <Spinner className="mr-2" />
            {t("submitting")}
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            {t("submit")}
          </>
        )}
      </Button>
    </form>
  );
}

/* ────────────────── Field wrapper ────────────────── */

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  error: string | null;
  children: React.ReactNode;
};

function Field({ id, label, hint, required, error, children }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-navy"
      >
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-500">{error}</p>
      ) : null}
    </div>
  );
}
