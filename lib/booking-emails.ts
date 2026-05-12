/**
 * 매체 예약 신청(MediaBooking) 관련 트랜잭션 메일.
 *
 * 3종:
 *   1) sendBookingRequestReceived — 광고주에게 신청 접수 확인
 *   2) sendBookingRequestAdminAlert — 어드민에게 신규 신청 알림
 *   3) sendBookingRequestDecision — status 변경 시 광고주에게 결과 통보
 *
 * 메일 발송 실패는 throw 하지 않음 (예약 자체 트랜잭션은 보존).
 * `lib/email/client.ts` 의 sendEmail 이 이미 내부적으로 swallow + console.error.
 */

import { MediaBookingStatus } from "@prisma/client";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";

const HOST_NAME = "THINKAD";

function fmtDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function fmtMoneyWon(won: number | null | undefined): string {
  if (won == null || !Number.isFinite(won) || won <= 0) return "미입력";
  return `₩${won.toLocaleString("ko-KR")}`;
}

function publicSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    "https://tkad.co.kr"
  );
}

export type BookingRequestSummary = {
  id: string;
  mediaName: string;
  mediaId: string;
  startsAt: Date | string;
  endsAt: Date | string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string | null;
  budgetWon: number | null;
  notes: string | null;
};

/** 1) 광고주에게: 접수 확인 메일 */
export async function sendBookingRequestReceived(
  to: string,
  s: BookingRequestSummary,
): Promise<void> {
  if (!isEmailConfigured()) return;
  const site = publicSiteUrl();
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,'Apple SD Gothic Neo',sans-serif;color:#111;max-width:560px">
      <h2 style="font-size:18px;border-bottom:2px solid #FF6600;padding-bottom:8px;margin-bottom:16px">
        예약 신청이 접수되었습니다 · ${HOST_NAME}
      </h2>
      <p>안녕하세요 ${escapeHtml(s.requesterName)}님,</p>
      <p>아래 매체에 대한 예약 신청을 접수했습니다. 운영자 검토 후 영업일 기준 1–2일 내 결과를 회신 드립니다.</p>
      <table style="border-collapse:collapse;margin-top:12px;width:100%">
        <tbody>
          <tr><td style="padding:6px 0;color:#666;width:120px">매체</td><td style="padding:6px 0">${escapeHtml(s.mediaName)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">희망 기간</td><td style="padding:6px 0">${fmtDateTime(s.startsAt)} → ${fmtDateTime(s.endsAt)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">희망 예산</td><td style="padding:6px 0">${fmtMoneyWon(s.budgetWon)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">신청 ID</td><td style="padding:6px 0;font-family:monospace;font-size:12px">${s.id}</td></tr>
        </tbody>
      </table>
      ${s.notes ? `<p style="margin-top:12px;padding:10px;background:#f6f6f6;border-left:3px solid #FF6600">메모: ${escapeHtml(s.notes)}</p>` : ""}
      <p style="margin-top:20px;font-size:13px;color:#666">
        가입 회원이시면 <a href="${site}/my/booking-requests" style="color:#FF6600">마이페이지</a> 에서 진행 상황을 확인하실 수 있습니다.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
      <p style="font-size:11px;color:#999">
        본 메일은 발신 전용입니다. 문의는 ${process.env.CONTACT_ALERT_EMAIL ?? "info@tkad.co.kr"} 로 회신해주세요.
      </p>
    </div>
  `;
  await sendEmail({
    to,
    subject: `[${HOST_NAME}] 예약 신청 접수 확인 — ${s.mediaName}`,
    html,
  });
}

/** 2) 어드민에게: 신규 신청 알림 */
export async function sendBookingRequestAdminAlert(
  s: BookingRequestSummary,
): Promise<void> {
  if (!isEmailConfigured()) return;
  const adminEmail =
    process.env.ADMIN_DIGEST_EMAIL?.trim() ||
    process.env.CONTACT_ALERT_EMAIL?.trim();
  if (!adminEmail) return;
  const site = publicSiteUrl();
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,'Apple SD Gothic Neo',sans-serif;color:#111;max-width:560px">
      <h2 style="font-size:18px;border-bottom:2px solid #FF6600;padding-bottom:8px;margin-bottom:16px">
        🆕 신규 예약 신청 (검토 필요)
      </h2>
      <table style="border-collapse:collapse;margin-top:12px;width:100%">
        <tbody>
          <tr><td style="padding:6px 0;color:#666;width:120px">매체</td><td style="padding:6px 0">${escapeHtml(s.mediaName)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">희망 기간</td><td style="padding:6px 0">${fmtDateTime(s.startsAt)} → ${fmtDateTime(s.endsAt)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">희망 예산</td><td style="padding:6px 0">${fmtMoneyWon(s.budgetWon)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">신청자</td><td style="padding:6px 0">${escapeHtml(s.requesterName)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">이메일</td><td style="padding:6px 0">${escapeHtml(s.requesterEmail)}</td></tr>
          ${s.requesterPhone ? `<tr><td style="padding:6px 0;color:#666">연락처</td><td style="padding:6px 0">${escapeHtml(s.requesterPhone)}</td></tr>` : ""}
          <tr><td style="padding:6px 0;color:#666">신청 ID</td><td style="padding:6px 0;font-family:monospace;font-size:12px">${s.id}</td></tr>
        </tbody>
      </table>
      ${s.notes ? `<p style="margin-top:12px;padding:10px;background:#f6f6f6;border-left:3px solid #FF6600;white-space:pre-wrap">${escapeHtml(s.notes)}</p>` : ""}
      <p style="margin-top:20px">
        <a href="${site}/admin/media-hub" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;text-decoration:none;border-radius:0">어드민 미디어 허브에서 검토</a>
      </p>
    </div>
  `;
  await sendEmail({
    to: adminEmail,
    subject: `[${HOST_NAME} Admin] 신규 예약 신청 — ${s.mediaName}`,
    html,
  });
}

/** 3) 광고주에게: 어드민 결정 결과 통보 */
export async function sendBookingRequestDecision(
  to: string,
  s: BookingRequestSummary,
  newStatus: MediaBookingStatus,
  adminNote: string | null,
): Promise<void> {
  if (!isEmailConfigured()) return;

  const titleByStatus: Record<MediaBookingStatus, string> = {
    requested: "검토 중",
    tentative: "가홀드 확정",
    confirmed: "예약 확정",
    cancelled: "예약 취소 안내",
    expired: "예약 신청 만료",
  };
  const messageByStatus: Record<MediaBookingStatus, string> = {
    requested: "신청이 검토 중입니다.",
    tentative:
      "신청해주신 기간을 운영자가 임시 보류(가홀드) 처리했습니다. 영업 진행을 위해 곧 추가 안내가 갑니다.",
    confirmed:
      "신청해주신 기간이 확정되었습니다. 자세한 진행은 별도 안내 드리겠습니다.",
    cancelled:
      "신청해주신 기간은 안타깝게도 진행이 어려워 취소 처리되었습니다. 다른 일정이나 다른 매체를 추천드릴 수 있으니 회신 부탁드립니다.",
    expired:
      "신청해주신 건이 일정 기간 응답 없이 자동 만료되었습니다. 다시 신청을 원하시면 매체 페이지에서 새로 신청해주세요.",
  };

  const site = publicSiteUrl();
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,'Apple SD Gothic Neo',sans-serif;color:#111;max-width:560px">
      <h2 style="font-size:18px;border-bottom:2px solid #FF6600;padding-bottom:8px;margin-bottom:16px">
        예약 신청 결과 — ${titleByStatus[newStatus]}
      </h2>
      <p>안녕하세요 ${escapeHtml(s.requesterName)}님,</p>
      <p>${messageByStatus[newStatus]}</p>
      <table style="border-collapse:collapse;margin-top:12px;width:100%">
        <tbody>
          <tr><td style="padding:6px 0;color:#666;width:120px">매체</td><td style="padding:6px 0">${escapeHtml(s.mediaName)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">희망 기간</td><td style="padding:6px 0">${fmtDateTime(s.startsAt)} → ${fmtDateTime(s.endsAt)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">신청 ID</td><td style="padding:6px 0;font-family:monospace;font-size:12px">${s.id}</td></tr>
        </tbody>
      </table>
      ${
        adminNote
          ? `<p style="margin-top:12px;padding:10px;background:#f6f6f6;border-left:3px solid #FF6600;white-space:pre-wrap">운영자 메모: ${escapeHtml(adminNote)}</p>`
          : ""
      }
      <p style="margin-top:20px;font-size:13px;color:#666">
        진행 상황은 가입 회원이라면 <a href="${site}/my/booking-requests" style="color:#FF6600">마이페이지</a> 에서, 그 외에는 본 메일 회신으로 문의 주세요.
      </p>
    </div>
  `;
  await sendEmail({
    to,
    subject: `[${HOST_NAME}] ${titleByStatus[newStatus]} — ${s.mediaName}`,
    html,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
