# THINKAD 이메일 도메인 설정 가이드

작성일: 2026-04-25
대상: 운영팀(thinkad.kr 도메인 관리 담당)
관련 PR: PR-8 (견적 마법사 영업팀 알림)

---

## 1. 발송 도메인 결정

견적 마법사가 사용자/영업팀에게 보내는 모든 메일은 **`thinkad.kr`** 도메인의
지정 발신 주소로 보낸다. Resend(프로덕션)·SMTP(보조) 어디서든 동일.

| 용도 | 권장 발신 주소 |
|---|---|
| 견적 PDF 첨부(사용자) | `quote@thinkad.kr` |
| 영업팀 알림 | 위와 동일 (영업팀 인박스 SALES_TEAM_EMAILS 로 수신) |
| 시스템 알림(에러/cron) | `noreply@thinkad.kr` (선택) |

> 환경변수 `RESEND_FROM`(또는 `SMTP_FROM`)에 위 주소를 넣는다. 둘 다 설정 시 Resend 우선.

---

## 2. 도메인 인증 체크리스트

스팸 폴더 회피 및 신뢰도 확보를 위해 **세 가지 모두** 설정해야 한다. Resend 콘솔이
DNS 레코드 값을 자동 생성해주므로 그대로 복사해 thinkad.kr DNS에 추가.

### 2-1. SPF (Sender Policy Framework)

Resend 발송이라면 다음 TXT 레코드를 `thinkad.kr` 루트에 추가:

```
Type:  TXT
Name:  @
Value: v=spf1 include:_spf.resend.com ~all
TTL:   3600
```

이미 다른 SPF 레코드가 있으면 새로 만들지 말고 기존 레코드의 `include:` 목록에
`_spf.resend.com` 만 추가. SPF 는 도메인당 1개만 허용된다.

검증:
```bash
dig +short txt thinkad.kr | grep spf1
```

### 2-2. DKIM (DomainKeys Identified Mail)

Resend 콘솔 → Domains → Add Domain → thinkad.kr 등록 후 표시되는 CNAME 3개 추가:

```
Type:  CNAME
Name:  resend._domainkey
Value: resend._domainkey.{발급된 토큰}.dkim.resend.com
```

(보통 3개 셋트 — Resend UI 의 "Add records" 그대로 복사 권장.)

검증:
```bash
dig +short cname resend._domainkey.thinkad.kr
```

### 2-3. DMARC (Domain-based Message Authentication)

```
Type:  TXT
Name:  _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@thinkad.kr; pct=100
TTL:   3600
```

- `p=quarantine`: 인증 실패 시 수신자 스팸함으로 분류(공격적). 최초에는
  `p=none` 으로 시작해 1~2주 모니터링한 뒤 quarantine 으로 강화 권장.
- `rua=mailto:` : 인증 리포트 수신 주소(직접 처리하지 않으면 dmarc.report@... 같은
  제3자 모니터링 서비스 사용).

---

## 3. Vercel 환경 변수 (Production scope)

`.env.production.example` 의 다음 키를 **반드시 Production scope** 로 등록한다.
Preview/Development scope 는 선택.

```
# 이메일 발송 (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
RESEND_FROM="THINKAD <quote@thinkad.kr>"

# 영업팀 알림 — 콤마 구분 다수 가능
SALES_TEAM_EMAILS="ops@thinkad.kr,sales@thinkad.kr"

# Slack — 영업팀 전용 채널 webhook (없으면 SLACK_WEBHOOK_URL 폴백)
SLACK_WEBHOOK_URL_SALES=https://hooks.slack.com/services/.../...
```

`SALES_TEAM_EMAILS` / `SLACK_WEBHOOK_URL_SALES` 가 비어 있으면 영업팀 알림은
silent skip 된다 — 견적 자체는 정상 저장된다.

---

## 4. 발송 시 워밍업 권장

처음 도메인을 새로 인증한 직후 대량 발송을 시작하면 메일 평판이 낮아 스팸으로
분류될 위험이 있다. 출시 첫 1~2주는:

- 일일 발송량 50건 이하로 유지
- 견적 직후 사용자 메일 + 영업팀 메일이 정상 도달하는지 매일 모니터링
- Resend 대시보드에서 `Bounce rate < 5%`, `Complaint rate < 0.1%` 확인

---

## 5. 트러블슈팅

| 증상 | 원인 가능성 | 대응 |
|---|---|---|
| 사용자 메일이 스팸함에 떨어짐 | DKIM/SPF 미설정 또는 DMARC=p=reject | DNS 레코드 재확인 + 1-2주 평판 워밍 |
| Resend 대시보드 "deliverable" 인데 미수신 | 수신자 메일서버 그레이리스트 | 단순 재시도, 1시간 후 도달이면 정상 |
| `[email] Resend: invalid_from` 에러 | RESEND_FROM 의 도메인이 인증 안 됨 | 2-1~2-2 재확인 |
| Slack 알림이 안 옴 | webhook URL 만료 또는 재발급 필요 | Slack App 페이지에서 webhook 새로 발급 후 env 업데이트 |
| 영업팀 메일 일부만 받음 | SALES_TEAM_EMAILS 콤마 사이 공백/오타 | 환경변수 재확인 (`echo "$SALES_TEAM_EMAILS"`) |

---

## 6. 검증 명령어

```bash
# SPF
dig +short txt thinkad.kr

# DKIM (Resend)
dig +short cname resend._domainkey.thinkad.kr

# DMARC
dig +short txt _dmarc.thinkad.kr

# 종합 (Mxtoolbox 같은 외부 도구 권장)
# https://mxtoolbox.com/SuperTool.aspx?action=mx%3athinkad.kr
```

---

## 7. 책임 분담

- **운영팀**: DNS 레코드 추가, Resend 도메인 인증 완료, Production env 등록
- **개발자**: 코드 변경 없음(env 등록 후 자동으로 영업팀 알림 활성화)
- **QA**: 견적 마법사 제출 → 사용자 메일 + 영업팀 메일 + Slack 알림 모두 도달 확인

운영 등록이 완료되면 본 문서의 §1~§3 체크박스를 체크해 마감 알림 채널에 공유.
