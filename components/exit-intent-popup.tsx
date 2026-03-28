"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale } from "next-intl";
import { PhoneCall, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import Modal from "@/components/ui/modal";

const STORAGE_KEY = "tkad-exit-intent-dismissed";

export default function ExitIntentPopup() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [show, setShow] = useState(false);

  const dismiss = useCallback(() => {
    setShow(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {}

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) setShow(true);
    };

    document.addEventListener("mouseout", handleMouseLeave);
    return () => document.removeEventListener("mouseout", handleMouseLeave);
  }, []);

  return (
    <Modal
      open={show}
      onClose={dismiss}
      ariaLabel={isKo ? "특별 혜택 안내" : "Special offer"}
      className="max-w-md"
    >
      <div className="p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
            <Gift className="h-8 w-8 text-gold" />
          </div>

          <h3 className="text-xl font-bold text-navy">
            {isKo
              ? "떠나시기 전, 잠깐!"
              : "Wait, before you go!"}
          </h3>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {isKo
              ? "무료 상담을 신청하시면 맞춤형 OOH 광고 전략 리포트를 무료로 제공해 드립니다."
              : "Request a free consultation and receive a customized OOH advertising strategy report at no cost."}
          </p>

          <Link href="/contact" className="mt-6 w-full" onClick={dismiss}>
            <Button
              size="lg"
              className="h-14 w-full rounded-xl bg-gold text-base font-bold text-navy hover:bg-gold-dark"
            >
              <PhoneCall className="mr-2 h-5 w-5" />
              {isKo ? "무료 상담 신청하기" : "Request Free Consultation"}
            </Button>
          </Link>

          <button
            onClick={dismiss}
            className="mt-3 text-sm text-muted-foreground hover:text-navy"
          >
            {isKo ? "괜찮습니다, 다음에 할게요" : "No thanks, maybe later"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
