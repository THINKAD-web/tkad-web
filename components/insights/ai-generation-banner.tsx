import { Sparkles } from "lucide-react";

/**
 * AI 자동 생성 안내 배너 (PR-5).
 * 자동 발행된 트렌드 리포트 상세 페이지 상단에 노출 — 신뢰도·투명성 확보.
 *
 * 의도:
 *   - 사용자가 "AI 양산 콘텐츠"가 아닌 "AI 보조 + 자체 검증 + 출처 명시" 임을 즉시 인지
 *   - 잘못된 정보 발견 시 신고할 수 있는 장치 (mailto)
 */
export function AiGenerationBanner() {
  return (
    <aside
      role="note"
      aria-label="AI 자동 생성 안내"
      className="flex items-start gap-3 rounded-xl border border-navy/10 bg-gradient-to-br from-slate-50 to-white p-4 text-sm shadow-sm"
    >
      <Sparkles
        className="mt-0.5 h-5 w-5 shrink-0 text-gold"
        aria-hidden
      />
      <div className="space-y-1">
        <p className="font-bold text-navy">AI 분석 리포트</p>
        <p className="leading-relaxed text-navy/75">
          이 리포트는 AI 가 검증된 자료를 바탕으로 자동 작성한 후 자체 검증
          (팩트·법적·톤·SEO 4축) 을 거쳐 발행되었습니다. 인용한 출처는 본문
          하단에서 확인하실 수 있습니다. 잘못된 정보를 발견하시면{" "}
          <a
            href="mailto:hello@tkad.co.kr?subject=%5B%EC%9D%B8%EC%82%AC%EC%9D%B4%ED%8A%B8%5D%20%EC%98%A4%EB%A5%98%20%EC%8B%A0%EA%B3%A0"
            className="font-semibold text-gold-dark underline-offset-2 hover:underline"
          >
            hello@tkad.co.kr
          </a>{" "}
          로 알려주세요.
        </p>
      </div>
    </aside>
  );
}
