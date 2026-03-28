"use client";

import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";

export default function NewsletterForm() {
  const locale = useLocale();
  const isKo = locale === "ko";

  return (
    <form
      className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
      onSubmit={(e) => e.preventDefault()}
    >
      <input
        type="email"
        required
        placeholder={isKo ? "이메일 주소를 입력하세요" : "Enter your email address"}
        className="h-12 flex-1 rounded-full border border-white/20 bg-white/10 px-5 text-sm text-white placeholder:text-slate-400 backdrop-blur-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 sm:max-w-sm"
      />
      <Button
        type="submit"
        size="lg"
        className="h-12 rounded-full bg-gold px-8 font-bold text-navy hover:bg-gold-dark"
      >
        {isKo ? "구독하기" : "Subscribe"}
      </Button>
    </form>
  );
}
