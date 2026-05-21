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
    <div className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 p-4 backdrop-blur">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] dark:text-white text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-xs dark:text-white text-gray-500">{hint}</p>
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
        className="mt-3 flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed dark:border-white/20 border-gray-300 dark:bg-white/5 bg-gray-50 transition-colors hover:border-violet-500/40 hover:dark:bg-white/8 bg-gray-100 disabled:opacity-50"
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
            <ImagePlus className="h-8 w-8 dark:text-white" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] dark:text-white text-gray-500">
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
