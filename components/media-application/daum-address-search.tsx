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

  const inputCls =
    "min-w-0 flex-1 h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40";

  return (
    <div className="space-y-2">
      <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">
        {isKo ? "주소" : "Address"}
      </span>
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          readOnly
          value={value}
          placeholder={isKo ? "주소 검색 버튼을 눌러주세요" : "Search address"}
          className={inputCls}
        />
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => void openSearch()}
          className="tkad-neon-cta-clean shrink-0 rounded-xl px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white disabled:opacity-50"
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
          className="relative z-50 overflow-hidden rounded-2xl border border-white/12 bg-[#0a0a0f] shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
          style={{ height: 420 }}
        >
          <button
            type="button"
            className="absolute right-2 top-2 z-10 rounded-lg border border-white/15 bg-white/10 px-2 py-1 font-mono text-[10px] font-bold text-white"
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
