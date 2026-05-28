export type EnvCheckRow = {
  key: string;
  label: string;
  required: boolean;
  configured: boolean;
  note?: string;
};

const CHECKS: Array<{
  key: string;
  label: string;
  required: boolean;
  note?: string;
}> = [
  { key: "ANTHROPIC_API_KEY", label: "Claude 콘텐츠 생성", required: true },
  { key: "TAVILY_API_KEY", label: "뉴스·웹 검색", required: false },
  { key: "SLACK_WEBHOOK_URL", label: "Slack 알림", required: false },
  { key: "CLOUDINARY_CLOUD_NAME", label: "Cloudinary cloud", required: false },
  { key: "CLOUDINARY_API_KEY", label: "Cloudinary API key", required: false },
  { key: "CLOUDINARY_API_SECRET", label: "Cloudinary secret", required: false },
  { key: "RESEND_API_KEY", label: "이메일 (Resend)", required: false },
  { key: "KAKAO_CLIENT_ID", label: "Kakao OAuth", required: false },
  { key: "KAKAO_CLIENT_SECRET", label: "Kakao OAuth secret", required: false },
  { key: "GOOGLE_CLIENT_ID", label: "Google OAuth", required: false },
  { key: "GOOGLE_CLIENT_SECRET", label: "Google OAuth secret", required: false },
  { key: "NAVER_CLIENT_ID", label: "Naver OAuth", required: false },
  { key: "NAVER_CLIENT_SECRET", label: "Naver OAuth secret", required: false },
  { key: "DATABASE_URL", label: "PostgreSQL", required: true },
  { key: "AUTH_SECRET", label: "세션 (AUTH_SECRET)", required: false },
  { key: "USER_SESSION_SECRET", label: "세션 (USER_SESSION_SECRET)", required: false },
  {
    key: "KAKAO_ALIMTALK_API_KEY",
    label: "카카오 알림톡",
    required: false,
    note: "ALIGO_API_KEY 폴백 가능",
  },
  { key: "TOSS_PAYMENTS_SECRET_KEY", label: "토스 즉시예약", required: false },
  { key: "CRON_SECRET", label: "Cron 인증", required: false },
];

import {
  readKakaoOAuthClientId,
  readKakaoOAuthClientSecret,
  readNaverOAuthClientId,
  readNaverOAuthClientSecret,
  readGoogleOAuthClientId,
  readGoogleOAuthClientSecret,
} from "@/lib/oauth-credentials";

function isConfigured(key: string): boolean {
  if (key === "KAKAO_CLIENT_ID") {
    return Boolean(readKakaoOAuthClientId());
  }
  if (key === "KAKAO_CLIENT_SECRET") {
    return Boolean(readKakaoOAuthClientSecret());
  }
  if (key === "NAVER_CLIENT_ID") {
    return Boolean(readNaverOAuthClientId());
  }
  if (key === "NAVER_CLIENT_SECRET") {
    return Boolean(readNaverOAuthClientSecret());
  }
  if (key === "GOOGLE_CLIENT_ID") {
    return Boolean(readGoogleOAuthClientId());
  }
  if (key === "GOOGLE_CLIENT_SECRET") {
    return Boolean(readGoogleOAuthClientSecret());
  }
  const v = process.env[key]?.trim();
  if (v) return true;
  if (key === "KAKAO_ALIMTALK_API_KEY") {
    return Boolean(process.env.ALIGO_API_KEY?.trim());
  }
  if (key === "AUTH_SECRET") {
    return Boolean(process.env.USER_SESSION_SECRET?.trim());
  }
  return false;
}

export function runOpsEnvCheck(): {
  rows: EnvCheckRow[];
  missingRequired: string[];
  missingOptional: string[];
} {
  const rows: EnvCheckRow[] = CHECKS.map((c) => ({
    ...c,
    configured: isConfigured(c.key),
  }));

  const missingRequired = rows
    .filter((r) => r.required && !r.configured)
    .map((r) => r.key);
  const missingOptional = rows
    .filter((r) => !r.required && !r.configured)
    .map((r) => r.key);

  return { rows, missingRequired, missingOptional };
}
