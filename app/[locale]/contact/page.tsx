import { Suspense } from "react";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import ContactPage from "./contact-client";

/** Bypass ISR cache — always serve fresh content for the contact page. */
export const dynamic = "force-dynamic";

export default async function ContactPageWrapper({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";

  return (
    <Suspense fallback={<FormSkeleton isKo={isKo} />}>
      <ContactPage />
    </Suspense>
  );
}

/** Visible skeleton fallback — shows while the client component hydrates. */
function FormSkeleton({ isKo }: { isKo: boolean }) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:py-20">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {isKo ? "문의하기" : "Contact"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isKo ? "THINKAD에 문의해주세요" : "Get in touch with THINKAD"}
        </p>
      </div>
      <div className="grid gap-10 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h2 className="mb-6 text-xl font-semibold text-foreground">
              {isKo ? "무료 상담 신청" : "Free Consultation"}
            </h2>
            <div className="space-y-5">
              {/* 이름 */}
              <div>
                <div className="mb-1.5 text-sm font-medium text-foreground">
                  {isKo ? "이름" : "Name"} <span className="text-destructive">*</span>
                </div>
                <div className="h-9 w-full rounded-md border border-input bg-muted/30 animate-pulse" />
              </div>
              {/* 연락처 */}
              <div>
                <div className="mb-1.5 text-sm font-medium text-foreground">
                  {isKo ? "연락처" : "Phone"} <span className="text-destructive">*</span>
                </div>
                <div className="h-9 w-full rounded-md border border-input bg-muted/30 animate-pulse" />
              </div>
              {/* 문의 유형 */}
              <div>
                <div className="mb-1.5 text-sm font-medium text-foreground">
                  {isKo ? "문의 유형" : "Inquiry Type"}
                </div>
                <div className="h-9 w-full rounded-md border border-input bg-muted/30 animate-pulse" />
              </div>
              {/* 예상 예산 */}
              <div>
                <div className="mb-1.5 text-sm font-medium text-foreground">
                  {isKo ? "예상 예산" : "Budget"}
                </div>
                <div className="h-9 w-full rounded-md border border-input bg-muted/30 animate-pulse" />
              </div>
              {/* 문의 내용 */}
              <div>
                <div className="mb-1.5 text-sm font-medium text-foreground">
                  {isKo ? "문의내용" : "Message"} <span className="text-destructive">*</span>
                </div>
                <div className="h-24 w-full rounded-md border border-input bg-muted/30 animate-pulse" />
              </div>
              {/* submit button skeleton */}
              <div className="h-11 w-full rounded-lg bg-cta/60 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              {isKo ? "연락처 정보" : "Contact Info"}
            </h3>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>02-515-2772</p>
              <p>mannote@tkad.co.kr</p>
              <p>
                {isKo
                  ? "서울특별시 성동구 뚝섬로17가길 48 성수에이원지식산업센터 1102호"
                  : "48, Ttukseom-ro 17ga-gil, Seongdong-gu, Seoul"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
