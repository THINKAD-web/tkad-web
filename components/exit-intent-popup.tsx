"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale } from "next-intl";
import { PhoneCall, Gift, ArrowRight } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { Link } from "@/i18n/navigation";
import Modal from "@/components/ui/modal";

const STORAGE_KEY = "tkad-exit-intent-last-shown-date";

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ExitIntentPopup() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [show, setShow] = useState(false);

  const dismiss = useCallback(() => {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, todayKey());
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const last = localStorage.getItem(STORAGE_KEY);
      if (last && last === todayKey()) return;
    } catch {}

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY > 0) return;
      setShow(true);
      try {
        localStorage.setItem(STORAGE_KEY, todayKey());
      } catch {}
    };

    document.addEventListener("mouseout", handleMouseLeave);
    return () => document.removeEventListener("mouseout", handleMouseLeave);
  }, []);

  return (
    <Modal
      open={show}
      onClose={dismiss}
      ariaLabel={isKo ? "특별 혜택 안내" : "Special offer"}
      className="max-w-[560px] rounded-none border-2 border-border"
    >
      <div className="bg-card">
        <div className="border-b-2 border-border bg-hero-void px-6 py-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            [ FREE CONSULTATION ]
          </p>
        </div>

        <div className="grid gap-0 md:grid-cols-[220px_1fr]">
          <div className="border-b-2 border-border bg-muted p-6 md:border-b-0 md:border-r-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center border-2 border-border bg-card">
                <Gift className="h-6 w-6 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  [ BONUS ]
                </p>
                <p className="mt-1 text-sm font-bold text-foreground">
                  {isKo ? "OOH 전략 리포트" : "OOH Strategy Report"}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {isKo
                ? "상담 신청 시, 선택하신 조건 기반으로 리포트를 제공합니다."
                : "Request a consult to receive a report based on your inputs."}
            </p>
          </div>

          <div className="p-6">
            <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
              {isKo ? "떠나시기 전, 잠깐!" : "Wait, before you go!"}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {isKo
                ? "무료 상담을 신청하시면 맞춤형 OOH 광고 전략 리포트를 무료로 제공해 드립니다."
                : "Request a free consultation and receive a customized OOH advertising strategy report at no cost."}
            </p>

            <div className="mt-6 flex flex-wrap gap-0">
              <Link href="/contact" onClick={dismiss} className="w-full sm:w-auto">
                <BtnBlock className="w-full sm:w-auto">
                  <PhoneCall className="h-4 w-4" />
                  {isKo ? "무료 상담 신청하기" : "Request Free Consultation"}
                  <ArrowRight className="h-4 w-4" />
                </BtnBlock>
              </Link>
              <button
                type="button"
                onClick={dismiss}
                className="-ml-[2px] w-full border-2 border-border bg-card px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background sm:w-auto"
              >
                {isKo ? "다음에 할게요" : "Maybe later"}
              </button>
            </div>

            <p className="mt-4 font-mono text-[10px] tracking-tight text-muted-foreground">
              {`// `}{isKo ? "하루에 한 번만 노출됩니다." : "Shown once per day."}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
