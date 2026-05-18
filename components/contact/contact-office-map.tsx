"use client";

export const OFFICE_MAP_LAT = 37.5407427;
export const OFFICE_MAP_LNG = 127.0595201;

function officeMapEmbedSrc(hl: string) {
  return `https://maps.google.com/maps?q=${OFFICE_MAP_LAT}%2C${OFFICE_MAP_LNG}&z=18&hl=${encodeURIComponent(hl)}&output=embed`;
}

/** 오피스 네온 핀 — `kakao-map-view` office 타입과 동일 팔레트 */
function ContactOfficeNeonPin() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={44}
      height={52}
      viewBox="0 0 44 52"
      role="img"
      aria-hidden
      className="block"
    >
      <defs>
        <linearGradient id="officeRing" x1="10" y1="10" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="1" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="1" stopColor="#a855f7" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient
          id="officeCap"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(22 16) rotate(90) scale(18 18)"
        >
          <stop offset="0" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <path
        d="M22 51C31 39 36 30.5 36 22.5C36 12.85 29.15 5 22 5C14.85 5 8 12.85 8 22.5C8 30.5 13 39 22 51Z"
        fill="#a855f7"
        stroke="rgba(0,0,0,0.22)"
        strokeWidth="2"
      />
      <path
        d="M14 14c3.5-5 8.5-7.2 13.2-6.1c1 .25 1.5 1.35.95 2.2c-1.8 2.8-5.2 4.6-9.1 4.9c-2.2.18-4 .98-5.2 2.4c-.7.8-2 .5-1.95-.4c.06-1.0.6-2.1 2.1-3.0Z"
        fill="rgba(255,255,255,0.10)"
      />
      <circle cx="22" cy="18" r="16" fill="url(#officeCap)" />
      <circle cx="22" cy="22" r="12.2" fill="rgba(0,0,0,0.12)" stroke="url(#officeRing)" strokeWidth="3" />
      <circle cx="22" cy="22" r="9.3" fill="rgba(255,255,255,0.96)" />
      <text
        x="22"
        y="27.2"
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        fontSize="14"
        fontWeight="950"
        fill="#0a0a0c"
      >
        T
      </text>
      <circle cx="28.2" cy="16.8" r="1.2" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}

type Props = {
  mapHl: string;
  title: string;
};

/** Google Maps 흑백 임베드 + 네온 오피스 핀 오버레이 */
export function ContactOfficeMap({ mapHl, title }: Props) {
  return (
    <div className="relative h-full w-full">
      <iframe
        title={title}
        src={officeMapEmbedSrc(mapHl)}
        className="h-full w-full border-0 grayscale"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full"
        aria-hidden
      >
        <ContactOfficeNeonPin />
      </div>
    </div>
  );
}
