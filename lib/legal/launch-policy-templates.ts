/** 법무 검토 전 임시 표준 템플릿 — 정식 오픈용 */

export type LegalSection = { title: string; paragraphs: string[] };

export function termsOfServiceSections(isKo: boolean): LegalSection[] {
  if (isKo) {
    return [
      {
        title: "제1조 (목적)",
        paragraphs: [
          "본 약관은 주식회사 싱커드(이하 \"회사\")가 제공하는 THINKAD 싱커드 OOH 광고 기획·매체 중개·데이터 서비스(이하 \"서비스\")의 이용조건 및 절차, 회사와 이용자의 권리·의무를 규정함을 목적으로 합니다.",
        ],
      },
      {
        title: "제2조 (정의)",
        paragraphs: [
          "\"이용자\"란 본 약관에 동의하고 서비스를 이용하는 광고주, 매체사, 대행사 등 회원 및 비회원을 말합니다.",
          "\"유료 서비스\"란 PRO 구독, 컨설팅, 견적·계약 중개 등 회사가 유료로 제공하는 서비스를 말합니다.",
        ],
      },
      {
        title: "제3조 (약관의 효력 및 변경)",
        paragraphs: [
          "회사는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 서비스 내 공지 또는 이메일로 안내합니다. 변경 약관은 공지 후 7일이 경과한 날부터 효력이 발생합니다.",
        ],
      },
      {
        title: "제4조 (회원가입 및 계정)",
        paragraphs: [
          "이용자는 정확한 정보를 제공하여야 하며, 계정·비밀번호 관리 책임은 이용자에게 있습니다.",
          "타인의 정보 도용, 허위 가입, 서비스 운영을 방해하는 행위는 금지됩니다.",
        ],
      },
      {
        title: "제5조 (서비스 제공)",
        paragraphs: [
          "회사는 매체 정보, 견적·기획 도구, 리포트, 커뮤니티 등 서비스를 제공합니다. 매체 가용·가격·집행 일정은 제3자(매체사) 사정에 따라 변동될 수 있으며, 최종 계약은 별도 합의에 따릅니다.",
        ],
      },
      {
        title: "제6조 (이용자의 의무)",
        paragraphs: [
          "이용자는 관계 법령, 본 약관, 개인정보처리방침을 준수해야 하며, 불법·음란·허위 광고 소재 업로드, 시스템 무단 접근, 타 이용자 권리 침해를 해서는 안 됩니다.",
        ],
      },
      {
        title: "제7조 (지적재산권)",
        paragraphs: [
          "서비스에 포함된 콘텐츠·소프트웨어·데이터베이스에 대한 권리는 회사 또는 정당한 권리자에게 귀속됩니다. 이용자가 업로드한 소재에 대한 권리는 이용자에게 있으나, 서비스 운영·견적·집행에 필요한 범위에서 회사가 사용할 수 있습니다.",
        ],
      },
      {
        title: "제8조 (유료 서비스·결제)",
        paragraphs: [
          "유료 서비스의 요금·청구 주기·혜택은 결제 화면 및 요금제 페이지에 표시된 내용을 따릅니다. 결제는 토스페이먼츠 등 회사가 지정한 PG를 통해 처리됩니다.",
        ],
      },
      {
        title: "제9조 (면책)",
        paragraphs: [
          "회사는 천재지변, 통신 장애, 제3자 매체·PG 사정으로 인한 서비스 중단·손해에 대해 고의 또는 중대한 과실이 없는 한 책임을 제한합니다. 데이터·추정치는 참고용이며 최종 의사결정은 이용자 책임입니다.",
        ],
      },
      {
        title: "제10조 (분쟁 해결)",
        paragraphs: [
          "본 약관은 대한민국 법률을 준거법으로 하며, 분쟁 발생 시 회사 본사 소재지 관할 법원을 전속 관할로 합니다.",
          "문의: privacy@thinkad.co.kr",
        ],
      },
      {
        title: "부칙 — 마케팅 정보 수신 동의",
        paragraphs: [
          "이용자는 선택적으로 이메일·SMS·카카오 채널을 통한 프로모션·뉴스레터 수신에 동의할 수 있으며, 동의 철회는 수신 거부 링크 또는 고객센터를 통해 가능합니다.",
        ],
      },
    ];
  }
  return [
    {
      title: "Article 1 (Purpose)",
      paragraphs: [
        "These Terms govern use of THINKAD OOH planning, media brokerage, and data services provided by THINKAD Co., Ltd.",
      ],
    },
    {
      title: "Article 2 (Paid services)",
      paragraphs: [
        "Fees and billing cycles for paid plans are shown at checkout. Payments are processed via designated payment gateways.",
      ],
    },
    {
      title: "Article 3 (Marketing communications)",
      paragraphs: [
        "You may opt in to promotional emails and newsletters and may withdraw consent at any time via unsubscribe or support.",
      ],
    },
  ];
}

export function refundPolicySections(isKo: boolean): LegalSection[] {
  if (isKo) {
    return [
      {
        title: "1. 적용 범위",
        paragraphs: [
          "본 환불 정책은 THINKAD 싱커드 웹/앱에서 결제하는 PRO 구독·유료 리포트·컨설팅 패키지 등 디지털 유료 서비스에 적용됩니다. 오프라인 매체 집행·제작비는 별도 계약·견적서 조건을 따릅니다.",
        ],
      },
      {
        title: "2. 청약철회 (전자상거래법)",
        paragraphs: [
          "디지털 콘텐츠·구독 서비스 이용 개시 후에는 청약철회가 제한될 수 있습니다. 서비스 제공이 시작되기 전 미사용 결제 건에 한해 결제일로부터 7일 이내 전액 환불을 요청할 수 있습니다.",
        ],
      },
      {
        title: "3. PRO 구독 환불",
        paragraphs: [
          "월간 구독: 결제 후 7일 이내·유료 기능 미사용 시 전액 환불. PDF 다운로드·API 호출 등 유료 기능 사용 후에는 잔여 기간 일할 환불이 아닌 이용 기간 종료 시 해지 처리됩니다.",
          "연간 구독: 결제 후 14일 이내·사용 이력 없을 때 전액 환불. 이후 해지 시 잔여 월 수에 대해 위약금 10% 공제 후 일할 환불(토스페이먼츠 가이드·PG 정책 범위 내).",
        ],
      },
      {
        title: "4. 환불 절차",
        paragraphs: [
          "환불 요청: privacy@thinkad.co.kr 또는 고객센터(02-1234-5678)로 결제일·이메일·사유를 기재해 접수합니다.",
          "승인 후 PG사 정책에 따라 영업일 기준 3~7일 내 결제 수단으로 환불됩니다.",
        ],
      },
      {
        title: "5. 환불 불가",
        paragraphs: [
          "이용자 귀책(약관 위반, 허위 정보), 이미 제공·다운로드된 맞춤 리포트·컨설팅 완료 건, 프로모션·무료 체험 전환분은 환불 대상에서 제외될 수 있습니다.",
        ],
      },
    ];
  }
  return [
    {
      title: "1. Scope",
      paragraphs: [
        "This policy applies to digital paid services (PRO subscription, reports) purchased on THINKAD. OOH media execution fees follow separate contracts.",
      ],
    },
    {
      title: "2. Refund window",
      paragraphs: [
        "Unused digital purchases may be refunded within 7 days before service use begins. After use begins, cancellation applies at period end without prorated refund unless required by law.",
      ],
    },
  ];
}

export function guaranteePolicySections(isKo: boolean): LegalSection[] {
  if (isKo) {
    return [
      {
        title: "1. 성과 데이터 보증 개요",
        paragraphs: [
          "THINKAD 싱커드는 OOH 광고 성과를 데이터로 설명합니다. 플래너 예측·집행 후 검증된 추정치·현장 인증 사진을 연계해 광고주가 결과를 확인할 수 있도록 합니다.",
          "「📊 성과 데이터 보증」 배지는 집행 5회 이상, 리뷰 3개 이상, 평균 평점 4.0 이상, 현장 인증 사진 1장 이상인 등록/검증 매체에 부여됩니다. GPS·촬영 시각은 권장이며 배지 장수 산정에 필수는 아닙니다.",
        ],
      },
      {
        title: "2. 예측 정확도 · 검증된 추정치",
        paragraphs: [
          "플래너 노출·도달 추정치는 매체 유동·단가·과거 집행 데이터를 반영한 내부 모델입니다.",
          "「검증된 추정치」는 유동인구·매체 노출 데이터 등 카탈로그·집행 기록을 바탕으로 산출하며, 현장 인증 사진이 있으면 소폭(+1.5~3%) 보정합니다. 센서·카운터로 집계한 절대 실측이 아닙니다.",
          "플랫폼 예측 정확도는 최근 완료 캠페인(인증 사진 포함)의 예측 대비 검증된 추정치 오차를 누적해 산출합니다. 완료 리포트에는 「예측 노출」과 「검증된 추정치」를 함께 표시합니다.",
        ],
      },
      {
        title: "3. 성과 미달 시 환불 조건",
        paragraphs: [
          "계약서·견적서에 「성과 보증」 조항이 명시된 캠페인에 한해 적용됩니다.",
          "집행 완료 후 플래너·계약서에 기재된 예측 노출 대비 「검증된 추정치」가 80% 미만인 경우, 미달분에 해당하는 광고비를 환불·크레딧으로 보상할 수 있습니다.",
          "환불 산정은 완료 리포트의 검증된 추정치를 기준으로 하며, 현장 인증 사진(가능하면 GPS·촬영 시각 포함)은 집행 사실 확인에 활용됩니다. 천재지변·매체사 귀책 외 광고주 사유(소재 지연·조기 종료 등)는 제외됩니다.",
          "환불 요청: 집행 종료 후 14일 이내, sales@tkad.co.kr 또는 고객센터(02-515-2772)로 캠페인 ID·완료 리포트·미달 근거를 제출해 주세요.",
        ],
      },
      {
        title: "4. 인증 사진 미제공 시 페널티",
        paragraphs: [
          "매체사·현장 담당자는 집행 기간 중 합의된 횟수 이상 현장 인증 사진을 업로드해야 합니다. GPS·촬영 시각 첨부를 권장합니다.",
          "인증 사진 미제공·허위 업로드가 확인되면 해당 매체의 「성과 데이터 보증」 배지가 즉시 해제되며, 반복 시 매체 노출·즉시 예약 등급이 하향 조정될 수 있습니다.",
          "광고주에게 인증 사진이 제공되지 않아 현장 확인이 어려운 경우, 회사는 대체 자료(유동 데이터·제3자 리포트)를 제공하거나, 미인증 기간에 대한 부분 환불을 검토합니다.",
        ],
      },
      {
        title: "5. 면책",
        paragraphs: [
          "예측치와 검증된 추정치는 참고용이며, 개별 캠페인의 성과 보증·환불은 별도 계약 조항 및 본 정책에 따릅니다. 법무 검토 전 임시 정책이며, 정식 오픈 시 개별 고지됩니다.",
        ],
      },
    ];
  }
  return [
    {
      title: "1. Performance data guarantee",
      paragraphs: [
        "THINKAD explains OOH outcomes with data — planner forecasts, post-flight verified estimates, and field proof photos.",
        "The 📊 Performance data guaranteed badge is awarded to registered/verified media with 5+ flights, 3+ reviews, 4.0+ average rating, and at least one field proof photo. GPS and capture time are recommended but not required for the badge count.",
      ],
    },
    {
      title: "2. Prediction accuracy & verified estimates",
      paragraphs: [
        "Planner reach/impression estimates use traffic, pricing, and historical flight data.",
        "“Verified estimates” are derived from catalog foot-traffic and flight records; proof photos apply a small uplift (+1.5–3%). They are not sensor-counted absolute measurements.",
        "Platform accuracy aggregates forecast vs. verified-estimate error on recent completed campaigns with proof photos. Completion reports show predicted impressions alongside verified estimates.",
      ],
    },
    {
      title: "3. Refund when performance falls short",
      paragraphs: [
        "Applies only to campaigns with an explicit performance guarantee in the contract or quote.",
        "If the verified estimate is below 80% of the contracted/planner prediction after flight, the shortfall may be refunded or credited.",
        "Refunds use the completion-report verified estimate; proof photos (preferably with GPS and timestamp) help confirm the flight.",
        "Claims must be filed within 14 days of campaign end with campaign ID and completion report.",
      ],
    },
    {
      title: "4. Penalties for missing proof photos",
      paragraphs: [
        "Media owners must upload agreed field proof photos during the flight; GPS and capture time are recommended.",
        "Missing or fraudulent proof may revoke the performance badge and lower listing priority.",
        "If proof is unavailable, THINKAD may provide alternative materials or partial refund for unverified periods.",
      ],
    },
    {
      title: "5. Disclaimer",
      paragraphs: [
        "Forecasts and verified estimates are indicative; binding guarantees follow individual contracts. This is a pre-legal-review template.",
      ],
    },
  ];
}
