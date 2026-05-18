"use client";

import { NeonErrorPage } from "@/components/public-chrome/neon-error-page";

export default function RootNotFound() {
  return (
    <html lang="ko">
      <body className="m-0 bg-[#05050a] antialiased">
        <NeonErrorPage
          code="404"
          eyebrow="[ NOT FOUND ]"
          title="페이지를 찾을 수 없습니다"
          description="요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다. · The page may have been removed or the URL may have changed."
          homeHref="/ko"
          homeLabel="한국어 홈"
          secondaryHref="/en"
          secondaryLabel="English home"
          className="min-h-screen"
        />
      </body>
    </html>
  );
}
