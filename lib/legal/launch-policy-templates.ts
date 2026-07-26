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

