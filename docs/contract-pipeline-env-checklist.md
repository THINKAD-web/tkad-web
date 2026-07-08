# OoH 계약 파이프라인 — env 체크리스트 (P0)

`/admin/quotes?tab=booking` · `OoHQuote` → `OohContract` 전자계약 흐름에 필요한 환경 변수입니다.

## 필수 (단계별)

| 단계 | API / 동작 | env | 미설정 시 |
|------|------------|-----|-----------|
| 견적 발송 | `POST .../send-quote` | **Email** — `RESEND_API_KEY` 또는 `SMTP_*` + `SMTP_FROM` | PDF 메일 미발송, `emailed: false` |
| 부킹 확정 | `PATCH .../booking-confirm` | Email (권장) | 계약 서명 URL 메일 미발송 |
| 고객 서명 | `POST /api/quote/[id]/contract/sign` | DB (`DATABASE_URL`) | 503 Unavailable |
| 서명 PDF 저장 | sign → Cloudinary | `CLOUDINARY_*` (선택) | DB `signedPdfBase64` 폴백 (동작함) |
| 청구 발송 | `POST .../send-invoice` | Email + **`QUOTE_BANK_NAME`**, **`QUOTE_BANK_ACCOUNT`**, **`QUOTE_BANK_HOLDER`** | 503 Email not configured / PDF에 계좌 placeholder |
| 계약 확정 | `PATCH .../contract-confirm` | Email (권장) | Campaign 생성은 됨, 안내 메일 실패(log) |

## Email 확인

코드: `isEmailConfigured()` in `lib/email/client.ts`

- Resend: `RESEND_API_KEY` **and** `RESEND_FROM` (발신 주소)
- 또는 SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## 청구서 계좌 (send-invoice)

```
QUOTE_BANK_NAME=
QUOTE_BANK_ACCOUNT=
QUOTE_BANK_HOLDER=
```

미설정 시 청구 PDF에 「(관리자 설정 QUOTE_BANK_*)」 placeholder.

## Cloudinary (서명 PDF, 선택)

```
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_CONTRACT_FOLDER=tkad/contracts  # optional
```

미설정 시 서명 PDF는 `OohContract.signedPdfBase64`에 저장.

## DB

Prisma `DATABASE_URL` — admin API는 `assertAdminDb`로 DB 없으면 503.

## E2E 수동 시나리오 (1건)

1. `draft` OoHQuote (문의 draft 또는 `/api/quote/create`)
2. Admin: **검토 완료 → 발송** → `sent`
3. 고객: **진행하기** → `booking_requested`
4. Admin: **부킹 확정** → `booking_confirmed`
5. 고객: `/quote/[id]/contract` **서명** → `OohContract.signed`
6. Admin: **청구서·계약 요약 발송** (서명 후 버튼 표시) → `invoice_sent`
7. Admin: **입금 확인** → `payment_confirmed`
8. Admin: **계약 확정** → `contract_confirmed` + `Campaign` 생성

## 관련 코드 (변경 없음)

- 계약 PDF: `lib/ooh-contract-pdf.ts`
- 서명: `app/api/quote/[id]/contract/sign/route.ts`
- Admin UI: `components/admin-ooh-quotes-client.tsx`
