/**
 * 플래너 보고서 문서 유형 — 확장 가능 구조.
 * 타입별 인사말 톤·타이틀·표지 문구만 분리.
 * 새 타입 추가는 PLANNER_DOCUMENT_TYPES 배열에 항목 추가로 완료.
 */

export type PlannerDocumentTypeKey = "proposal" | "report" | "plan";

export type PlannerDocumentTypeConfig = {
  key: PlannerDocumentTypeKey;
  labelKo: string;
  labelEn: string;
  descKo: string;
  descEn: string;
  titleKo: string;
  titleEn: string;
  coverBadgeKo: string;
  coverBadgeEn: string;
  greetingToneKo: (clientName?: string) => string;
  greetingToneEn: (clientName?: string) => string;
  fileNameWordKo: string;
  fileNameWordEn: string;
};

export const PLANNER_DOCUMENT_TYPES: readonly PlannerDocumentTypeConfig[] = [
  {
    key: "proposal",
    labelKo: "제안서",
    labelEn: "Proposal",
    descKo: "광고주에게 캠페인 실행을 제안하는 문서",
    descEn: "A document proposing campaign execution to the client",
    titleKo: "OOH 미디어 캠페인 제안서",
    titleEn: "OOH Media Campaign Proposal",
    coverBadgeKo: "제안서",
    coverBadgeEn: "PROPOSAL",
    greetingToneKo: (clientName?: string) => {
      const name = clientName?.trim();
      if (name) {
        return `${name}님, 안녕하세요.\n\n아래와 같이 OOH 미디어 캠페인 제안을 드립니다.`;
      }
      return "안녕하세요.\n\n아래와 같이 OOH 미디어 캠페인 제안을 드립니다.";
    },
    greetingToneEn: (clientName?: string) => {
      const name = clientName?.trim();
      if (name) {
        return `Dear ${name},\n\nPlease find our OOH media campaign proposal below.`;
      }
      return "Please find our OOH media campaign proposal below.";
    },
    fileNameWordKo: "제안서",
    fileNameWordEn: "proposal",
  },
  {
    key: "report",
    labelKo: "보고서",
    labelEn: "Report",
    descKo: "매체 구성과 성과 분석을 정리한 보고서",
    descEn: "A report summarizing media mix and performance analysis",
    titleKo: "OOH 미디어 캠페인 보고서",
    titleEn: "OOH Media Campaign Report",
    coverBadgeKo: "보고서",
    coverBadgeEn: "REPORT",
    greetingToneKo: (clientName?: string) => {
      const name = clientName?.trim();
      if (name) {
        return `${name}님, 안녕하세요.\n\n아래와 같이 OOH 미디어 캠페인 분석 결과를 보고드립니다.`;
      }
      return "안녕하세요.\n\n아래와 같이 OOH 미디어 캠페인 분석 결과를 보고드립니다.";
    },
    greetingToneEn: (clientName?: string) => {
      const name = clientName?.trim();
      if (name) {
        return `Dear ${name},\n\nPlease find the OOH media campaign analysis report below.`;
      }
      return "Please find the OOH media campaign analysis report below.";
    },
    fileNameWordKo: "보고서",
    fileNameWordEn: "report",
  },
  {
    key: "plan",
    labelKo: "미디어 플랜",
    labelEn: "Media Plan",
    descKo: "매체·숫자 중심의 미디어 플랜 문서",
    descEn: "A media plan focused on numbers and media lineup",
    titleKo: "OOH 미디어 플랜",
    titleEn: "OOH Media Plan",
    coverBadgeKo: "미디어 플랜",
    coverBadgeEn: "MEDIA PLAN",
    greetingToneKo: (clientName?: string) => {
      const name = clientName?.trim();
      if (name) {
        return `${name}님, 안녕하세요.\n\n아래 미디어 플랜을 검토 부탁드립니다.`;
      }
      return "안녕하세요.\n\n아래 미디어 플랜을 검토 부탁드립니다.";
    },
    greetingToneEn: (clientName?: string) => {
      const name = clientName?.trim();
      if (name) {
        return `Dear ${name},\n\nPlease review the media plan below.`;
      }
      return "Please review the media plan below.";
    },
    fileNameWordKo: "미디어플랜",
    fileNameWordEn: "media-plan",
  },
];

export const DEFAULT_PLANNER_DOCUMENT_TYPE: PlannerDocumentTypeKey = "proposal";

export function getPlannerDocumentTypeConfig(
  key: PlannerDocumentTypeKey,
): PlannerDocumentTypeConfig {
  return (
    PLANNER_DOCUMENT_TYPES.find((t) => t.key === key) ??
    PLANNER_DOCUMENT_TYPES[0]!
  );
}

export function parsePlannerDocumentType(
  raw: unknown,
): PlannerDocumentTypeKey {
  if (
    typeof raw === "string" &&
    PLANNER_DOCUMENT_TYPES.some((t) => t.key === raw)
  ) {
    return raw as PlannerDocumentTypeKey;
  }
  return DEFAULT_PLANNER_DOCUMENT_TYPE;
}
