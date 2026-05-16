import { Sparkles } from "lucide-react";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/constants";

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
      className="flex items-start gap-3 border-2 border-accent bg-card p-4 text-sm"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-border bg-accent text-accent-foreground">
        <Sparkles className="h-5 w-5" aria-hidden />
      </div>
      <div className="space-y-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
          [ AI 분석 리포트 ]
        </p>
        <p className="leading-relaxed text-foreground">
          이 리포트는 AI 가 검증된 자료를 바탕으로 자동 작성한 후 자체 검증
          (팩트·법적·톤·SEO 4축) 을 거쳐 발행되었습니다. 인용한 출처는 본문
          하단에서 확인하실 수 있습니다. 잘못된 정보를 발견하시면{" "}
          <a
            href={`${CONTACT_MAILTO}?subject=${encodeURIComponent("[인사이트] 오류 신고")}`}
            className="border-b-2 border-border pb-0.5 font-mono text-[12px] font-bold tracking-tight text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          로 알려주세요.
        </p>
      </div>
    </aside>
  );
}
