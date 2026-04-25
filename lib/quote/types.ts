import type { TimeSlotKey } from "@/lib/pricing";

/** 1~4 : 입력 단계, 5 : 제출 완료(컨펌). */
export type QuoteWizardStep = 1 | 2 | 3 | 4 | 5;
export const QUOTE_LAST_INPUT_STEP = 4 as const;
export const QUOTE_CONFIRMATION_STEP = 5 as const;

/** 견적 진입 경로. 진입 경로별 사전 데이터(Planner/매체/비교) 자동 매핑에 사용. */
export type QuoteSource = "planner" | "media" | "compare" | "direct";

/** 3단계 소재 모드. */
export type QuoteCreativeMode =
  | "upload"          // 사용자 업로드
  | "composite"       // Planner 합성 미리보기 재사용
  | "design_request"  // 싱커드 디자인팀 의뢰
  | "later";          // 견적 확정 후 결정

/** 송출 시간대 — 디지털 사이니지 전용. lib/pricing/multipliers 와 동일 키. */
export type QuoteTimeSlot = TimeSlotKey;

/** 4단계 고객 정보. 필수: company/name/email/phone. */
export type QuoteCustomerInfo = {
  company: string;
  name: string;
  email: string;
  phone: string;
  /** 사업자등록번호(선택, 포맷 검증만). */
  businessNumber?: string;
  address?: string;
  position?: string;
  /** 추가 요청사항. */
  message?: string;
};

/** 업로드된 광고 소재. */
export type QuoteCreativeAsset = {
  /** 클라이언트 측 임시 식별자. */
  id: string;
  /** Cloudinary secure_url. */
  url: string;
  filename: string;
  size: number;
  mimeType: string;
};

/** 디자인 의뢰 시 입력하는 브리프. */
export type QuoteDesignBrief = {
  brand: string;
  message: string;
  toneAndManner: string;
  /** 참고 이미지 URL. */
  referenceUrls: string[];
  /** 마감 희망일(ISO YYYY-MM-DD). */
  deadlineIso: string | null;
};

/**
 * 캠페인 기간 — 시작·종료일을 ISO 문자열(YYYY-MM-DD)로 보관.
 * Date 객체는 JSON 직렬화에 적합하지 않아 문자열로 저장하고 selector 에서 Date 변환.
 */
export type QuoteIsoDate = string;

/** 매체별 네트워크 옵션(사이트 수 + 지역 범위). */
export type QuoteNetworkOption = {
  units: number;
  regionScope: string;
};

/** 견적 마법사 입력 한도. */
export const QUOTE_MAX_MEDIA = 10;
export const QUOTE_MIN_DAYS = 7;
export const QUOTE_MAX_DAYS = 365;

/** 입력만 손대도 갱신되는 활동 시각 — draft 만료 판단 기준. */
export const QUOTE_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
