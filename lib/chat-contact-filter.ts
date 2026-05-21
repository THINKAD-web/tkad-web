const EMAIL_RE =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE =
  /(?:\+?82[\s.-]?)?(?:0\d{1,2}[\s.-]?)?\d{3,4}[\s.-]?\d{4}/g;
const KAKAO_RE = /(?:카톡|카카오|kakao|오픈채팅|open\.kakao)/gi;

export type ContactFilterResult = {
  sanitized: string;
  blocked: boolean;
  matches: string[];
};

export function filterChatContactInfo(text: string): ContactFilterResult {
  const matches: string[] = [];
  let sanitized = text;
  let blocked = false;

  const patterns = [
    { re: EMAIL_RE, label: "이메일" },
    { re: PHONE_RE, label: "전화번호" },
    { re: KAKAO_RE, label: "외부 연락" },
  ];

  for (const { re, label } of patterns) {
    re.lastIndex = 0;
    const found = text.match(re);
    if (found?.length) {
      blocked = true;
      matches.push(...found.map(() => label));
      sanitized = sanitized.replace(re, `[${label} 교환 불가]`);
    }
  }

  return {
    sanitized: sanitized.trim(),
    blocked,
    matches: [...new Set(matches)],
  };
}
