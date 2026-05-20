import type { TrendReport } from "@prisma/client";
import type { ValidationResult } from "@/lib/insights/validators/auto-validator";

/**
 * Slack 인사이트 파이프라인 알림.
 *
 * 환경변수:
 *   SLACK_WEBHOOK_URL              - 기본 webhook (한 채널로 모든 알림)
 *   SLACK_WEBHOOK_URL_BLOCKED      - (옵션) 발행 보류·시스템 에러 전용
 *   SLACK_WEBHOOK_URL_WARNINGS     - (옵션) warning verdict 전용
 *
 * 미설정 시 sendSlackInsightAlert() 는 silent skip ({ skipped: true } 반환).
 * cron / admin route 가 결과 받아 로그만 남김.
 */

export type AlertSeverity = "info" | "warning" | "error";

export interface InsightAlertPayload {
  severity: AlertSeverity;
  title: string;
  /** Slack mrkdwn 짧은 본문 */
  summary: string;
  /** key/value 쌍으로 표시되는 필드 (점수·이슈 카운트 등) */
  fields?: Array<{ label: string; value: string }>;
  /** "어드민에서 보기" CTA URL */
  adminUrl?: string;
  /** "공개 페이지" CTA URL (published 만) */
  publicUrl?: string;
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  fields?: { type: string; text: string }[];
  elements?: Array<{
    type: string;
    text?: { type: string; text: string };
    url?: string;
    style?: string;
  }>;
}

function severityEmoji(s: AlertSeverity): string {
  if (s === "error") return "🚫";
  if (s === "warning") return "⚠️";
  return "✅";
}

function pickWebhookUrl(severity: AlertSeverity): string | null {
  const blocked = process.env.SLACK_WEBHOOK_URL_BLOCKED?.trim();
  const warnings = process.env.SLACK_WEBHOOK_URL_WARNINGS?.trim();
  const main = process.env.SLACK_WEBHOOK_URL?.trim();
  if (severity === "error" && blocked) return blocked;
  if (severity === "warning" && warnings) return warnings;
  return main || null;
}

function buildBlocks(p: InsightAlertPayload): SlackBlock[] {
  const headerText = `${severityEmoji(p.severity)} ${p.title}`;
  const blocks: SlackBlock[] = [
    { type: "header", text: { type: "plain_text", text: headerText } },
    { type: "section", text: { type: "mrkdwn", text: p.summary } },
  ];
  if (p.fields && p.fields.length > 0) {
    blocks.push({
      type: "section",
      fields: p.fields
        .slice(0, 10)
        .map((f) => ({ type: "mrkdwn", text: `*${f.label}*\n${f.value}` })),
    });
  }
  const actions: SlackBlock["elements"] = [];
  if (p.adminUrl) {
    actions!.push({
      type: "button",
      text: { type: "plain_text", text: "어드민에서 보기" },
      url: p.adminUrl,
      style: p.severity === "error" ? "danger" : undefined,
    });
  }
  if (p.publicUrl) {
    actions!.push({
      type: "button",
      text: { type: "plain_text", text: "공개 페이지" },
      url: p.publicUrl,
    });
  }
  if (actions && actions.length > 0) {
    blocks.push({ type: "actions", elements: actions });
  }
  return blocks;
}

export async function sendSlackInsightAlert(
  payload: InsightAlertPayload,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const webhookUrl = pickWebhookUrl(payload.severity);
  if (!webhookUrl) {
    return { ok: false, skipped: true };
  }

  try {
    const body = {
      text: `${severityEmoji(payload.severity)} ${payload.title} — ${payload.summary}`,
      blocks: buildBlocks(payload),
    };
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(
        `[slack] webhook ${res.status}: ${text.slice(0, 200)}`,
      );
      return { ok: false, error: `${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[slack] fetch failed:", msg);
    return { ok: false, error: msg };
  }
}

/* ────────────────────────────────────────────────────────────
 *  Convenience helpers (cron / admin route 에서 직접 호출)
 * ──────────────────────────────────────────────────────────── */

function siteBaseUrl(): string {
  return (
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://tkad.co.kr")
  ).replace(/\/$/, "");
}

function adminContentEditUrl(id: string, kind: string): string {
  return `${siteBaseUrl()}/ko/admin/content/edit/${id}?type=${kind}`;
}

function adminContentListUrl(): string {
  return `${siteBaseUrl()}/ko/admin/content`;
}

function adminEditUrl(reportId: string): string {
  return `${siteBaseUrl()}/ko/admin/reports/new?edit=${reportId}`;
}

function publicInsightUrl(): string {
  // PR-5 에서 slug 기반 detail 라우트 추가 예정. 우선 리스트로 연결.
  return `${siteBaseUrl()}/ko/insights`;
}

function topIssuesSummary(validation: ValidationResult, max = 3): string {
  if (validation.issues.length === 0) return "이슈 없음.";
  return validation.issues
    .slice(0, max)
    .map(
      (i) =>
        `• [${i.category}/${i.severity}] ${i.explanation.slice(0, 140)}`,
    )
    .join("\n");
}

/**
 * 검증 결과 + 발행 상태 알림.
 * verdict 별 severity / 채널 자동 결정.
 */
export async function notifyValidationOutcome(
  report: Pick<TrendReport, "id" | "titleKo" | "status">,
  validation: ValidationResult,
): Promise<void> {
  const verdict = validation.verdict;
  const severity: AlertSeverity =
    verdict === "fail" ? "error" : verdict === "warning" ? "warning" : "info";
  const headline =
    verdict === "fail"
      ? "발행 보류 (검증 실패)"
      : verdict === "warning"
        ? "경고와 함께 발행됨"
        : "자동 발행됨";

  const fields = [
    { label: "점수", value: `${validation.totalScore}/100` },
    { label: "Verdict", value: verdict.toUpperCase() },
    {
      label: "이슈",
      value: `${validation.issues.length}건 (critical ${
        validation.issues.filter((i) => i.severity === "critical").length
      })`,
    },
    {
      label: "축별",
      value: `팩트 ${validation.scores.factual} · 법적 ${validation.scores.legal} · 톤 ${validation.scores.tone} · SEO ${validation.scores.seo}`,
    },
  ];

  const summary = `*${report.titleKo}*\n${topIssuesSummary(validation)}`;

  await sendSlackInsightAlert({
    severity,
    title: `${headline}: ${report.titleKo.slice(0, 60)}`,
    summary,
    fields,
    adminUrl: adminEditUrl(report.id),
    publicUrl: report.status === "published" ? publicInsightUrl() : undefined,
  });
}

/**
 * 시스템 에러 (Anthropic 호출 실패·DB 저장 실패 등) 알림.
 * 검증 자체가 못 돌았을 때 cron route 가 호출.
 */
export async function notifyPipelineError(
  stage: string,
  message: string,
  context: { slug?: string; month?: string },
): Promise<void> {
  await sendSlackInsightAlert({
    severity: "error",
    title: `인사이트 파이프라인 에러 — ${stage}`,
    summary: `\`\`\`${message.slice(0, 800)}\`\`\``,
    fields: [
      { label: "Slug", value: context.slug ?? "—" },
      { label: "Month", value: context.month ?? "—" },
      { label: "When", value: new Date().toISOString() },
    ],
  });
}

/**
 * 월간 cron·어드민 초안 생성 후 운영 검토 알림.
 */
export async function notifyTrendDraftReady(
  report: Pick<TrendReport, "id" | "titleKo" | "month">,
  opts?: { sourcesCount?: number },
): Promise<void> {
  const monthLabel = report.month ?? "—";
  await sendSlackInsightAlert({
    severity: "info",
    title: "이번 달 트렌드 리포트 초안이 생성됐어요",
    summary:
      `*${report.titleKo}*\n검토 후 발행해주세요.\n대상 월: \`${monthLabel}\`${opts?.sourcesCount != null ? ` · 참고 출처 ${opts.sourcesCount}건` : ""}`,
    fields: [
      { label: "상태", value: "draft (검토 대기)" },
      { label: "When", value: new Date().toISOString() },
    ],
    adminUrl: adminEditUrl(report.id),
  });
}

/** @deprecated use notifyTrendDraftReady — kept for imports */
export async function notifyMonthlyDraftReady(
  report: Pick<TrendReport, "id" | "titleKo" | "month">,
  opts?: { sourcesCount?: number },
): Promise<void> {
  return notifyTrendDraftReady(report, opts);
}

export type AutoContentKind =
  | "trend_report"
  | "education_article"
  | "guide_article";

const CONTENT_KIND_LABEL: Record<AutoContentKind, string> = {
  trend_report: "트렌드 리포트",
  education_article: "교육 콘텐츠",
  guide_article: "광고주 가이드",
};

/**
 * AI 자동 생성 초안 알림 (cron → 운영 검토).
 */
export async function notifyContentDraftReady(opts: {
  kind: AutoContentKind;
  id: string;
  titleKo: string;
}): Promise<void> {
  const label = CONTENT_KIND_LABEL[opts.kind];
  await sendSlackInsightAlert({
    severity: "info",
    title: `새 ${label} 초안이 생성됐어요`,
    summary: `*${opts.titleKo}*\n검토 후 발행해주세요 → ${adminContentListUrl()}`,
    fields: [
      { label: "유형", value: label },
      { label: "상태", value: "draft (검토 대기)" },
      { label: "When", value: new Date().toISOString() },
    ],
    adminUrl: adminContentEditUrl(opts.id, opts.kind),
  });
}
