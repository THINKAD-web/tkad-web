import { QuoteContractCta } from "@/components/quote/quote-contract-cta";
import { QuoteStatusTimeline } from "@/components/quote/quote-status-timeline";

export const metadata = {
  title: "Contract CTA preview",
  robots: { index: false, follow: false },
};

/** QA / 스크린샷 — 전자계약 CTA·타임라인 미리보기 */
export default function QuoteContractUiPreviewPage() {
  const mockId = "clmock000000000000000000";

  return (
    <main className="mx-auto max-w-2xl space-y-10 bg-background px-4 py-10">
      <section>
        <h2 className="mb-4 text-sm font-bold text-muted-foreground">
          타임라인 · 부킹 확정 + 서명 대기
        </h2>
        <div className="border-2 border-border bg-card p-5">
          <QuoteStatusTimeline
            status="booking_confirmed"
            contractSigned={false}
          />
        </div>
        <QuoteContractCta
          quoteId={mockId}
          status="booking_confirmed"
          contractSigned={false}
          canSignContract
        />
      </section>

      <section>
        <h2 className="mb-4 text-sm font-bold text-muted-foreground">
          타임라인 · 서명 완료 + 청구 단계
        </h2>
        <div className="border-2 border-border bg-card p-5">
          <QuoteStatusTimeline
            status="booking_confirmed"
            contractSigned
          />
        </div>
        <QuoteContractCta
          quoteId={mockId}
          status="booking_confirmed"
          contractSigned
          canSignContract={false}
        />
      </section>
    </main>
  );
}
