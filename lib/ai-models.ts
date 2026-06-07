/**
 * AI 기능별 모델 단일 소스 — 비용 차등.
 * 저렴(Haiku): 단순/대량 · 고품질(Sonnet): 콘텐츠/검토.
 * 기능별 env 로 개별 override 가능.
 */

const HAIKU = "claude-haiku-4-5-20251001";
const SONNET = "claude-sonnet-4-5-20250929";

export const AI_MODELS = {
  /** 공개 챗봇 */
  chatbot: process.env.CHATBOT_MODEL?.trim() || HAIKU,
  /** 플래너 AI 추천 재정렬 */
  recommendation: process.env.RECOMMENDATION_MODEL?.trim() || HAIKU,
  /** 운영자 상담 자동 답변 */
  chatReply: process.env.CHAT_REPLY_MODEL?.trim() || HAIKU,
  /** 리포트·케이스·아카데미 콘텐츠 생성 (품질) */
  contentGen: process.env.ANTHROPIC_MODEL?.trim() || SONNET,
  /** 크리에이티브 검토 (품질) */
  creativeReview: process.env.CREATIVE_REVIEW_MODEL?.trim() || SONNET,
} as const;

export const AI_MODEL_IDS = { HAIKU, SONNET } as const;
