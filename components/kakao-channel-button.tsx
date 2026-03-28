"use client";

import { useLocale } from "next-intl";
import { MessageCircle } from "lucide-react";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";

export default function KakaoChannelButton() {
  const locale = useLocale();
  const isKo = locale === "ko";

  return (
    <div className="group fixed bottom-6 right-4 z-50">
      <a
        href={KAKAO_CHANNEL_PUBLIC_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="relative flex h-12 w-12 items-center justify-center"
        aria-label={isKo ? "카카오톡 상담" : "Kakao Chat"}
      >
        <span
          className="absolute inset-0 rounded-full bg-[#FEE500] opacity-40 animate-ping"
          aria-hidden
        />
        <span
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE500] shadow-lg transition-transform hover:scale-110"
        >
          <MessageCircle className="h-6 w-6 text-[#191919]" strokeWidth={2} />
        </span>
        <span
          className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg bg-navy px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100"
          role="tooltip"
        >
          {isKo ? "카카오톡 상담" : "Kakao Chat"}
        </span>
      </a>
    </div>
  );
}
