"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import {
  fetchMediaApplicationUploadSign,
  uploadToCloudinary,
  type PhotoSlot,
} from "@/lib/media-application-upload";

type Props = {
  slot: PhotoSlot;
  label: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
};

export function PhotoSlotUpload({
  slot,
  label,
  hint,
  value,
  onChange,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("12MB 이하 이미지를 사용해 주세요.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const sign = await fetchMediaApplicationUploadSign();
      const url = await uploadToCloudinary(file, sign);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border-2 border-black bg-card p-4 shadow-[4px_4px_0_0_rgb(0,0,0)]">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF6600]">
        {label}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="mt-3 flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-black/30 bg-muted/40 transition-colors hover:border-[#FF6600] disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6600]" />
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
              {slot}
            </span>
          </>
        )}
      </button>
      {error ? (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
