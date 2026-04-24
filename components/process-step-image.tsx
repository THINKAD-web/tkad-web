"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";

/**
 * 검증 프로세스 단계별 현장 사진. `public/images/process/step-*.jpg` 가 존재하면
 * 이미지를, 없으면 placeholder 를 렌더한다. Next/Image 는 파일 존재 여부를
 * 알 수 없으므로 <img onError> 로 런타임 폴백.
 */
export function ProcessStepImage({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center text-navy/20"
        aria-hidden
      >
        <ImageIcon className="h-8 w-8" strokeWidth={1.25} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
