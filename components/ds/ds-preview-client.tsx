"use client";

import { useState } from "react";
import { AppButton } from "@/components/ds/app-button";
import { AppLoading } from "@/components/ds/app-loading";
import { PageContainer } from "@/components/layout/page-container";

export function DsPreviewClient({ isKo }: { isKo: boolean }) {
  const [loadingBtn, setLoadingBtn] = useState(false);

  return (
    <PageContainer>
      <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--qp-fg-muted)]">
        [ DS W0 ]
      </p>
      <h1 className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
        {isKo ? "AppButton · AppLoading" : "AppButton · AppLoading"}
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-white/55">
        {isKo
          ? "STEP2 통합 컴포넌트 프리뷰 — 로그인 사용자만 접근"
          : "STEP2 unified components — signed-in users only"}
      </p>

      <section className="mt-10 space-y-4">
        <h2 className="text-sm font-bold text-gray-800 dark:text-white">AppButton</h2>
        <div className="flex flex-wrap gap-3">
          <AppButton variant="primary">{isKo ? "Primary" : "Primary"}</AppButton>
          <AppButton variant="secondary">{isKo ? "Secondary" : "Secondary"}</AppButton>
          <AppButton variant="ghost">{isKo ? "Ghost" : "Ghost"}</AppButton>
          <AppButton variant="danger">{isKo ? "Danger" : "Danger"}</AppButton>
          <AppButton variant="link">{isKo ? "Link" : "Link"}</AppButton>
          <AppButton variant="block" size="sm">
            Block sm
          </AppButton>
        </div>
        <div className="flex flex-wrap gap-3">
          <AppButton
            loading={loadingBtn}
            onClick={() => {
              setLoadingBtn(true);
              window.setTimeout(() => setLoadingBtn(false), 1200);
            }}
          >
            {isKo ? "로딩 토글" : "Toggle loading"}
          </AppButton>
          <AppButton href="/my/plan" variant="secondary">
            {isKo ? "Link href" : "Link href"}
          </AppButton>
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-sm font-bold text-gray-800 dark:text-white">AppLoading</h2>
        <div className="rounded-2xl border border-gray-200 dark:border-white/12">
          <AppLoading mode="inline" label={isKo ? "인라인" : "Inline"} />
          <AppLoading mode="section" label={isKo ? "섹션" : "Section"} />
        </div>
      </section>
    </PageContainer>
  );
}
