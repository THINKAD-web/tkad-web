"use client";

import { useCallback, useEffect, useState } from "react";
import Image, { type ImageProps } from "next/image";
import {
  bunnyCdnToProxyFallback,
  resolveCatalogImageSrc,
  shouldUseUnoptimizedImage,
} from "@/lib/optimized-image-url";

type Props = Omit<ImageProps, "src" | "onError" | "unoptimized"> & {
  /** 원본 URL (CDN·프록시·상대경로) */
  rawSrc: string;
  onFallbackFailed?: () => void;
};

/**
 * Bunny CDN 직링크 표시 + 로드 실패 시 /api/bunny-media 프록시로 1회 재시도.
 */
export function BunnyFallbackImage({
  rawSrc,
  onFallbackFailed,
  ...props
}: Props) {
  const resolved = resolveCatalogImageSrc(rawSrc);
  const [displaySrc, setDisplaySrc] = useState(
    () => resolved?.src ?? rawSrc.trim(),
  );
  const [unoptimized, setUnoptimized] = useState(
    () => resolved?.unoptimized ?? shouldUseUnoptimizedImage(rawSrc),
  );

  useEffect(() => {
    const next = resolveCatalogImageSrc(rawSrc);
    setDisplaySrc(next?.src ?? rawSrc.trim());
    setUnoptimized(next?.unoptimized ?? shouldUseUnoptimizedImage(rawSrc));
  }, [rawSrc]);

  const onError = useCallback(() => {
    const fallback = bunnyCdnToProxyFallback(displaySrc);
    if (fallback) {
      setDisplaySrc(fallback);
      setUnoptimized(true);
      return;
    }
    onFallbackFailed?.();
  }, [displaySrc, onFallbackFailed]);

  if (!displaySrc) return null;

  return (
    <Image
      {...props}
      src={displaySrc}
      unoptimized={unoptimized}
      onError={onError}
    />
  );
}
