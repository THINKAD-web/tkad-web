"use client";

import { useState, useCallback } from "react";
import { Link2, MessageCircle, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type ShareButtonsProps = {
  url: string;
  title: string;
  description?: string;
  locale?: string;
};

export default function ShareButtons({
  url,
  title,
  description,
  locale = "ko",
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
    const kakaoUrl = `https://story.kakao.com/share?url=${encodeURIComponent(fullUrl)}`;
    window.open(kakaoUrl, "_blank", "width=600,height=400,noopener,noreferrer");
  }, [fullUrl]);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title, text: description ?? title, url: fullUrl });
    } catch {
      // user cancelled
    }
  }, [title, description, fullUrl]);

  const supportsNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleKakaoShare}
        className="gap-1.5 rounded-full border-yellow-300 bg-[#FEE500]/10 text-sm font-medium text-yellow-800 hover:bg-[#FEE500]/30"
      >
        <MessageCircle className="h-4 w-4" />
        {isKo ? "카카오톡" : "KakaoTalk"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyLink}
        className="gap-1.5 rounded-full text-sm font-medium"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-emerald-500" />
            {isKo ? "복사됨!" : "Copied!"}
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4" />
            {isKo ? "링크 복사" : "Copy Link"}
          </>
        )}
      </Button>

      {supportsNativeShare && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleNativeShare}
          className="gap-1.5 rounded-full text-sm font-medium"
        >
          <Share2 className="h-4 w-4" />
          {isKo ? "공유" : "Share"}
        </Button>
      )}

      {copied && (
        <span className="animate-fade-in-up text-xs font-medium text-emerald-600">
          {isKo ? "링크가 복사되었습니다!" : "Link copied to clipboard!"}
        </span>
      )}
    </div>
  );
}
