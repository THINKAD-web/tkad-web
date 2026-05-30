import type { OAuthConfig, OAuthUserConfig } from "@auth/core/providers";

/** https://developers.naver.com/docs/login/profile/profile.md */
export interface NaverProfile {
  resultcode: string;
  message: string;
  response: {
    id: string;
    nickname?: string;
    name?: string;
    email?: string;
    profile_image?: string;
  };
}

export default function NaverProvider(
  options: OAuthUserConfig<NaverProfile>,
): OAuthConfig<NaverProfile> {
  return {
    id: "naver",
    name: "Naver",
    type: "oauth",
    checks: ["state"],
    authorization: {
      url: "https://nid.naver.com/oauth2.0/authorize",
      params: { response_type: "code" },
    },
    token: {
      url: "https://nid.naver.com/oauth2.0/token",
      async request(context: {
        provider: {
          clientId?: string;
          clientSecret?: string;
          callbackUrl: string;
        };
        params: Record<string, unknown>;
      }) {
        const { provider, params } = context;
        const clientId = provider.clientId;
        const clientSecret = provider.clientSecret;
        const redirectUri = provider.callbackUrl;
        if (!clientId || !clientSecret || !redirectUri) {
          throw new Error("Naver OAuth client credentials or callback URL missing");
        }

        const url = new URL("https://nid.naver.com/oauth2.0/token");
        url.searchParams.set("grant_type", "authorization_code");
        url.searchParams.set("client_id", clientId);
        url.searchParams.set("client_secret", clientSecret);
        url.searchParams.set("code", String(params.code ?? ""));
        if (params.state) {
          url.searchParams.set("state", String(params.state));
        }
        url.searchParams.set("redirect_uri", redirectUri);

        const response = await fetch(url.toString(), { method: "GET" });
        const tokens = (await response.json()) as {
          access_token?: string;
          refresh_token?: string;
          expires_in?: number;
          token_type?: string;
          error?: string;
          error_description?: string;
        };

        if (!response.ok || tokens.error || !tokens.access_token) {
          throw new Error(
            tokens.error_description ?? tokens.error ?? "Naver token error",
          );
        }

        return {
          tokens: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_in: tokens.expires_in,
            token_type: tokens.token_type ?? "bearer",
          },
        };
      },
    },
    userinfo: {
      url: "https://openapi.naver.com/v1/nid/me",
      async request({ tokens }: { tokens: { access_token?: string } }) {
        const response = await fetch("https://openapi.naver.com/v1/nid/me", {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`Naver userinfo failed: ${response.status}`);
        }
        return (await response.json()) as NaverProfile;
      },
    },
    profile(profile) {
      const r = profile.response;
      return {
        id: r.id,
        name: r.name?.trim() || r.nickname?.trim() || "네이버 사용자",
        email: r.email?.trim() || undefined,
        image: r.profile_image,
      };
    },
    style: {
      logo: "",
      bg: "#03C75A",
      text: "#fff",
    },
    options,
  };
}
