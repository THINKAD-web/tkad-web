"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function FloatingCta() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent =
        window.scrollY /
        (document.documentElement.scrollHeight - window.innerHeight);
      setVisible(scrollPercent >= 0.8);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in-up">
      <Link href="/contact" aria-label={isKo ? "무료 상담 신청하기" : "Request Free Consultation"}>
        <Button
          size="lg"
          className="h-14 rounded-full bg-gold px-8 text-base font-bold text-navy shadow-2xl shadow-gold/30 hover:bg-gold-dark hover:shadow-gold/40"
        >
          <PhoneCall className="mr-2 h-5 w-5" />
          {isKo ? "무료 상담 신청하기" : "Request Free Consultation"}
        </Button>
      </Link>
    </div>
  );
}
