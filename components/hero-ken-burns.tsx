"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * 히어로 배경 — 3~5장 이미지를 교대로 보여주며 각 이미지에 Ken Burns(미세 줌+팬)
 * 효과를 입힌다.
 *
 * - 모바일: 첫 장만 표시 (데이터 절약, autoplay 미디어 정책 회피)
 * - prefers-reduced-motion: 줌/팬 애니 비활성화 + 한 장만 정적 표시
 * - 이미지는 Unsplash 플레이스홀더 — 운영팀이 Cloudinary 업로드 URL 로 교체하면
 *   됩니다. (영상 에셋이 준비되면 `<video>` 로 교체 고려)
 */

type HeroImage = {
  src: string;
  alt: string;
  /** tailwind translateOrigin 과 animation variant — image 별 다른 Ken Burns 궤적 */
  variant: "tl" | "tr" | "bl" | "br" | "center";
};

const HERO_IMAGES: HeroImage[] = [
  {
    src: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920&q=80&auto=format&fit=crop",
    alt: "Seoul cityscape at night",
    variant: "center",
  },
  {
    src: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=1920&q=80&auto=format&fit=crop",
    alt: "Gangnam district digital billboards",
    variant: "tr",
  },
  {
    src: "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?w=1920&q=80&auto=format&fit=crop",
    alt: "Downtown Seoul neon signage",
    variant: "bl",
  },
];

const DISPLAY_MS = 6_500; // 각 이미지 노출 시간
const FADE_MS = 1_200; // 교차 페이드 지속 시간

export default function HeroKenBurns() {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mob = window.matchMedia("(max-width: 767px)");
    setReduceMotion(prm.matches);
    setIsMobile(mob.matches);
    const onPrm = () => setReduceMotion(prm.matches);
    const onMob = () => setIsMobile(mob.matches);
    prm.addEventListener("change", onPrm);
    mob.addEventListener("change", onMob);
    return () => {
      prm.removeEventListener("change", onPrm);
      mob.removeEventListener("change", onMob);
    };
  }, []);

  useEffect(() => {
    // 모바일·저감 환경에서는 슬라이드 비활성화 (첫 장만)
    if (isMobile || reduceMotion) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_IMAGES.length);
    }, DISPLAY_MS);
    return () => clearInterval(t);
  }, [isMobile, reduceMotion]);

  const visibleImages =
    isMobile || reduceMotion ? HERO_IMAGES.slice(0, 1) : HERO_IMAGES;

  return (
    <>
      {/* 이미지 레이어 — 교차 페이드 + Ken Burns */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {visibleImages.map((img, i) => {
          const isActive = i === index || visibleImages.length === 1;
          return (
            <div
              key={img.src}
              aria-hidden
              className="absolute inset-0 transition-opacity ease-out"
              style={{
                opacity: isActive ? 1 : 0,
                transitionDuration: `${FADE_MS}ms`,
              }}
            >
              <div
                className={
                  reduceMotion
                    ? "absolute inset-0"
                    : `absolute inset-0 kb kb-${img.variant}`
                }
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className="object-cover"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 다크 그라디언트 오버레이 (텍스트 가독성) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-navy/80 via-navy/70 to-[#040914]/92"
      />

      {/* 추가 accent overlay — 기존 스타일 유지 */}
      <div
        className="pointer-events-none absolute inset-0 z-[2] hero-radial-accent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[2] hero-radial-cta"
        aria-hidden
      />
    </>
  );
}
