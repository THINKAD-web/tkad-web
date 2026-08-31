"use client";

import { useState, useCallback } from "react";
import { Link2, MessageCircle, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";

type ShareButtonsProps = {
  url: string;
  title: string;
  description?: string;
  locale?: string;
  /** 카드 등 좁은 영역용 작은 버튼 */
  compact?: boolean;
};

export default function ShareButtons({
  url,
  title,
  description,
  locale = "ko",
  compact = false,
}: ShareButtonsProps) {
  const isKo = locale === "ko";
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}${url}`
    : url;

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = fullUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [fullUrl]);

  const handleKakaoShare = useCallback(() => {
    window.open(KAKAO_CHANNEL_PUBLIC_URL, "_blank", "noopener,noreferrer");
  }, []);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title, text: description ?? title, url: fullUrl });
    } catch {
      // user cancelled
    }
  }, [title, description, fullUrl]);

  const supportsNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const iconSm = compact ? "size-3.5 shrink-0" : "size-5 shrink-0";

  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-center gap-1.5"
          : "flex flex-wrap items-center gap-2.5"
      }
    >
      <Button
        variant="outline"
        size={compact ? "xs" : "lg"}
        onClick={handleKakaoShare}
        title={isKo ? "카카오톡" : "KakaoTalk"}
        className={
          compact
            ? "h-7 min-h-7 gap-1 rounded-full border-yellow-300/80 bg-[#FEE500]/10 px-2.5 tkad-type-caption font-semibold text-yellow-900 hover:bg-[#FEE500]/25"
            : "h-11 min-h-11 gap-2 rounded-full border-yellow-300 bg-[#FEE500]/10 px-5 text-base font-semibold text-yellow-800 hover:bg-[#FEE500]/30"
        }
      >
        <MessageCircle className={iconSm} />
        {isKo ? "카카오톡" : "KakaoTalk"}
      </Button>

      <Button
        variant="outline"
        size={compact ? "xs" : "lg"}
        onClick={handleCopyLink}
        title={isKo ? "링크 복사" : "Copy link"}
        className={
          compact
            ? "h-7 min-h-7 gap-1 rounded-full px-2.5 tkad-type-caption font-semibold"
            : "h-11 min-h-11 gap-2 rounded-full px-5 text-base font-semibold"
        }
      >
        {copied ? (
          <>
            <Check className={`${iconSm} text-emerald-500`} />
            {isKo ? "복사됨" : "Copied"}
          </>
        ) : (
          <>
            <Link2 className={iconSm} />
            {isKo ? "링크 복사" : "Copy"}
          </>
        )}
      </Button>

      {supportsNativeShare && (
        <Button
          variant="outline"
          size={compact ? "xs" : "lg"}
          onClick={handleNativeShare}
          title={isKo ? "공유" : "Share"}
          className={
            compact
              ? "h-7 min-h-7 gap-1 rounded-full px-2.5 tkad-type-caption font-semibold"
              : "h-11 min-h-11 gap-2 rounded-full px-5 text-base font-semibold"
          }
        >
          <Share2 className={iconSm} />
          {isKo ? "공유" : "Share"}
        </Button>
      )}

      {copied && (
        <span
          className={
            compact
              ? "w-full tkad-type-note font-medium text-emerald-600"
              : "animate-fade-in-up text-xs font-medium text-emerald-600"
          }
        >
          {isKo ? "링크가 복사되었습니다!" : "Link copied to clipboard!"}
        </span>
      )}
    </div>
  );
}
