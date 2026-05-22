export type OperatorManualBullet = {
  text: string;
};

export type OperatorManualSubsection = {
  id: string;
  title: string;
  bullets: OperatorManualBullet[];
};

export type OperatorManualChapter = {
  id: string;
  title: string;
  subsections: OperatorManualSubsection[];
};

export type OperatorManualChecklistItem = {
  text: string;
};

export type OperatorManualEnvVar = {
  name: string;
  source: string;
};

export const OPERATOR_MANUAL_TITLE = "THINKAD 운영자 매뉴얼";
export const OPERATOR_MANUAL_SUBTITLE =
  "일상·주간 운영, 환경변수, 장애 대응 가이드";

export const operatorManualChapters: OperatorManualChapter[] = [
  {
    id: "ch1",
    title: "1장. 일상 운영 업무",
    subsections: [
      {
        id: "1-1",
        title: "1.1 문의 처리 프로세스",
        bullets: [
          { text: "어드민 → 문의 관리 접속" },
          { text: "신규 문의 확인 (빨간 숫자 배지)" },
          { text: "문의 상세 → 담당자 배정" },
          { text: "견적서 작성 → 발송" },
          { text: "파이프라인 단계 이동" },
          { text: "목표: 24시간 내 첫 응답" },
        ],
      },
      {
        id: "1-2",
        title: "1.2 매체 등록 승인",
        bullets: [
          { text: "어드민 → 매체 등록 신청" },
          { text: "신청 내용 검토 (사진, 위치, 가격)" },
          { text: "승인 클릭 → 자동으로 매체 DB 등록" },
          { text: "반려 시 사유 입력 → 매체사 자동 알림" },
        ],
      },
      {
        id: "1-3",
        title: "1.3 캠페인 관리",
        bullets: [
          { text: "계약 완료 후 캠페인 생성" },
          { text: "집행 시작일 확인" },
          { text: "인증 사진 업로드 (QR 코드 활용)" },
          { text: "집행 완료 후 리포트 생성" },
        ],
      },
      {
        id: "1-4",
        title: "1.4 매체 데이터 입력",
        bullets: [
          { text: "CSV 일괄 등록 방법" },
          { text: "가격 단위: 반드시 원 단위 (70만원 = 700000)" },
          {
            text: "필수 항목: 매체명, 주소, 유형, 가격, 이미지 1장 이상",
          },
          { text: "이미지 업로드: 최소 3장 (정면, 측면, 야경)" },
        ],
      },
    ],
  },
  {
    id: "ch2",
    title: "2장. 주간 운영 업무",
    subsections: [
      {
        id: "2-1",
        title: "2.1 매월 1일 체크리스트",
        bullets: [
          { text: "□ 지난달 정산 내역 확인" },
          { text: "□ 만료 예정 PRO 구독자 확인" },
          { text: "□ 트렌드 리포트 초안 검토 후 발행" },
          { text: "□ 어드민 대시보드 KPI 확인" },
        ],
      },
      {
        id: "2-2",
        title: "2.2 콘텐츠 발행",
        bullets: [
          { text: "트렌드 리포트: 월 2회 (1일, 15일)" },
          { text: "교육 콘텐츠: 주 1회 (월요일)" },
          { text: "AI 초안 자동 생성 → 검토 → 발행" },
        ],
      },
      {
        id: "2-3",
        title: "2.3 포인트 관리",
        bullets: [
          { text: "이벤트 포인트 일괄 지급" },
          { text: "이상 사용자 확인 (어뷰징)" },
          { text: "만료 예정 포인트 알림 발송 확인" },
        ],
      },
    ],
  },
  {
    id: "ch3",
    title: "3장. 환경변수 목록",
    subsections: [
      {
        id: "3-1",
        title: "필수 환경변수 전체 목록과 발급 방법",
        bullets: [
          { text: "DATABASE_URL — Neon 대시보드" },
          { text: "ANTHROPIC_API_KEY — console.anthropic.com" },
          { text: "RESEND_API_KEY — resend.com" },
          { text: "CLOUDINARY_* — cloudinary.com" },
          { text: "KAKAO_CLIENT_ID/SECRET — developers.kakao.com" },
          { text: "NAVER_CLIENT_ID/SECRET — developers.naver.com" },
          { text: "ALIGO_USER_ID/API_KEY — aligo.in" },
          { text: "TOSS_PAYMENTS_* — developers.tosspayments.com" },
          { text: "AUTH_SECRET — openssl rand -base64 32" },
          { text: "SLACK_WEBHOOK_URL — slack api" },
          { text: "VAPID_PUBLIC/PRIVATE_KEY — web-push 라이브러리" },
        ],
      },
    ],
  },
  {
    id: "ch4",
    title: "4장. 장애 대응",
    subsections: [
      {
        id: "4-1",
        title: "4.1 자주 발생하는 문제",
        bullets: [
          { text: "화면이 흰색: Vercel 배포 실패 → 대시보드 확인" },
          { text: "로그인 안 됨: AUTH_SECRET 환경변수 확인" },
          { text: "이미지 안 보임: Cloudinary 설정 확인" },
          { text: "DB 에러: Neon 대시보드 연결 상태 확인" },
        ],
      },
      {
        id: "4-2",
        title: "4.2 DB 백업 복원",
        bullets: [{ text: "Neon 대시보드 → Branches → Restore" }],
      },
      {
        id: "4-3",
        title: "4.3 긴급 연락",
        bullets: [
          { text: "Vercel 상태: vercel.com/status" },
          { text: "Neon 상태: neon.tech/status" },
        ],
      },
    ],
  },
];

export function operatorManualTocEntries(): Array<{
  label: string;
  level: 1 | 2;
}> {
  const entries: Array<{ label: string; level: 1 | 2 }> = [];
  for (const chapter of operatorManualChapters) {
    entries.push({ label: chapter.title, level: 1 });
    for (const sub of chapter.subsections) {
      entries.push({ label: sub.title, level: 2 });
    }
  }
  return entries;
}
