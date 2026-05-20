import type { ReactNode } from "react";
import "../globals.css";

export default function OfflineLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="theme-color" content="#020202" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="m-0 bg-[#020202] text-white antialiased">{children}</body>
    </html>
  );
}
