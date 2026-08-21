/**
 * 다음 라운드용 — 인바운드는 이번 슬라이스에서 구현하지 않음.
 * tkad.co.kr MX 는 Google Workspace. 정점 MX 를 바꾸면 기존 Gmail 이 끊긴다.
 */
export const GMAIL_INBOUND_NEXT_ROUND_STEPS_KO = [
  "Workspace Admin에서 전용 주소 만들기 (예: inquiry-auto@tkad.co.kr). 사용자 또는 Google Group.",
  "Gmail 전달: 해당 계정 → 설정 → 전달 및 POP/IMAP → 전달 주소에 Resend Inbound 수신 주소를 추가하고 확인 메일을 수락.",
  "또는 Admin console → 앱 → Gmail → 라우팅에서 inquiry-auto@ 만 외부 수신 주소로 전달 (다른 사서함은 그대로).",
  "apex(tkad.co.kr) MX 는 Google 유지. Resend 수신이 필요하면 inbound.tkad.co.kr 같은 서브도메인 MX 만 Resend 로 둔다.",
  "전달된 원문을 POST 웹훅으로 받는 라우트를 다음 라운드에서 이 dry-run API 앞에 붙인다. 고객 To 는 그때도 allowlist 뒤에만.",
] as const;
