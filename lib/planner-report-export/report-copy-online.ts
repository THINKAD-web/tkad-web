import {
  buildOnlineReportStrategyLines,
  buildOnlineReportWhyLine,
  type OnlineReportStrategyInput,
} from "@/lib/planner/report-strategy-online";
import { joinReportCopyLines } from "@/lib/planner-report-export/report-copy";

export function buildDefaultOnlineReportGreeting(
  isKo: boolean,
  clientName?: string,
): string {
  const name = clientName?.trim();
  if (isKo) {
    if (name) {
      return `${name}님, 안녕하세요.\n\n아래와 같이 온라인 매체 제안을 드립니다.`;
    }
    return "안녕하세요.\n\n아래와 같이 온라인 매체 제안을 드립니다.";
  }
  if (name) {
    return `Dear ${name},\n\nPlease find our online media proposal below.`;
  }
  return "Please find our online media proposal below.";
}

export function buildOnlineExecutiveSummaryLines(
  input: OnlineReportStrategyInput,
): string[] {
  return [
    buildOnlineReportWhyLine(input),
    ...buildOnlineReportStrategyLines(input),
  ];
}

export function buildOnlineReportCopyDraft(
  input: OnlineReportStrategyInput & { clientName?: string },
): { greeting: string; executiveSummary: string } {
  return {
    greeting: buildDefaultOnlineReportGreeting(input.isKo, input.clientName),
    executiveSummary: joinReportCopyLines(buildOnlineExecutiveSummaryLines(input)),
  };
}
