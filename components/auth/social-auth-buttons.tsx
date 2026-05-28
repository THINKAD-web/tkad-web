import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { KakaoLoginButton } from "@/components/auth/kakao-login-button";
import { NaverLoginButton } from "@/components/auth/naver-login-button";

type Props = {
  className?: string;
};

/** 로그인·회원가입 공통 — Google / 카카오 / 네이버 간편 인증 */
export function SocialAuthButtons({ className }: Props) {
  return (
    <div className={className ?? "space-y-3"}>
      <GoogleLoginButton />
      <KakaoLoginButton />
      <NaverLoginButton />
    </div>
  );
}
