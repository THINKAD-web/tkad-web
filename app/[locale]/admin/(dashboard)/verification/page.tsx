// app/[locale]/admin/(dashboard)/verification/page.tsx
// 설명: Admin 검증 큐 페이지. 매체 Approve/Reject/Review 처리
// 주요 기능:
//   - 상태 필터 (pending/review/verified/rejected)
//   - 매체 카드 + 썸네일 + visibilityScore 배지
//   - Approve / Reject / 보류 + 관리자 메모 입력

import { Suspense } from "react";
import VerificationQueueClient from "./verification-queue-client";

export const dynamic = "force-dynamic";

export default function AdminVerificationPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-foreground">매체 검증 큐</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          4단계 현장 검증 대기·심사 상태. 승인 시 Verified 배지가 광고주 화면에 노출됩니다.
        </p>
      </header>
      <Suspense fallback={<div className="text-sm text-muted-foreground">불러오는 중…</div>}>
        <VerificationQueueClient />
      </Suspense>
    </div>
  );
}
