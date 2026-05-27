/**
 * 카카오 알림톡 — 알리고(Aligo) Kakao API 래퍼
 * https://smartsms.aligo.in/ (카카오 알림톡)
 *
 * 환경변수 미설정 시 no-op(콘솔 로그만). 실패 시 SMS 대체 발송(apis.aligo.in).
 */

const KAKAO_API_HOST = "https://kakaoapi.aligo.in";
const SMS_API_HOST = "https://apis.aligo.in";

export const ALIMTALK_TEMPLATE_CODES = [
  "TKAD_INQUIRY_RECEIVED",
  "TKAD_QUOTE_SENT",
  "TKAD_QUOTE_EXPIRING",
  "TKAD_CAMPAIGN_CONFIRMED",
  "TKAD_CAMPAIGN_TOMORROW",
  "TKAD_REPORT_READY",
  "TKAD_OWNER_NEW_INQUIRY",
  "TKAD_OWNER_CAMPAIGN_CONFIRMED",
  "TKAD_OWNER_SETTLEMENT_DONE",
  "TKAD_PROOF_PHOTO_UPLOADED",
  "TKAD_MEDIA_APPLICATION_APPROVED",
  "UL_1338",
] as const;

/** 알리고 미등록 — 알림톡 생략, SMS(LMS)만 발송 */
export const SMS_ONLY_ALIMTALK_TEMPLATE_CODES = [
  "TKAD_INQUIRY_RECEIVED",
] as const;

export type AlimtalkTemplateCode = (typeof ALIMTALK_TEMPLATE_CODES)[number];

/** 알리고에 등록한 템플릿 본문과 동일하게 유지 (변수: #{key}) */
export const ALIMTALK_TEMPLATE_DEFAULTS: Record<
  AlimtalkTemplateCode,
  { subject: string; body: string }
> = {
  TKAD_INQUIRY_RECEIVED: {
    subject: "문의 접수",
    body: "#{name}님, 문의가 접수되었습니다.\n담당자가 확인 후 연락드리겠습니다.",
  },
  TKAD_QUOTE_SENT: {
    subject: "견적서 발송",
    body: "#{name}님, 견적서가 도착했어요.\n확인하기 → #{link}",
  },
  TKAD_QUOTE_EXPIRING: {
    subject: "견적 만료 예정",
    body: "#{name}님, 견적 유효기간이 #{validUntil}까지입니다.\n#{link}",
  },
  TKAD_CAMPAIGN_CONFIRMED: {
    subject: "캠페인 확정",
    body: "#{name}님, 캠페인「#{campaignName}」이 확정되었습니다.\n송출 일정은 담당자가 안내드립니다.",
  },
  TKAD_CAMPAIGN_TOMORROW: {
    subject: "광고 집행 안내",
    body: "#{name}님, 내일부터「#{campaignName}」광고가 집행됩니다.",
  },
  TKAD_REPORT_READY: {
    subject: "리포트 준비",
    body: "#{name}님,「#{campaignName}」캠페인 결과 리포트가 준비됐어요.\n#{link}",
  },
  TKAD_OWNER_NEW_INQUIRY: {
    subject: "매체 문의",
    body: "등록하신 매체「#{mediaName}」에 새 문의가 접수되었습니다.\n#{link}",
  },
  TKAD_OWNER_CAMPAIGN_CONFIRMED: {
    subject: "집행 확정",
    body: "매체「#{mediaName}」에서「#{campaignName}」집행이 확정되었습니다.",
  },
  TKAD_OWNER_SETTLEMENT_DONE: {
    subject: "정산 완료",
    body: "#{periodMonth} 정산이 완료되었습니다.\n정산 금액: #{amount}원",
  },
  TKAD_PROOF_PHOTO_UPLOADED: {
    subject: "인증 사진",
    body: "광고가 정상 집행되고 있어요!\n인증 사진을 확인해보세요 →\n#{link}",
  },
  TKAD_MEDIA_APPLICATION_APPROVED: {
    subject: "매체 승인",
    body: "등록하신 매체「#{mediaName}」이 승인·노출되었습니다.\n#{link}",
  },
  UL_1338: {
    subject: "싱커드 PRO 체험 만료 알림",
    body: "#{name}님, PRO 체험이 3일 후 종료됩니다.\n계속 이용하시려면 구독해주세요 → #{link}",
  },
};

export const ALIMTALK_TEMPLATE_LABELS: Record<AlimtalkTemplateCode, string> = {
  TKAD_INQUIRY_RECEIVED: "문의 접수",
  TKAD_QUOTE_SENT: "견적 발송",
  TKAD_QUOTE_EXPIRING: "견적 만료 예정",
  TKAD_CAMPAIGN_CONFIRMED: "계약 확정",
  TKAD_CAMPAIGN_TOMORROW: "집행 D-1",
  TKAD_REPORT_READY: "리포트 완료",
  TKAD_OWNER_NEW_INQUIRY: "매체사·신규 문의",
  TKAD_OWNER_CAMPAIGN_CONFIRMED: "매체사·집행 확정",
  TKAD_OWNER_SETTLEMENT_DONE: "매체사·정산 완료",
  TKAD_PROOF_PHOTO_UPLOADED: "인증 사진 업로드",
  TKAD_MEDIA_APPLICATION_APPROVED: "매체사·승인 완료",
  UL_1338: "싱커드 PRO 체험 만료 알림",
};

export type SendAlimtalkParams = {
  to: string;
  templateCode: string;
  variables?: Record<string, string>;
  recvName?: string;
  /** 미지정 시 템플릿 기본 제목 */
  subject?: string;
  /** 미지정 시 템플릿 기본 본문 + variables 치환 */
  message?: string;
};

export type SendAlimtalkResult = {
  sent: boolean;
  channel: "alimtalk" | "sms" | "noop";
  detail?: string;
  error?: string;
};

type AligoConfig = {
  /** 카카오 알림톡 API (kakaoapi.aligo.in) */
  apiKey: string;
  /** SMS 대체 발송 (apis.aligo.in) — 미설정 시 apiKey와 동일 */
  smsApiKey: string;
  userId: string;
  senderKey: string;
  senderPhone: string;
  testMode: boolean;
};

let tokenCache: { token: string; expiresAt: number } | null = null;

function logNoop(label: string, payload: Record<string, unknown>) {
  console.info("[kakao-alimtalk]", label, JSON.stringify(payload));
}

export function isAlimtalkConfigured(): boolean {
  return getAligoConfig() !== null;
}

function getAligoConfig(): AligoConfig | null {
  const apiKey =
    process.env.KAKAO_ALIMTALK_API_KEY?.trim() ||
    process.env.ALIGO_API_KEY?.trim();
  const smsApiKey = process.env.ALIGO_API_KEY?.trim() || apiKey;
  const userId =
    process.env.KAKAO_ALIMTALK_USER_ID?.trim() ||
    process.env.ALIGO_USER_ID?.trim();
  const senderKey = process.env.KAKAO_ALIMTALK_SENDER_KEY?.trim();
  const senderPhone = process.env.KAKAO_ALIMTALK_PHONE?.trim();
  if (!apiKey || !smsApiKey || !userId || !senderKey || !senderPhone) return null;
  return {
    apiKey,
    smsApiKey,
    userId,
    senderKey,
    senderPhone,
    testMode: process.env.KAKAO_ALIMTALK_TEST_MODE === "1",
  };
}

/** 한국 휴대폰 번호(010…)로 정규화. 실패 시 null */
export function normalizeKrPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("82") && digits.length >= 11) {
    const local = `0${digits.slice(2)}`;
    if (/^01[016789]\d{7,8}$/.test(local)) return local;
  }
  if (/^01[016789]\d{7,8}$/.test(digits)) return digits;
  return null;
}

export function applyTemplateVariables(
  template: string,
  variables: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(variables)) {
    out = out.split(`#{${key}}`).join(value);
  }
  return out;
}

function resolveTemplateContent(
  templateCode: string,
  variables: Record<string, string>,
  overrides?: { subject?: string; message?: string },
): { subject: string; message: string } | null {
  const known = ALIMTALK_TEMPLATE_DEFAULTS[templateCode as AlimtalkTemplateCode];
  if (!known && !overrides?.message) return null;
  const subject = overrides?.subject ?? known?.subject ?? templateCode;
  const rawBody = overrides?.message ?? known?.body ?? "";
  return {
    subject,
    message: applyTemplateVariables(rawBody, variables),
  };
}

type AligoJson = { code?: number; message?: string; token?: string; info?: unknown };

async function postForm(url: string, fields: Record<string, string>): Promise<AligoJson> {
  const body = new URLSearchParams(fields);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as AligoJson;
  } catch {
    throw new Error(`Aligo invalid JSON (${res.status}): ${text.slice(0, 200)}`);
  }
}

async function getAligoToken(cfg: AligoConfig): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.token;
  }
  const minutes = 30;
  const url = `${KAKAO_API_HOST}/akv10/token/create/${minutes}/s/`;
  const data = await postForm(url, {
    apikey: cfg.apiKey,
    userid: cfg.userId,
    senderkey: cfg.senderKey,
  });
  if (data.code !== 0 || !data.token) {
    throw new Error(data.message ?? "Aligo token create failed");
  }
  tokenCache = {
    token: data.token,
    expiresAt: now + minutes * 60_000 - 120_000,
  };
  return data.token;
}

async function sendSmsFallback(
  cfg: AligoConfig,
  receiver: string,
  msg: string,
  subject: string,
): Promise<SendAlimtalkResult> {
  const fields: Record<string, string> = {
    key: cfg.smsApiKey,
    user_id: cfg.userId,
    sender: cfg.senderPhone.replace(/\D/g, ""),
    receiver: receiver.replace(/\D/g, ""),
    msg,
    title: subject.slice(0, 40),
    msg_type: msg.length > 90 ? "LMS" : "SMS",
  };
  if (cfg.testMode) fields.testmode_yn = "Y";

  const data = await postForm(`${SMS_API_HOST}/send/`, fields);
  if (data.code !== 0) {
    return {
      sent: false,
      channel: "sms",
      error: data.message ?? `SMS code ${data.code}`,
    };
  }
  return { sent: true, channel: "sms", detail: data.message };
}

async function sendAlimtalkViaAligo(
  cfg: AligoConfig,
  params: {
    receiver: string;
    recvName?: string;
    templateCode: string;
    subject: string;
    message: string;
  },
): Promise<SendAlimtalkResult> {
  const token = await getAligoToken(cfg);
  const receiver = params.receiver.replace(/\D/g, "");
  const fields: Record<string, string> = {
    apikey: cfg.apiKey,
    userid: cfg.userId,
    token,
    senderkey: cfg.senderKey,
    sender: cfg.senderPhone.replace(/\D/g, ""),
    tpl_code: params.templateCode,
    receiver_1: receiver,
    subject_1: params.subject,
    message_1: params.message,
    failover: "Y",
    fsubject_1: params.subject.slice(0, 40),
    fmessage_1: params.message,
  };
  if (params.recvName?.trim()) {
    fields.recvname_1 = params.recvName.trim();
  }
  if (cfg.testMode) fields.testmode_yn = "Y";

  const data = await postForm(`${KAKAO_API_HOST}/akv10/alimtalk/send/`, fields);
  if (data.code === 0) {
    return { sent: true, channel: "alimtalk", detail: String(data.message ?? "ok") };
  }

  console.warn("[kakao-alimtalk] alimtalk failed, SMS fallback:", data.message);
  try {
    return await sendSmsFallback(cfg, receiver, params.message, params.subject);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      sent: false,
      channel: "sms",
      error: `${data.message ?? "alimtalk failed"}; SMS: ${msg}`,
    };
  }
}

/**
 * 카카오 알림톡 발송. 환경변수 없으면 콘솔 로그만.
 */
export async function sendAlimtalk(
  params: SendAlimtalkParams,
): Promise<SendAlimtalkResult> {
  const phone = normalizeKrPhone(params.to);
  if (!phone) {
    return { sent: false, channel: "noop", error: "invalid_phone" };
  }

  const variables = params.variables ?? {};
  const content = resolveTemplateContent(params.templateCode, variables, {
    subject: params.subject,
    message: params.message,
  });
  if (!content) {
    return { sent: false, channel: "noop", error: "unknown_template" };
  }

  const cfg = getAligoConfig();
  if (!cfg) {
    logNoop("noop (env not configured)", {
      to: phone,
      templateCode: params.templateCode,
      subject: content.subject,
      message: content.message,
      recvName: params.recvName,
    });
    return { sent: false, channel: "noop", detail: "not_configured" };
  }

  const smsOnly = (
    SMS_ONLY_ALIMTALK_TEMPLATE_CODES as readonly string[]
  ).includes(params.templateCode);
  if (smsOnly) {
    try {
      return await sendSmsFallback(
        cfg,
        phone,
        content.message,
        content.subject,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[kakao-alimtalk] SMS-only send error:", msg);
      return { sent: false, channel: "sms", error: msg };
    }
  }

  try {
    return await sendAlimtalkViaAligo(cfg, {
      receiver: phone,
      recvName: params.recvName,
      templateCode: params.templateCode,
      subject: content.subject,
      message: content.message,
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("[kakao-alimtalk] send error:", errMsg);
    try {
      return await sendSmsFallback(cfg, phone, content.message, content.subject);
    } catch (smsErr) {
      const smsMsg = smsErr instanceof Error ? smsErr.message : String(smsErr);
      return { sent: false, channel: "sms", error: `${errMsg}; ${smsMsg}` };
    }
  }
}

export function isKnownAlimtalkTemplate(
  code: string,
): code is AlimtalkTemplateCode {
  return (ALIMTALK_TEMPLATE_CODES as readonly string[]).includes(code);
}
