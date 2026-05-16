"use client";

// `/signup` 은 `/register` 와 동일한 화면(별칭 경로).
// 둘 다 SEO/링크 유지를 위해 살려둔다.
import RegisterPage from "../register/page";

export default function SignupPage() {
  return <RegisterPage />;
}
