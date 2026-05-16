/**
 * 외부 OAuth 공급자 정의(카카오·네이버).
 *
 * 환경변수가 비어 있으면 해당 provider 는 자동으로 비활성 → /api/auth/providers 에서 노출 안 됨,
 * `/api/auth/oauth/[provider]/start` 호출 시 503 반환.
 */
export type OAuthProviderId = "kakao" | "naver";

export type OAuthNormalizedProfile = {
  providerAccountId: string;
  email: string | null;
  name: string | null;
  phone: string | null;
};

export type OAuthProviderConfig = {
  id: OAuthProviderId;
  label: string;
  clientId: string;
  clientSecret: string | null;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
  /** 추가 authorize 쿼리(없으면 빈 객체) */
  extraAuthorizeParams?: Record<string, string>;
  /** 토큰 응답에서 access_token 추출(공급자별 다름 가능) */
  parseTokenResponse: (raw: unknown) => { accessToken: string } | null;
  /** userInfo 응답을 우리가 쓰는 표준 형태로 정규화 */
  normalizeProfile: (raw: unknown) => OAuthNormalizedProfile | null;
};

function env(key: string): string | null {
  const v = process.env[key]?.trim();
  return v ? v : null;
}

function kakaoConfig(): OAuthProviderConfig | null {
  const clientId = env("KAKAO_OAUTH_CLIENT_ID");
  if (!clientId) return null;
  return {
    id: "kakao",
    label: "Kakao",
    clientId,
    clientSecret: env("KAKAO_OAUTH_CLIENT_SECRET"),
    authorizeUrl: "https://kauth.kakao.com/oauth/authorize",
    tokenUrl: "https://kauth.kakao.com/oauth/token",
    userInfoUrl: "https://kapi.kakao.com/v2/user/me",
    scope: "account_email,profile_nickname",
    parseTokenResponse: (raw) => {
      const r = raw as { access_token?: unknown } | null;
      if (!r || typeof r.access_token !== "string") return null;
      return { accessToken: r.access_token };
    },
    normalizeProfile: (raw) => {
      const r = raw as
        | {
            id?: number | string;
            kakao_account?: {
              email?: string;
              has_email?: boolean;
              is_email_valid?: boolean;
              is_email_verified?: boolean;
              profile?: { nickname?: string };
              phone_number?: string;
            };
          }
        | null;
      if (!r || r.id == null) return null;
      const account = r.kakao_account ?? {};
      const email =
        typeof account.email === "string" &&
        account.has_email !== false &&
        account.is_email_valid !== false
          ? account.email
          : null;
      const name = account.profile?.nickname?.trim() || null;
      const phoneRaw = account.phone_number?.trim() || null;
      // Kakao 전화번호: "+82 10-1234-5678" → "010-1234-5678" 정규화는 클라이언트가 알아서.
      return {
        providerAccountId: String(r.id),
        email,
        name,
        phone: phoneRaw,
      };
    },
  };
}

function naverConfig(): OAuthProviderConfig | null {
  const clientId = env("NAVER_OAUTH_CLIENT_ID");
  const clientSecret = env("NAVER_OAUTH_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  return {
    id: "naver",
    label: "Naver",
    clientId,
    clientSecret,
    authorizeUrl: "https://nid.naver.com/oauth2.0/authorize",
    tokenUrl: "https://nid.naver.com/oauth2.0/token",
    userInfoUrl: "https://openapi.naver.com/v1/nid/me",
    scope: "",
    parseTokenResponse: (raw) => {
      const r = raw as { access_token?: unknown } | null;
      if (!r || typeof r.access_token !== "string") return null;
      return { accessToken: r.access_token };
    },
    normalizeProfile: (raw) => {
      const r = raw as
        | {
            response?: {
              id?: string;
              email?: string;
              name?: string;
              nickname?: string;
              mobile?: string;
            };
          }
        | null;
      const resp = r?.response;
      if (!resp || !resp.id) return null;
      return {
        providerAccountId: String(resp.id),
        email: typeof resp.email === "string" && resp.email ? resp.email : null,
        name: (resp.name || resp.nickname || "").trim() || null,
        phone: typeof resp.mobile === "string" && resp.mobile ? resp.mobile : null,
      };
    },
  };
}

const ALL: Array<() => OAuthProviderConfig | null> = [kakaoConfig, naverConfig];

export function getOAuthProvider(id: string): OAuthProviderConfig | null {
  if (id === "kakao") return kakaoConfig();
  if (id === "naver") return naverConfig();
  return null;
}

export function listEnabledOAuthProviders(): Array<{
  id: OAuthProviderId;
  label: string;
}> {
  return ALL.map((fn) => fn())
    .filter((p): p is OAuthProviderConfig => p != null)
    .map((p) => ({ id: p.id, label: p.label }));
}

/**
 * 콜백 redirect_uri 생성. 호스트는 우선순위로:
 *   1) OAUTH_REDIRECT_BASE_URL 환경변수
 *   2) NEXT_PUBLIC_SITE_URL 환경변수
 *   3) 요청의 Origin 헤더
 *   4) 요청의 Host 헤더 + 프로토콜 추론
 */
export function buildOAuthRedirectUri(
  req: Request,
  providerId: OAuthProviderId,
): string {
  const base =
    env("OAUTH_REDIRECT_BASE_URL") ??
    env("NEXT_PUBLIC_SITE_URL") ??
    deriveOriginFromRequest(req);
  const cleaned = base.replace(/\/$/, "");
  return `${cleaned}/api/auth/oauth/${providerId}/callback`;
}

function deriveOriginFromRequest(req: Request): string {
  const url = new URL(req.url);
  // X-Forwarded-Proto/Host 우선 (Vercel/프록시 뒤일 때)
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (url.protocol.replace(":", "") || "https");
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    url.host;
  return `${proto}://${host}`;
}
