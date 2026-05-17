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
      setError("Images only / 이미지 파일만");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("Max 12MB / 12MB 이하");
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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
        {label}
      </p>
      <p className="mt-1 text-xs text-white/55">{hint}</p>
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
        className="mt-3 flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-white/20 bg-white/5 transition-colors hover:border-violet-500/40 hover:bg-white/8 disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            <ImagePlus className="h-8 w-8 text-white/45" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
              {slot}
            </span>
          </>
        )}
      </button>
      {error ? (
        <p className="mt-2 text-xs text-rose-300">{error}</p>
      ) : null}
    </div>
  );
}
