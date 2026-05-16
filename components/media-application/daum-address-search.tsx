"use client";

import { useEffect, useRef, useState } from "react";

export type DaumAddressResult = {
  address: string;
  zonecode: string;
  city: string;
  district: string;
};

type DaumPostcodeData = {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  sido: string;
  sigungu: string;
};

type DaumPostcodeCtor = new (opts: {
  oncomplete: (data: DaumPostcodeData) => void;
  width?: string | number;
  height?: string | number;
}) => { embed: (el: HTMLElement) => void };

declare global {
  interface Window {
    daum?: {
      Postcode: DaumPostcodeCtor;
    };
  }
}

const SCRIPT_SRC =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

function loadDaumPostcode(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.daum?.Postcode) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject());
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Daum postcode script failed"));
    document.head.appendChild(s);
  });
}

type Props = {
  isKo: boolean;
  value: string;
  onChange: (v: DaumAddressResult) => void;
  disabled?: boolean;
};

export function DaumAddressSearch({ isKo, value, onChange, disabled }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const openSearch = async () => {
    if (disabled) return;
    setLoading(true);
    try {
      await loadDaumPostcode();
      setOpen(true);
      requestAnimationFrame(() => {
        const el = layerRef.current;
        const Postcode = window.daum?.Postcode;
        if (!el || !Postcode) return;
        el.innerHTML = "";
        new Postcode({
          oncomplete: (data) => {
            const address = data.roadAddress || data.jibunAddress;
            onChange({
              address,
              zonecode: data.zonecode,
              city: data.sido,
              district: data.sigungu,
            });
            setOpen(false);
          },
          width: "100%",
          height: "100%",
        }).embed(el);
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open && layerRef.current) {
      layerRef.current.innerHTML = "";
    }
  }, [open]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          readOnly
          value={value}
          placeholder={isKo ? "주소 검색 버튼을 눌러주세요" : "Search address"}
          className="min-w-0 flex-1 border-2 border-black bg-card px-3 py-2 font-mono text-sm"
        />
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => void openSearch()}
          className="shrink-0 border-2 border-black bg-[#FF6600] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white disabled:opacity-50"
        >
          {loading
            ? isKo
              ? "로딩…"
              : "Loading…"
            : isKo
              ? "주소 검색"
              : "Search"}
        </button>
      </div>
      {open ? (
        <div
          className="relative z-50 overflow-hidden border-2 border-black bg-card shadow-[6px_6px_0_0_rgb(0,0,0)]"
          style={{ height: 420 }}
        >
          <button
            type="button"
            className="absolute right-2 top-2 z-10 border border-black bg-white px-2 py-1 font-mono text-[10px] font-bold"
            onClick={() => setOpen(false)}
          >
            {isKo ? "닫기" : "Close"}
          </button>
          <div ref={layerRef} className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}
